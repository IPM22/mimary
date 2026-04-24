import { router, protectedProcedure } from "../trpc";

export const authRouter = router({
  me: protectedProcedure.query(({ ctx }) => ({
    id: ctx.user.id,
    name: ctx.user.name,
    email: ctx.user.email,
    role: ctx.user.role,
    avatar: ctx.user.avatar,
    parentId: ctx.user.parentId,
  })),
});
