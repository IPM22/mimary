import { z } from "zod";
import { router, protectedProcedure, directoraProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const goalsRouter = router({
  list: protectedProcedure
    .input(z.object({ active: z.boolean().optional().default(true) }))
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      const now = new Date();

      const where =
        user.role === "DIRECTORA" || user.role === "ADMIN"
          ? {
              directoraId: user.id, // Goal.directoraId (who created the goal)
              ...(input.active && { endDate: { gte: now } }),
            }
          : {
              OR: [
                { targetUserId: user.id },
                { targetUserId: null, directoraId: user.parentId ?? "" },
              ],
              ...(input.active && { endDate: { gte: now } }),
            };

      return ctx.prisma.goal.findMany({
        where,
        orderBy: { startDate: "desc" },
        include: { targetUser: { select: { id: true, name: true } } },
      });
    }),

  create: directoraProcedure
    .input(
      z.object({
        targetUserId: z.string().optional(),
        productId: z.string().optional(),
        type: z.enum(["SALES_AMOUNT", "NEW_CLIENTS", "PRODUCT_UNITS", "GROUP_SALES"]),
        period: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY"]),
        targetValue: z.number().positive(),
        description: z.string().optional(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Parse date-only strings at noon UTC to avoid day-shift across timezones
      const startDate = new Date(input.startDate + "T12:00:00.000Z");
      const endDate = new Date(input.endDate + "T23:59:59.999Z");
      return ctx.prisma.goal.create({
        data: {
          ...input,
          directoraId: ctx.user.id,
          startDate,
          endDate,
        },
      });
    }),

  delete: directoraProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.goal.delete({ where: { id: input.id } });
    }),

  progress: protectedProcedure
    .input(z.object({ goalId: z.string() }))
    .query(async ({ ctx, input }) => {
      const goal = await ctx.prisma.goal.findUnique({
        where: { id: input.goalId },
        include: { targetUser: true },
      });
      if (!goal) throw new TRPCError({ code: "NOT_FOUND" });

      let current = 0;

      if (goal.type === "SALES_AMOUNT") {
        const consultantFilter = goal.targetUserId
          ? { consultantId: goal.targetUserId }
          : await ctx.prisma.user
              .findMany({ where: { parentId: goal.directoraId }, select: { id: true } })
              .then((cs) => ({ consultantId: { in: cs.map((c) => c.id) } }));
        const result = await ctx.prisma.sale.aggregate({
          where: { ...consultantFilter, status: { not: "CANCELLED" }, createdAt: { gte: goal.startDate, lte: goal.endDate } },
          _sum: { total: true },
        });
        current = Number(result._sum.total ?? 0);
      } else if (goal.type === "NEW_CLIENTS") {
        const consultantFilter = goal.targetUserId
          ? { userId: goal.targetUserId }
          : await ctx.prisma.user
              .findMany({ where: { parentId: goal.directoraId }, select: { id: true } })
              .then((cs) => ({ userId: { in: cs.map((c) => c.id) } }));
        current = await ctx.prisma.client.count({
          where: { ...consultantFilter, createdAt: { gte: goal.startDate, lte: goal.endDate } },
        });
      } else if (goal.type === "PRODUCT_UNITS" && goal.productId) {
        const consultantFilter = goal.targetUserId
          ? { sale: { consultantId: goal.targetUserId } }
          : await ctx.prisma.user
              .findMany({ where: { parentId: goal.directoraId }, select: { id: true } })
              .then((cs) => ({ sale: { consultantId: { in: cs.map((c) => c.id) } } }));
        const result = await ctx.prisma.saleItem.aggregate({
          where: { productId: goal.productId, ...consultantFilter, sale: { createdAt: { gte: goal.startDate, lte: goal.endDate } } },
          _sum: { quantity: true },
        });
        current = result._sum.quantity ?? 0;
      }

      const target = Number(goal.targetValue);
      const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
      return { goal, current, target, percentage };
    }),

  listWithProgress: protectedProcedure
    .input(z.object({ active: z.boolean().optional().default(true) }))
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      const now = new Date();

      const where =
        user.role === "DIRECTORA" || user.role === "ADMIN"
          ? { directoraId: user.id, ...(input.active && { endDate: { gte: now } }) }
          : {
              OR: [
                { targetUserId: user.id },
                { targetUserId: null, directoraId: user.parentId ?? "" },
              ],
              ...(input.active && { endDate: { gte: now } }),
            };

      const goals = await ctx.prisma.goal.findMany({
        where,
        orderBy: { startDate: "desc" },
        include: { targetUser: { select: { id: true, name: true } } },
      });

      if (goals.length === 0) return [];

      // Fetch team members once per directoraId
      const directoraIds = Array.from(new Set(goals.map((g) => g.directoraId)));
      const teamMap = new Map<string, string[]>();
      await Promise.all(
        directoraIds.map(async (dId) => {
          const members = await ctx.prisma.user.findMany({
            where: { parentId: dId },
            select: { id: true },
          });
          teamMap.set(dId, members.map((m) => m.id));
        })
      );

      // Compute all progress in parallel (one round-trip to the server for all goals)
      const results = await Promise.all(
        goals.map(async (goal) => {
          const teamIds = teamMap.get(goal.directoraId) ?? [];
          const consultantIds = goal.targetUserId ? [goal.targetUserId] : teamIds;
          let current = 0;

          if (goal.type === "SALES_AMOUNT" || goal.type === "GROUP_SALES") {
            const result = await ctx.prisma.sale.aggregate({
              where: {
                consultantId: { in: consultantIds },
                status: { not: "CANCELLED" },
                createdAt: { gte: goal.startDate, lte: goal.endDate },
              },
              _sum: { total: true },
            });
            current = Number(result._sum.total ?? 0);
          } else if (goal.type === "NEW_CLIENTS") {
            const userIds = goal.targetUserId ? [goal.targetUserId] : teamIds;
            current = await ctx.prisma.client.count({
              where: { userId: { in: userIds }, createdAt: { gte: goal.startDate, lte: goal.endDate } },
            });
          } else if (goal.type === "PRODUCT_UNITS" && goal.productId) {
            const result = await ctx.prisma.saleItem.aggregate({
              where: {
                productId: goal.productId,
                sale: { consultantId: { in: consultantIds }, createdAt: { gte: goal.startDate, lte: goal.endDate } },
              },
              _sum: { quantity: true },
            });
            current = result._sum.quantity ?? 0;
          }

          const target = Number(goal.targetValue);
          return { goal, current, target, percentage: target > 0 ? (current / target) * 100 : 0 };
        })
      );

      return results;
    }),
});
