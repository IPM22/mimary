import { z } from "zod";
import { router, protectedProcedure, directoraProcedure } from "../trpc";
import { slugify } from "@/lib/utils";
import { TRPCError } from "@trpc/server";

export const catalogRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        subcategory: z.string().optional(),
        search: z.string().optional(),
        discontinued: z.boolean().optional().default(false),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(24),
      })
    )
    .query(async ({ ctx, input }) => {
      const { category, subcategory, search, discontinued, page, limit } = input;
      const skip = (page - 1) * limit;

      const where = {
        discontinued,
        active: true,
        ...(category && { category }),
        ...(subcategory && { subcategory }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [products, total] = await Promise.all([
        ctx.prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: "asc" },
        }),
        ctx.prisma.product.count({ where }),
      ]);

      const inventoryItems = await ctx.prisma.inventoryItem.findMany({
        where: { userId: ctx.user.id, productId: { in: products.map((p) => p.id) } },
        select: { productId: true, quantity: true },
      });
      const stockMap = Object.fromEntries(inventoryItems.map((i) => [i.productId, i.quantity]));
      const productsWithStock = products.map((p) => ({ ...p, stock: stockMap[p.id] ?? 0 }));

      return { products: productsWithStock, total, pages: Math.ceil(total / limit) };
    }),

  bySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.findUnique({
        where: { slug: input.slug },
      });
      if (!product) throw new TRPCError({ code: "NOT_FOUND" });
      return product;
    }),

  categories: protectedProcedure.query(async ({ ctx }) => {
    const cats = await ctx.prisma.product.groupBy({
      by: ["category", "subcategory"],
      where: { active: true, discontinued: false },
      orderBy: { category: "asc" },
    });
    const map: Record<string, Set<string>> = {};
    for (const c of cats) {
      if (!map[c.category]) map[c.category] = new Set();
      if (c.subcategory) map[c.category].add(c.subcategory);
    }
    return Object.entries(map).map(([cat, subs]) => ({
      name: cat,
      subcategories: Array.from(subs),
    }));
  }),

  // Admin/directora: establece precio de compra y precio de venta global del producto
  setPrices: directoraProcedure
    .input(
      z.object({
        productId: z.string(),
        purchasePrice: z.number().min(0),
        salePrice: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.product.update({
        where: { id: input.productId },
        data: {
          purchasePrice: input.purchasePrice,
          salePrice: input.salePrice,
        },
      });
    }),

  generateLink: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [user, product] = await Promise.all([
        ctx.prisma.user.findUnique({ where: { id: ctx.user.id } }),
        ctx.prisma.product.findUnique({ where: { id: input.productId } }),
      ]);
      if (!user || !product) throw new TRPCError({ code: "NOT_FOUND" });

      const consultantSlug = slugify(user.name);
      const slug = `${consultantSlug}-${product.slug}`;

      const existing = await ctx.prisma.publicLink.findUnique({
        where: { slug },
      });
      if (existing) return { slug, url: `/p/${slug}` };

      await ctx.prisma.publicLink.create({
        data: {
          consultantId: ctx.user.id,
          productId: input.productId,
          slug,
        },
      });
      return { slug, url: `/p/${slug}` };
    }),

  // Admin: crear producto manualmente
  create: directoraProcedure
    .input(
      z.object({
        name: z.string().min(2),
        category: z.string(),
        subcategory: z.string().optional(),
        description: z.string().optional(),
        purchasePrice: z.number().min(0).default(0),
        salePrice: z.number().min(0).default(0),
        images: z.array(z.string()).default([]),
        ingredients: z.string().optional(),
        benefits: z.string().optional(),
        mkUrl: z.string().optional(),
        sku: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.name);
      return ctx.prisma.product.create({
        data: { ...input, slug },
      });
    }),

  update: directoraProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).optional(),
        category: z.string().optional(),
        subcategory: z.string().optional(),
        description: z.string().optional(),
        purchasePrice: z.number().min(0).optional(),
        salePrice: z.number().min(0).optional(),
        images: z.array(z.string()).optional(),
        ingredients: z.string().optional(),
        benefits: z.string().optional(),
        active: z.boolean().optional(),
        discontinued: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.product.update({ where: { id }, data });
    }),
});
