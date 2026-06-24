import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { PublicRequestForm } from "./PublicRequestForm";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

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

  const [product, consultant, catalogInventory] = await Promise.all([
    prisma.product.findUnique({ where: { id: link.productId } }),
    prisma.user.findUnique({
      where: { id: link.consultantId },
      select: { id: true, name: true, avatar: true, phone: true },
    }),
    prisma.inventoryItem.findMany({
      where: { userId: link.consultantId, quantity: { gt: 0 }, productId: { not: link.productId } },
      include: { product: true },
      take: 20,
      orderBy: { product: { category: "asc" } },
    }),
  ]);

  if (!product || !consultant) notFound();

  const others = catalogInventory.map((item) => ({
    id: item.product.id,
    name: item.product.name,
    images: item.product.images,
    price: Number(item.product.salePrice) > 0 ? Number(item.product.salePrice) : 0,
    description: item.product.description,
    benefits: item.product.benefits,
    howToUse: item.product.howToUse,
    howItWorks: item.product.howItWorks,
    generalInfo: item.product.generalInfo,
    ingredients: item.product.ingredients,
  }));

  return (
    <PublicRequestForm
      consultant={consultant}
      mainProduct={{
        id: product.id,
        name: product.name,
        images: product.images,
        price: Number(product.salePrice) > 0 ? Number(product.salePrice) : 0,
        description: product.description,
        benefits: product.benefits,
        howToUse: product.howToUse,
        howItWorks: product.howItWorks,
        generalInfo: product.generalInfo,
        ingredients: product.ingredients,
      }}
      others={others}
      fontClass={fraunces.className}
    />
  );
}
