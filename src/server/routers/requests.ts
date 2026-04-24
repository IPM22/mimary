import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const requestsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "CONTACTED", "SOLD", "DISMISSED"]).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
            const { status, page, limit } = input;
      const skip = (page - 1) * limit;

      let consultantFilter: string | { in: string[] };
      if (ctx.user.role === "DIRECTORA") {
        const consultoras = await ctx.prisma.user.findMany({
          where: { parentId: ctx.user.id },
          select: { id: true },
        });
        consultantFilter = { in: [ctx.user.id, ...consultoras.map((c) => c.id)] };
      } else {
        consultantFilter = ctx.user.id;
      }

      const where = {
        consultantId: consultantFilter,
        ...(status && { status }),
      };

      const [requests, total] = await Promise.all([
        ctx.prisma.productRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            product: { select: { id: true, name: true, images: true } },
            consultant: { select: { id: true, name: true } },
          },
        }),
        ctx.prisma.productRequest.count({ where }),
      ]);

      return { requests, total, pages: Math.ceil(total / limit) };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["PENDING", "CONTACTED", "SOLD", "DISMISSED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.productRequest.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),
});
