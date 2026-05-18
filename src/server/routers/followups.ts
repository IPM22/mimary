import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// Purpose of the follow-up — what we want to accomplish.
const TYPE_ENUM = z.enum([
  "DELIVERY", "POST_SALE", "BIRTHDAY", "PAYMENT",
  "COLD_CONTACT", "PROSPECTING", "REACTIVATION", "FACIAL", "OTHER",
]);
// Includes legacy values so we can still filter old rows that pre-date the split.
const TYPE_FILTER_ENUM = z.enum([
  "DELIVERY", "POST_SALE", "BIRTHDAY", "PAYMENT",
  "COLD_CONTACT", "PROSPECTING", "REACTIVATION", "FACIAL", "OTHER",
  "CALL", "WHATSAPP", "VISIT",
]);
const MODE_ENUM = z.enum(["CALL", "WHATSAPP", "IN_PERSON", "EMAIL", "SMS", "OTHER"]);

export const followUpsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "DONE"]).optional(),
        segment: z.enum(["OVERDUE", "TODAY", "TOMORROW", "WEEK", "FUTURE", "ALL"]).optional(),
        types: z.array(TYPE_FILTER_ENUM).optional(),
        modes: z.array(MODE_ENUM).optional(),
        clientId: z.string().optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(200).default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      const { status, segment, types, modes, clientId, search, page, limit } = input;
      const skip = (page - 1) * limit;

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(startOfDay); endOfToday.setDate(endOfToday.getDate() + 1);
      const endOfTomorrow = new Date(endOfToday); endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
      const endOfWeek = new Date(startOfDay); endOfWeek.setDate(endOfWeek.getDate() + 7);

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

      let dateFilter: Record<string, Date> | undefined;
      if (segment === "OVERDUE") dateFilter = { lt: startOfDay };
      else if (segment === "TODAY") dateFilter = { gte: startOfDay, lt: endOfToday };
      else if (segment === "TOMORROW") dateFilter = { gte: endOfToday, lt: endOfTomorrow };
      else if (segment === "WEEK") dateFilter = { gte: endOfTomorrow, lt: endOfWeek };
      else if (segment === "FUTURE") dateFilter = { gte: endOfWeek };

      const where = {
        consultantId: consultantFilter,
        ...(status && { status }),
        ...(clientId && { clientId }),
        ...(types && types.length > 0 && { type: { in: types } }),
        ...(modes && modes.length > 0 && { contactMode: { in: modes } }),
        ...(dateFilter && { scheduledDate: dateFilter }),
        ...(segment === "OVERDUE" && { status: "PENDING" as const }),
        ...(search && {
          OR: [
            { note: { contains: search, mode: "insensitive" as const } },
            { client: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }),
      };

      const [followUps, total] = await Promise.all([
        ctx.prisma.followUp.findMany({
          where,
          skip,
          take: limit,
          orderBy: segment === "OVERDUE" ? { scheduledDate: "desc" } : { scheduledDate: "asc" },
          include: {
            client: { select: { id: true, name: true, phone: true } },
            consultant: { select: { id: true, name: true } },
          },
        }),
        ctx.prisma.followUp.count({ where }),
      ]);

      return { followUps, total, pages: Math.ceil(total / limit) };
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfDay); endOfToday.setDate(endOfToday.getDate() + 1);
    const endOfTomorrow = new Date(endOfToday); endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
    const endOfWeek = new Date(startOfDay); endOfWeek.setDate(endOfWeek.getDate() + 7);

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

    const baseWhere = { consultantId: consultantFilter, status: "PENDING" as const };

    const [overdue, today, tomorrow, week, future, allPending, done] = await Promise.all([
      ctx.prisma.followUp.count({ where: { ...baseWhere, scheduledDate: { lt: startOfDay } } }),
      ctx.prisma.followUp.count({ where: { ...baseWhere, scheduledDate: { gte: startOfDay, lt: endOfToday } } }),
      ctx.prisma.followUp.count({ where: { ...baseWhere, scheduledDate: { gte: endOfToday, lt: endOfTomorrow } } }),
      ctx.prisma.followUp.count({ where: { ...baseWhere, scheduledDate: { gte: endOfTomorrow, lt: endOfWeek } } }),
      ctx.prisma.followUp.count({ where: { ...baseWhere, scheduledDate: { gte: endOfWeek } } }),
      ctx.prisma.followUp.count({ where: baseWhere }),
      ctx.prisma.followUp.count({ where: { consultantId: consultantFilter, status: "DONE" } }),
    ]);

    return { overdue, today, tomorrow, week, future, allPending, done };
  }),

  reschedule: protectedProcedure
    .input(z.object({ id: z.string(), scheduledDate: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const followUp = await ctx.prisma.followUp.findUnique({ where: { id: input.id } });
      if (!followUp) throw new TRPCError({ code: "NOT_FOUND" });
      if (followUp.consultantId !== ctx.user.id && ctx.user.role !== "DIRECTORA") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.prisma.followUp.update({
        where: { id: input.id },
        data: { scheduledDate: new Date(input.scheduledDate), status: "PENDING" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        type: TYPE_ENUM,
        contactMode: MODE_ENUM.optional(),
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
          contactMode: input.contactMode ?? null,
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
        type: TYPE_ENUM.optional(),
        contactMode: MODE_ENUM.nullable().optional(),
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
