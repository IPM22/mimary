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

      const productSelect = { id: true, name: true, images: true, salePrice: true } as const;

      const [requests, total] = await Promise.all([
        ctx.prisma.productRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            product: { select: productSelect },
            items: { include: { product: { select: productSelect } } },
            consultant: { select: { id: true, name: true } },
          },
        }),
        ctx.prisma.productRequest.count({ where }),
      ]);

      // Normaliza: cada solicitud expone `items`. Las solicitudes antiguas (un solo producto
      // en la cabecera) se convierten en un ítem sintético para mantener la UI uniforme.
      const normalized = requests.map((r) => {
        const items =
          r.items.length > 0
            ? r.items.map((it) => ({
                id: it.id,
                productId: it.productId,
                quantity: it.quantity,
                product: it.product,
              }))
            : r.product
              ? [{ id: r.id, productId: r.product.id, quantity: r.quantity, product: r.product }]
              : [];

        const estTotal = items.reduce(
          (s, it) => s + (Number(it.product.salePrice) || 0) * it.quantity,
          0
        );
        const allPriced = items.length > 0 && items.every((it) => Number(it.product.salePrice) > 0);

        return {
          id: r.id,
          clientName: r.clientName,
          clientPhone: r.clientPhone,
          message: r.message,
          status: r.status,
          source: r.source,
          createdAt: r.createdAt,
          consultant: r.consultant,
          items,
          itemCount: items.reduce((s, it) => s + it.quantity, 0),
          estimatedTotal: allPriced ? estTotal : null,
        };
      });

      return { requests: normalized, total, pages: Math.ceil(total / limit) };
    }),

  pendingCount: protectedProcedure.query(async ({ ctx }) => {
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
    return ctx.prisma.productRequest.count({
      where: { consultantId: consultantFilter, status: "PENDING" },
    });
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
