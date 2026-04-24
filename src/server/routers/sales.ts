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

      // Verificar y descontar inventario
      await ctx.prisma.$transaction(async (tx) => {
        for (const item of input.items) {
          const invItem = await tx.inventoryItem.findUnique({
            where: {
              userId_productId: {
                userId: ctx.user.id,
                productId: item.productId,
              },
            },
          });

          if (invItem) {
            if (invItem.quantity < item.quantity) {
              const product = await tx.product.findUnique({
                where: { id: item.productId },
                select: { name: true },
              });
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Stock insuficiente para: ${product?.name}`,
              });
            }
            const newQty = invItem.quantity - item.quantity;
            await tx.inventoryItem.update({
              where: { id: invItem.id },
              data: { quantity: newQty },
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
        }

        const sale = await tx.sale.create({
          data: {
            consultantId: ctx.user.id,
            clientId: input.clientId || null,
            clientName: input.clientName || null,
            total,
            paymentMethod: input.paymentMethod,
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

        // Crear seguimiento post-venta automático (7 días)
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

        return sale;
      });

      return { success: true, total };
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

      // Top productos
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

      // Por consultora (solo directora)
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
