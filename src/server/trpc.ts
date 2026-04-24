import { initTRPC, TRPCError } from "@trpc/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import superjson from "superjson";
import { ZodError } from "zod";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "DIRECTORA" | "CONSULTORA";
  parentId: string | null;
  avatar: string | null;
  active: boolean;
};

export async function createTRPCContext() {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let user: CurrentUser | null = null;
  if (authUser?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        parentId: true,
        avatar: true,
        active: true,
      },
    });
    if (dbUser?.active) user = dbUser as CurrentUser;
  }

  return { user, prisma };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const isDirectoraOrAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user || (ctx.user.role !== "DIRECTORA" && ctx.user.role !== "ADMIN"))
    throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const isAdminOnly = t.middleware(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== "ADMIN")
    throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(isAuthed);
export const directoraProcedure = t.procedure.use(isDirectoraOrAdmin);
export const adminProcedure = t.procedure.use(isAdminOnly);
