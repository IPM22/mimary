import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
  me: protectedProcedure.query(({ ctx }) => ({
    id: ctx.user.id,
    name: ctx.user.name,
    email: ctx.user.email,
    role: ctx.user.role,
    avatar: ctx.user.avatar,
    parentId: ctx.user.parentId,
  })),

  requestAccess: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "El nombre es requerido"),
        email: z.string().email("Correo inválido"),
        phone: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({ where: { email: input.email } });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Este correo ya tiene acceso al sistema" });

      const pending = await ctx.prisma.userCreationRequest.findFirst({
        where: { email: input.email, status: "PENDING" },
      });
      if (pending) throw new TRPCError({ code: "CONFLICT", message: "Ya existe una solicitud pendiente con este correo" });

      return ctx.prisma.userCreationRequest.create({
        data: {
          requesterId: null,
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          notes: input.notes ?? null,
          role: "CONSULTORA",
        },
      });
    }),
});
