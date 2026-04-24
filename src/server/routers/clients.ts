import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const clientSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  birthday: z.string().optional(),
  address: z.string().optional(),
  skinType: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).default([]),
  avatar: z.string().optional(),
});

export const clientsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        tag: z.string().optional(),
        consultantId: z.string().optional(),
        upcomingBirthdays: z.boolean().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { search, tag, consultantId, upcomingBirthdays, page, limit } = input;
      const user = ctx.user;
      const skip = (page - 1) * limit;

      let userIdFilter: string | { in: string[] };
      if (user.role === "ADMIN") {
        if (consultantId) {
          userIdFilter = consultantId;
        } else {
          const all = await ctx.prisma.user.findMany({ select: { id: true } });
          userIdFilter = { in: all.map((u) => u.id) };
        }
      } else if (user.role === "DIRECTORA") {
        if (consultantId) {
          userIdFilter = consultantId;
        } else {
          const children = await ctx.prisma.user.findMany({
            where: { parentId: user.id },
            select: { id: true },
          });
          userIdFilter = { in: [user.id, ...children.map((c) => c.id)] };
        }
      } else {
        userIdFilter = user.id;
      }

      const where = {
        userId: userIdFilter,
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ],
        }),
        ...(tag && { tags: { has: tag } }),
        ...(upcomingBirthdays && { birthday: { not: null } }),
      };

      const [clients, total] = await Promise.all([
        ctx.prisma.client.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: "asc" },
          include: { user: { select: { name: true } } },
        }),
        ctx.prisma.client.count({ where }),
      ]);

      return { clients, total, pages: Math.ceil(total / limit) };
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.findUnique({
        where: { id: input.id },
        include: {
          user: { select: { id: true, name: true } },
          sales: {
            orderBy: { createdAt: "desc" },
            include: { items: { include: { product: true } } },
          },
          followUps: { orderBy: { scheduledDate: "asc" } },
        },
      });
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role === "CONSULTORA" && client.userId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      return client;
    }),

  create: protectedProcedure
    .input(clientSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.client.create({
        data: {
          ...input,
          email: input.email || null,
          birthday: input.birthday ? new Date(input.birthday) : null,
          userId: ctx.user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(clientSchema.partial().extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, birthday, email, ...rest } = input;
      const client = await ctx.prisma.client.findUnique({ where: { id } });
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role === "CONSULTORA" && client.userId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      return ctx.prisma.client.update({
        where: { id },
        data: {
          ...rest,
          email: email || null,
          birthday: birthday ? new Date(birthday) : undefined,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.findUnique({
        where: { id: input.id },
      });
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role === "CONSULTORA" && client.userId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      return ctx.prisma.client.delete({ where: { id: input.id } });
    }),

  upcomingBirthdays: protectedProcedure
    .input(z.object({ days: z.number().default(7) }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const children = await ctx.prisma.user.findMany({
        where: { parentId: ctx.user.id },
        select: { id: true },
      });
      const userIds = [ctx.user.id, ...children.map((c) => c.id)];

      const clients = await ctx.prisma.client.findMany({
        where: { userId: { in: userIds }, birthday: { not: null } },
        select: { id: true, name: true, birthday: true, phone: true, userId: true },
      });

      return clients.filter((c) => {
        if (!c.birthday) return false;
        const bday = new Date(c.birthday);
        const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
        const nextYear = new Date(now.getFullYear() + 1, bday.getMonth(), bday.getDate());
        const diff =
          thisYear > now
            ? thisYear.getTime() - now.getTime()
            : nextYear.getTime() - now.getTime();
        return diff <= input.days * 86400000;
      });
    }),
});
