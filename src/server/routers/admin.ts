import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { TRPCError } from "@trpc/server";

export const adminRouter = router({
  // ── Usuarios ────────────────────────────────────────────────────────────────

  listUsers: adminProcedure
    .input(
      z.object({
        role: z.enum(["ADMIN", "DIRECTORA", "CONSULTORA"]).optional(),
        search: z.string().optional(),
        active: z.boolean().optional(),
        page: z.number().default(1),
        limit: z.number().default(25),
      })
    )
    .query(async ({ ctx, input }) => {
      const { role, search, active, page, limit } = input;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (role) where.role = role;
      if (active !== undefined) where.active = active;
      if (search)
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];

      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          include: {
            parent: { select: { id: true, name: true, role: true } },
            _count: { select: { children: true } },
          },
          orderBy: [{ role: "asc" }, { name: "asc" }],
          skip,
          take: limit,
        }),
        ctx.prisma.user.count({ where }),
      ]);

      return { users, total, pages: Math.ceil(total / limit) };
    }),

  createUser: adminProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(["ADMIN", "DIRECTORA", "CONSULTORA"]),
        parentId: z.string().optional(),
        phone: z.string().optional(),
        mkNumber: z.string().optional(),
        commission: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (existing)
        throw new TRPCError({
          code: "CONFLICT",
          message: "El correo ya está en uso",
        });

      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: true,
        });
      if (authError)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: authError.message,
        });

      return ctx.prisma.user.create({
        data: {
          supabaseId: authData.user.id,
          name: input.name,
          email: input.email,
          role: input.role,
          parentId: input.parentId ?? null,
          phone: input.phone,
          mkNumber: input.mkNumber,
          commission: input.commission,
          active: true,
        },
        select: { id: true, name: true, email: true, role: true },
      });
    }),

  updateUser: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).optional(),
        phone: z.string().optional(),
        mkNumber: z.string().optional(),
        commission: z.number().min(0).max(100).optional(),
        role: z.enum(["ADMIN", "DIRECTORA", "CONSULTORA"]).optional(),
        parentId: z.string().nullable().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.user.update({ where: { id }, data });
    }),

  resetPassword: adminProcedure
    .input(z.object({ id: z.string(), newPassword: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        select: { supabaseId: true },
      });
      if (!user?.supabaseId)
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuario sin cuenta de acceso" });

      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        user.supabaseId,
        { password: input.newPassword }
      );
      if (error)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      return { ok: true };
    }),

  deleteUser: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        select: { supabaseId: true, role: true },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      if (user.role === "ADMIN")
        throw new TRPCError({ code: "FORBIDDEN", message: "No puedes eliminar al administrador" });

      if (user.supabaseId) {
        await supabaseAdmin.auth.admin.deleteUser(user.supabaseId);
      }
      return ctx.prisma.user.delete({ where: { id: input.id } });
    }),

  // ── Solicitudes de creación ──────────────────────────────────────────────────

  listRequests: adminProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.userCreationRequest.findMany({
        where: input.status ? { status: input.status } : undefined,
        include: {
          requester: { select: { id: true, name: true, email: true, role: true } },
          parent: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  approveRequest: adminProcedure
    .input(
      z.object({
        requestId: z.string(),
        password: z.string().min(6),
        reviewNote: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.prisma.userCreationRequest.findUnique({
        where: { id: input.requestId },
      });
      if (!request || request.status !== "PENDING")
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitud no encontrada o ya procesada",
        });

      const existing = await ctx.prisma.user.findUnique({
        where: { email: request.email },
      });
      if (existing)
        throw new TRPCError({ code: "CONFLICT", message: "Ya existe un usuario con ese correo" });

      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: request.email,
          password: input.password,
          email_confirm: true,
        });
      if (authError)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: authError.message });

      const [newUser] = await ctx.prisma.$transaction([
        ctx.prisma.user.create({
          data: {
            supabaseId: authData.user.id,
            name: request.name,
            email: request.email,
            phone: request.phone,
            role: request.role,
            parentId: request.parentId,
            active: true,
          },
        }),
        ctx.prisma.userCreationRequest.update({
          where: { id: input.requestId },
          data: { status: "APPROVED", reviewNote: input.reviewNote },
        }),
      ]);

      return newUser;
    }),

  rejectRequest: adminProcedure
    .input(
      z.object({
        requestId: z.string(),
        reviewNote: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.userCreationRequest.update({
        where: { id: input.requestId },
        data: { status: "REJECTED", reviewNote: input.reviewNote },
      });
    }),

  // ── Stats para el panel ──────────────────────────────────────────────────────

  stats: adminProcedure.query(async ({ ctx }) => {
    const [totalUsers, byRole, pendingRequests] = await Promise.all([
      ctx.prisma.user.count(),
      ctx.prisma.user.groupBy({ by: ["role"], _count: true }),
      ctx.prisma.userCreationRequest.count({ where: { status: "PENDING" } }),
    ]);

    const roleCount = Object.fromEntries(byRole.map((r) => [r.role, r._count]));
    return { totalUsers, pendingRequests, roleCount };
  }),
});
