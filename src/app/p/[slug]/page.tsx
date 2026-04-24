import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicRequestForm } from "./PublicRequestForm";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const link = await prisma.publicLink.findUnique({
    where: { slug: params.slug, active: true },
  });
  if (!link) return { title: "Producto no encontrado" };

  const [product, consultant] = await Promise.all([
    prisma.product.findUnique({
      where: { id: link.productId },
      select: { name: true, description: true, images: true },
    }),
    prisma.user.findUnique({ where: { id: link.consultantId }, select: { name: true } }),
  ]);

  return {
    title: `${product?.name} — ${consultant?.name} | MiMary`,
    description: product?.description?.slice(0, 160),
    openGraph: { images: product?.images[0] ? [product.images[0]] : [] },
  };
}

export default async function PublicProductPage({ params }: Props) {
  const link = await prisma.publicLink.findUnique({
    where: { slug: params.slug, active: true },
  });
  if (!link) notFound();

  const [product, consultant, priceOverride, catalogInventory] = await Promise.all([
    prisma.product.findUnique({ where: { id: link.productId } }),
    prisma.user.findUnique({
      where: { id: link.consultantId },
      select: { id: true, name: true, avatar: true, phone: true },
    }),
    prisma.consultantPrice.findUnique({
      where: { userId_productId: { userId: link.consultantId, productId: link.productId } },
    }),
    prisma.inventoryItem.findMany({
      where: { userId: link.consultantId, quantity: { gt: 0 }, productId: { not: link.productId } },
      include: { product: true },
      take: 20,
      orderBy: { product: { category: "asc" } },
    }),
  ]);

  if (!product || !consultant) notFound();

  const catalogProductIds = catalogInventory.map((i) => i.productId);
  const catalogPrices =
    catalogProductIds.length > 0
      ? await prisma.consultantPrice.findMany({
          where: { userId: link.consultantId, productId: { in: catalogProductIds } },
        })
      : [];
  const priceMap = new Map(catalogPrices.map((p) => [p.productId, Number(p.salePrice)]));

  const catalogItems = catalogInventory.map((item) => ({
    product: {
      id: item.product.id,
      name: item.product.name,
      images: item.product.images,
      category: item.product.category,
      subcategory: item.product.subcategory,
      description: item.product.description,
      benefits: item.product.benefits,
      howToUse: item.product.howToUse,
      howItWorks: item.product.howItWorks,
      generalInfo: item.product.generalInfo,
      ingredients: item.product.ingredients,
    },
    price: priceMap.get(item.productId) ?? null,
  }));

  return (
    <PublicRequestForm
      consultant={consultant}
      mainProduct={{
        id: product.id,
        name: product.name,
        images: product.images,
        category: product.category,
        subcategory: product.subcategory,
        description: product.description,
        benefits: product.benefits,
        howToUse: product.howToUse,
        howItWorks: product.howItWorks,
        generalInfo: product.generalInfo,
        ingredients: product.ingredients,
      }}
      mainProductPrice={priceOverride ? Number(priceOverride.salePrice) : null}
      catalogItems={catalogItems}
    />
  );
}
