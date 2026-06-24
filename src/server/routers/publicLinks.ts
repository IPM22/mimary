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

      const [product, consultant] = await Promise.all([
        ctx.prisma.product.findUnique({
          where: { id: link.productId },
        }),
        ctx.prisma.user.findUnique({
          where: { id: link.consultantId },
          select: { id: true, name: true, avatar: true, phone: true },
        }),
      ]);

      if (!product || !consultant) throw new TRPCError({ code: "NOT_FOUND" });

      return {
        product,
        consultant,
        salePrice: Number(product.salePrice) > 0 ? Number(product.salePrice) : null,
        linkId: link.id,
      };
    }),

  submitRequest: publicProcedure
    .input(
      z.object({
        consultantId: z.string(),
        clientName: z.string().min(2),
        clientPhone: z.string().optional(),
        message: z.string().optional(),
        source: z.enum(["product", "catalog"]).default("product"),
        items: z
          .array(z.object({ productId: z.string(), quantity: z.number().int().min(1).default(1) }))
          .min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Una sola solicitud con múltiples ítems, sin importar cuántos productos agregue la clienta.
      await ctx.prisma.productRequest.create({
        data: {
          consultantId: input.consultantId,
          clientName: input.clientName,
          clientPhone: input.clientPhone ?? null,
          message: input.message ?? null,
          source: input.source,
          quantity: input.items.reduce((s, i) => s + i.quantity, 0),
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
      });
      return { success: true };
    }),
});
