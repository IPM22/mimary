import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const publicLinksRouter = router({
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const link = await ctx.prisma.publicLink.findUnique({
        where: { slug: input.slug, active: true },
      });

      if (!link) throw new TRPCError({ code: "NOT_FOUND" });

      const [product, consultant, price] = await Promise.all([
        ctx.prisma.product.findUnique({
          where: { id: link.productId },
        }),
        ctx.prisma.user.findUnique({
          where: { id: link.consultantId },
          select: { id: true, name: true, avatar: true, phone: true },
        }),
        ctx.prisma.consultantPrice.findUnique({
          where: {
            userId_productId: {
              userId: link.consultantId,
              productId: link.productId,
            },
          },
        }),
      ]);

      if (!product || !consultant) throw new TRPCError({ code: "NOT_FOUND" });

      return {
        product,
        consultant,
        salePrice: price ? Number(price.salePrice) : null,
        linkId: link.id,
      };
    }),

  submitRequest: publicProcedure
    .input(
      z.object({
        productId: z.string(),
        consultantId: z.string(),
        clientName: z.string().min(2),
        clientPhone: z.string().optional(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.productRequest.create({
        data: {
          productId: input.productId,
          consultantId: input.consultantId,
          clientName: input.clientName,
          clientPhone: input.clientPhone,
          message: input.message,
        },
      });
    }),
});
