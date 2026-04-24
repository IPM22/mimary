import { z } from "zod";
import { router, protectedProcedure, directoraProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

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
        include: { product: true },
        orderBy: { product: { name: "asc" } },
      });

      if (input.lowStock) {
        return items.filter((i) => i.quantity <= i.alertThreshold);
      }

      return items;
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
        quantity: z.number().int().min(0),
        alertThreshold: z.number().int().min(0).default(2),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.inventoryItem.findUnique({
        where: {
          userId_productId: {
            userId: ctx.user.id,
            productId: input.productId,
          },
        },
      });

      if (existing) {
        const updated = await ctx.prisma.inventoryItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + input.quantity },
        });
        await ctx.prisma.inventoryMovement.create({
          data: {
            inventoryItemId: existing.id,
            type: "IN",
            quantity: input.quantity,
            reason: "Entrada de mercancía",
          },
        });
        return updated;
      }

      const item = await ctx.prisma.inventoryItem.create({
        data: {
          userId: ctx.user.id,
          productId: input.productId,
          quantity: input.quantity,
          alertThreshold: input.alertThreshold,
        },
      });

      if (input.quantity > 0) {
        await ctx.prisma.inventoryMovement.create({
          data: {
            inventoryItemId: item.id,
            type: "IN",
            quantity: input.quantity,
            reason: "Stock inicial",
          },
        });
      }

      return item;
    }),

  adjust: protectedProcedure
    .input(
      z.object({
        inventoryItemId: z.string(),
        type: z.enum(["IN", "OUT", "ADJUST"]),
        quantity: z.number().int().min(1),
        reason: z.string().min(2),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.inventoryItem.findUnique({
        where: { id: input.inventoryItemId },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      if (item.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      let newQty = item.quantity;
      if (input.type === "IN") newQty += input.quantity;
      else if (input.type === "OUT") newQty -= input.quantity;
      else newQty = input.quantity; // ADJUST = set absolute value

      if (newQty < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Stock insuficiente" });

      const [updated] = await ctx.prisma.$transaction([
        ctx.prisma.inventoryItem.update({
          where: { id: item.id },
          data: { quantity: newQty },
        }),
        ctx.prisma.inventoryMovement.create({
          data: {
            inventoryItemId: item.id,
            type: input.type,
            quantity: input.quantity,
            reason: input.reason,
          },
        }),
      ]);

      return updated;
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
