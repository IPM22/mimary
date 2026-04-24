import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const followUpsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "DONE"]).optional(),
        today: z.boolean().optional(),
        clientId: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
            const { status, today, clientId, page, limit } = input;
      const skip = (page - 1) * limit;

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

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
        ...(clientId && { clientId }),
        ...(today && {
          scheduledDate: { gte: startOfDay, lt: endOfDay },
          status: "PENDING" as const,
        }),
      };

      const [followUps, total] = await Promise.all([
        ctx.prisma.followUp.findMany({
          where,
          skip,
          take: limit,
          orderBy: { scheduledDate: "asc" },
          include: {
            client: { select: { id: true, name: true, phone: true } },
            consultant: { select: { id: true, name: true } },
          },
        }),
        ctx.prisma.followUp.count({ where }),
      ]);

      return { followUps, total, pages: Math.ceil(total / limit) };
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        type: z.enum(["CALL", "WHATSAPP", "VISIT", "DELIVERY", "POST_SALE", "BIRTHDAY", "OTHER"]),
        scheduledDate: z.string(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.followUp.create({
        data: {
          consultantId: ctx.user.id,
          clientId: input.clientId || null,
          type: input.type,
          scheduledDate: new Date(input.scheduledDate),
          note: input.note,
        },
      });
    }),

  complete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        resultNote: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const followUp = await ctx.prisma.followUp.findUnique({
        where: { id: input.id },
      });
      if (!followUp) throw new TRPCError({ code: "NOT_FOUND" });
      if (
        followUp.consultantId !== ctx.user.id &&
        ctx.user.role !== "DIRECTORA"
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.prisma.followUp.update({
        where: { id: input.id },
        data: { status: "DONE", resultNote: input.resultNote },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        type: z.enum(["CALL", "WHATSAPP", "VISIT", "DELIVERY", "POST_SALE", "BIRTHDAY", "OTHER"]).optional(),
        scheduledDate: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, scheduledDate, ...rest } = input;
      return ctx.prisma.followUp.update({
        where: { id },
        data: {
          ...rest,
          ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.followUp.delete({ where: { id: input.id } });
    }),

  todayCount: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return ctx.prisma.followUp.count({
      where: {
        consultantId: ctx.user.id,
        status: "PENDING",
        scheduledDate: { gte: start, lt: end },
      },
    });
  }),
});
