import { z } from "zod";
import { router, protectedProcedure, directoraProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const batchSchema = z.object({
  quantity: z.number().int().min(1),
  expiresAt: z.string(), // YYYY-MM-DD
});

export const inventoryRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        consultantId: z.string().optional(),
        lowStock: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let userId: string;
      if (ctx.user.role === "DIRECTORA" && input.consultantId) {
        userId = input.consultantId;
      } else {
        userId = ctx.user.id;
      }

      const items = await ctx.prisma.inventoryItem.findMany({
        where: { userId },
        include: {
          product: true,
          batches: { orderBy: { expiresAt: "asc" } },
        },
        orderBy: { product: { name: "asc" } },
      });

      if (input.lowStock) {
        return items.filter((i) => i.quantity <= i.alertThreshold);
      }

      return items;
    }),

  expiringBatches: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).default(30) }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + input.days);

      return ctx.prisma.inventoryBatch.findMany({
        where: {
          inventoryItem: { userId: ctx.user.id },
          expiresAt: { gte: now, lte: cutoff },
          quantity: { gt: 0 },
        },
        include: {
          inventoryItem: { include: { product: true } },
        },
        orderBy: { expiresAt: "asc" },
      });
    }),

  consolidado: directoraProcedure.query(async ({ ctx }) => {
    const consultoras = await ctx.prisma.user.findMany({
      where: { parentId: ctx.user.id, active: true },
      select: { id: true, name: true },
    });

    const inventories = await Promise.all(
      consultoras.map(async (c) => {
        const items = await ctx.prisma.inventoryItem.findMany({
          where: { userId: c.id },
          include: { product: true },
        });
        return { consultant: c, items };
      })
    );

    return inventories;
  }),

  addProduct: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        batches: z.array(batchSchema).min(1),
        alertThreshold: z.number().int().min(0).default(2),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const totalQty = input.batches.reduce((sum, b) => sum + b.quantity, 0);

      return ctx.prisma.$transaction(async (tx) => {
        const existing = await tx.inventoryItem.findUnique({
          where: { userId_productId: { userId: ctx.user.id, productId: input.productId } },
        });

        if (existing) {
          await tx.inventoryItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + totalQty },
          });
          await tx.inventoryBatch.createMany({
            data: input.batches.map((b) => ({
              inventoryItemId: existing.id,
              quantity: b.quantity,
              expiresAt: new Date(b.expiresAt + "T12:00:00.000Z"),
            })),
          });
          await tx.inventoryMovement.create({
            data: {
              inventoryItemId: existing.id,
              type: "IN",
              quantity: totalQty,
              reason: "Entrada de mercancía",
            },
          });
          return existing;
        }

        const item = await tx.inventoryItem.create({
          data: {
            userId: ctx.user.id,
            productId: input.productId,
            quantity: totalQty,
            alertThreshold: input.alertThreshold,
          },
        });

        await tx.inventoryBatch.createMany({
          data: input.batches.map((b) => ({
            inventoryItemId: item.id,
            quantity: b.quantity,
            expiresAt: new Date(b.expiresAt + "T12:00:00.000Z"),
          })),
        });

        if (totalQty > 0) {
          await tx.inventoryMovement.create({
            data: {
              inventoryItemId: item.id,
              type: "IN",
              quantity: totalQty,
              reason: "Stock inicial",
            },
          });
        }

        return item;
      });
    }),

  adjust: protectedProcedure
    .input(
      z.object({
        inventoryItemId: z.string(),
        type: z.enum(["IN", "OUT", "ADJUST"]),
        quantity: z.number().int().min(1),
        reason: z.string().min(2),
        expiresAt: z.string().optional(), // only for IN
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.inventoryItem.findUnique({
        where: { id: input.inventoryItemId },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      if (item.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      let newQty = item.quantity;
      if (input.type === "IN") newQty += input.quantity;
      else if (input.type === "OUT") newQty -= input.quantity;
      else newQty = input.quantity;

      if (newQty < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Stock insuficiente" });

      return ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: newQty },
        });
        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: item.id,
            type: input.type,
            quantity: input.quantity,
            reason: input.reason,
          },
        });
        if (input.type === "IN" && input.expiresAt) {
          await tx.inventoryBatch.create({
            data: {
              inventoryItemId: item.id,
              quantity: input.quantity,
              expiresAt: new Date(input.expiresAt + "T12:00:00.000Z"),
            },
          });
        }
        return updated;
      });
    }),

  movements: protectedProcedure
    .input(z.object({ inventoryItemId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.inventoryMovement.findMany({
        where: { inventoryItemId: input.inventoryItemId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }),

  updateThreshold: protectedProcedure
    .input(
      z.object({
        inventoryItemId: z.string(),
        alertThreshold: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.inventoryItem.update({
        where: { id: input.inventoryItemId },
        data: { alertThreshold: input.alertThreshold },
      });
    }),
});
