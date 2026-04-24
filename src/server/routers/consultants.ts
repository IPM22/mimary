import { z } from "zod";
import { router, protectedProcedure, directoraProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const consultantsRouter = router({
  list: directoraProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: { parentId: ctx.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        mkNumber: true,
        commission: true,
        active: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
  }),

  metrics: directoraProcedure
    .input(z.object({ consultantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const [salesAgg, clientCount, pendingFollowUps, inventoryCount] =
        await Promise.all([
          ctx.prisma.sale.aggregate({
            where: {
              consultantId: input.consultantId,
              status: { not: "CANCELLED" },
              createdAt: { gte: startOfMonth, lte: endOfMonth },
            },
            _sum: { total: true },
            _count: true,
          }),
          ctx.prisma.client.count({ where: { userId: input.consultantId } }),
          ctx.prisma.followUp.count({
            where: {
              consultantId: input.consultantId,
              status: "PENDING",
              scheduledDate: { lte: now },
            },
          }),
          ctx.prisma.inventoryItem.count({
            where: { userId: input.consultantId },
          }),
        ]);

      return {
        salesThisMonth: Number(salesAgg._sum.total ?? 0),
        salesCount: salesAgg._count,
        clientCount,
        pendingFollowUps,
        inventoryItemCount: inventoryCount,
      };
    }),

  update: directoraProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).optional(),
        phone: z.string().optional(),
        mkNumber: z.string().optional(),
        commission: z.number().min(0).max(100).optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const target = await ctx.prisma.user.findUnique({
        where: { id },
        select: { parentId: true },
      });
      if (!target || target.parentId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      return ctx.prisma.user.update({
        where: { id },
        data,
        select: { id: true, name: true, email: true, active: true, updatedAt: true },
      });
    }),

  // Solicitar creación de consultora (va al admin para aprobar)
  submitRequest: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        phone: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.userCreationRequest.create({
        data: {
          requesterId: ctx.user.id,
          name: input.name,
          email: input.email,
          phone: input.phone,
          role: "CONSULTORA",
          parentId: ctx.user.id,
          notes: input.notes,
          status: "PENDING",
        },
      });
    }),

  myRequests: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.userCreationRequest.findMany({
      where: { requesterId: ctx.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  myProfile: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        mkNumber: true,
        avatar: true,
        commission: true,
        role: true,
        createdAt: true,
      },
    });
  }),

  updateMyProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).optional(),
        phone: z.string().optional(),
        avatar: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
        select: { id: true, name: true, email: true, avatar: true },
      });
    }),
});
