import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().positive(),
  discount: z.number().min(0).default(0),
});

export const salesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        consultantId: z.string().optional(),
        clientId: z.string().optional(),
        status: z.enum(["PENDING", "PAID", "DELIVERED", "CANCELLED"]).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { consultantId, clientId, status, from, to, page, limit } = input;
      const skip = (page - 1) * limit;

      let consultantFilter: string | { in: string[] };
      if (ctx.user.role === "DIRECTORA") {
        if (consultantId) {
          consultantFilter = consultantId;
        } else {
          const consultoras = await ctx.prisma.user.findMany({
            where: { parentId: ctx.user.id },
            select: { id: true },
          });
          consultantFilter = { in: [ctx.user.id, ...consultoras.map((c) => c.id)] };
        }
      } else {
        consultantFilter = ctx.user.id;
      }

      const where = {
        consultantId: consultantFilter,
        ...(clientId && { clientId }),
        ...(status && { status }),
        ...(from || to
          ? (() => {
              const toEnd = to ? new Date(new Date(to + "T00:00:00.000Z").getTime() + 86400000) : undefined;
              return {
                createdAt: {
                  ...(from && { gte: new Date(from + "T00:00:00.000Z") }),
                  ...(toEnd && { lt: toEnd }),
                },
              };
            })()
          : {}),
      };

      const [sales, total] = await Promise.all([
        ctx.prisma.sale.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            consultant: { select: { id: true, name: true } },
            client: { select: { id: true, name: true } },
            items: {
              include: { product: { select: { id: true, name: true, images: true } } },
            },
            installments: {
              select: { id: true, number: true, amount: true, dueDate: true, status: true },
            },
          },
        }),
        ctx.prisma.sale.count({ where }),
      ]);

      return { sales, total, pages: Math.ceil(total / limit) };
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sale = await ctx.prisma.sale.findUnique({
        where: { id: input.id },
        include: {
          consultant: { select: { id: true, name: true, avatar: true } },
          client: true,
          items: { include: { product: true } },
          installments: { orderBy: { number: "asc" } },
          payments: { orderBy: { createdAt: "asc" } },
        },
      });
      if (!sale) throw new TRPCError({ code: "NOT_FOUND" });
      return sale;
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        clientName: z.string().optional(),
        paymentMethod: z.enum(["CASH", "TRANSFER", "CARD", "CREDIT"]).default("CASH"),
        paymentMode: z.enum(["PAID", "PENDING", "INSTALLMENTS"]).default("PAID"),
        installmentsConfig: z
          .object({
            count: z.number().int().min(2).max(24),
            firstDueDate: z.string(),
            frequency: z.enum(["MONTHLY", "BIWEEKLY"]).default("MONTHLY"),
          })
          .optional(),
        notes: z.string().optional(),
        items: z.array(saleItemSchema).min(1),
        requestId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const total = input.items.reduce((sum, item) => {
        const subtotal = item.quantity * item.unitPrice - item.discount;
        return sum + subtotal;
      }, 0);

      await ctx.prisma.$transaction(async (tx) => {
        for (const item of input.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { name: true },
          });

          const invItem = await tx.inventoryItem.findUnique({
            where: {
              userId_productId: {
                userId: ctx.user.id,
                productId: item.productId,
              },
            },
          });

          if (!invItem || invItem.quantity < item.quantity) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: !invItem
                ? `"${product?.name}" no está en tu inventario`
                : `Stock insuficiente para "${product?.name}". Disponible: ${invItem.quantity}`,
            });
          }

          await tx.inventoryItem.update({
            where: { id: invItem.id },
            data: { quantity: invItem.quantity - item.quantity },
          });
          await tx.inventoryMovement.create({
            data: {
              inventoryItemId: invItem.id,
              type: "OUT",
              quantity: item.quantity,
              reason: "Venta",
            },
          });
        }

        const saleStatus = input.paymentMode === "PAID" ? "PAID" : "PENDING";
        const paidAmount = input.paymentMode === "PAID" ? total : 0;

        const sale = await tx.sale.create({
          data: {
            consultantId: ctx.user.id,
            clientId: input.clientId || null,
            clientName: input.clientName || null,
            total,
            paidAmount,
            paymentMethod: input.paymentMethod,
            status: saleStatus,
            notes: input.notes,
            sourceType: input.requestId ? "LINK_REQUEST" : "MANUAL",
            requestId: input.requestId || null,
            items: {
              create: input.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                subtotal: item.quantity * item.unitPrice - item.discount,
              })),
            },
          },
          include: { items: true },
        });

        if (input.paymentMode === "INSTALLMENTS" && input.installmentsConfig) {
          const { count, firstDueDate, frequency } = input.installmentsConfig;
          const installmentAmount = total / count;

          for (let i = 0; i < count; i++) {
            const base = new Date(firstDueDate + "T12:00:00.000Z");
            const dueDate = new Date(base);
            if (frequency === "BIWEEKLY") {
              dueDate.setDate(dueDate.getDate() + i * 15);
            } else {
              dueDate.setMonth(dueDate.getMonth() + i);
            }

            const installment = await tx.saleInstallment.create({
              data: {
                saleId: sale.id,
                number: i + 1,
                amount: installmentAmount,
                dueDate,
              },
            });

            await tx.followUp.create({
              data: {
                consultantId: ctx.user.id,
                clientId: input.clientId || null,
                type: "PAYMENT",
                scheduledDate: dueDate,
                note: `Cuota ${i + 1}/${count} — RD$${installmentAmount.toFixed(2)}`,
                saleInstallmentId: installment.id,
              },
            });
          }
        } else {
          const followUpDate = new Date();
          followUpDate.setDate(followUpDate.getDate() + 7);

          await tx.followUp.create({
            data: {
              consultantId: ctx.user.id,
              clientId: input.clientId || null,
              type: "POST_SALE",
              scheduledDate: followUpDate,
              note: `Seguimiento post-venta. Total: RD$${total.toFixed(2)}`,
            },
          });
        }

        return sale;
      });

      return { success: true, total };
    }),

  addPayment: protectedProcedure
    .input(
      z.object({
        saleId: z.string(),
        amount: z.number().positive(),
        paymentMethod: z.enum(["CASH", "TRANSFER", "CARD", "CREDIT"]).default("CASH"),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(async (tx) => {
        const sale = await tx.sale.findUnique({
          where: { id: input.saleId },
          include: {
            installments: { orderBy: { number: "asc" } },
          },
        });
        if (!sale) throw new TRPCError({ code: "NOT_FOUND" });
        if (sale.consultantId !== ctx.user.id && ctx.user.role !== "DIRECTORA" && ctx.user.role !== "ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await tx.salePayment.create({
          data: {
            saleId: input.saleId,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            note: input.note,
          },
        });

        const newPaidAmount = Number(sale.paidAmount) + input.amount;
        const saleTotal = Number(sale.total);

        // Determine which installments are now covered based on cumulative paidAmount
        const paidInstallmentIds: string[] = [];
        let cumulative = 0;

        for (const inst of sale.installments) {
          if (inst.status === "PAID") {
            cumulative += Number(inst.amount);
            continue;
          }
          cumulative += Number(inst.amount);
          // Mark as paid if cumulative is covered (with 0.02 tolerance for rounding) or sale is fully paid
          if (cumulative <= newPaidAmount + 0.02 || newPaidAmount >= saleTotal - 0.02) {
            paidInstallmentIds.push(inst.id);
          } else {
            break;
          }
        }

        if (paidInstallmentIds.length > 0) {
          await tx.saleInstallment.updateMany({
            where: { id: { in: paidInstallmentIds } },
            data: { status: "PAID" },
          });
          await tx.followUp.updateMany({
            where: { saleInstallmentId: { in: paidInstallmentIds } },
            data: { status: "DONE" },
          });
        }

        const newStatus = newPaidAmount >= Number(sale.total) ? "PAID" : "PENDING";

        await tx.sale.update({
          where: { id: input.saleId },
          data: { paidAmount: newPaidAmount, status: newStatus },
        });

        return { success: true, newPaidAmount, status: newStatus };
      });
    }),

  listPayments: protectedProcedure
    .input(z.object({ saleId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.salePayment.findMany({
        where: { saleId: input.saleId },
        orderBy: { createdAt: "asc" },
      });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["PENDING", "PAID", "DELIVERED", "CANCELLED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.sale.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  summary: protectedProcedure
    .input(
      z.object({
        consultantId: z.string().optional(),
        from: z.string(),
        to: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      let consultantFilter: string | { in: string[] };
      if (ctx.user.role === "DIRECTORA" && input.consultantId) {
        consultantFilter = input.consultantId;
      } else if (ctx.user.role === "DIRECTORA") {
        const consultoras = await ctx.prisma.user.findMany({
          where: { parentId: ctx.user.id },
          select: { id: true },
        });
        consultantFilter = { in: [ctx.user.id, ...consultoras.map((c) => c.id)] };
      } else {
        consultantFilter = ctx.user.id;
      }

      const sales = await ctx.prisma.sale.findMany({
        where: {
          consultantId: consultantFilter,
          status: { not: "CANCELLED" },
          createdAt: { gte: new Date(input.from), lte: new Date(input.to) },
        },
        include: {
          consultant: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true } } } },
        },
      });

      const totalAmount = sales.reduce((s, sale) => s + Number(sale.total), 0);
      const totalCount = sales.length;

      const productMap: Record<string, { name: string; qty: number; amount: number }> = {};
      for (const sale of sales) {
        for (const item of sale.items) {
          const key = item.productId;
          if (!productMap[key]) {
            productMap[key] = { name: item.product.name, qty: 0, amount: 0 };
          }
          productMap[key].qty += item.quantity;
          productMap[key].amount += Number(item.subtotal);
        }
      }
      const topProducts = Object.entries(productMap)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10);

      const byConsultant: Record<string, { name: string; total: number; count: number }> = {};
      for (const sale of sales) {
        const key = sale.consultantId;
        if (!byConsultant[key]) {
          byConsultant[key] = { name: sale.consultant.name, total: 0, count: 0 };
        }
        byConsultant[key].total += Number(sale.total);
        byConsultant[key].count += 1;
      }

      return {
        totalAmount,
        totalCount,
        topProducts,
        byConsultant: Object.entries(byConsultant).map(([id, v]) => ({ id, ...v })),
      };
    }),
});
