import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { PublicCatalog } from "./PublicCatalog";

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
  const link = await prisma.catalogLink.findUnique({ where: { slug: params.slug, active: true } });
  if (!link) return { title: "Tienda no encontrada" };
  const consultant = await prisma.user.findUnique({
    where: { id: link.consultantId },
    select: { name: true },
  });
  return {
    title: `Catálogo de ${consultant?.name} | MiMary`,
    description: `Descubre los productos Mary Kay con ${consultant?.name}. Cuidado de la piel, maquillaje y fragancias.`,
  };
}

export default async function PublicCatalogPage({ params }: Props) {
  const link = await prisma.catalogLink.findUnique({
    where: { slug: params.slug, active: true },
  });
  if (!link) notFound();

  const [consultant, products] = await Promise.all([
    prisma.user.findUnique({
      where: { id: link.consultantId },
      select: { id: true, name: true, avatar: true, phone: true },
    }),
    prisma.product.findMany({
      where: { active: true, discontinued: false, salePrice: { gt: 0 } },
      orderBy: { name: "asc" },
      take: 400,
      select: {
        id: true,
        name: true,
        images: true,
        salePrice: true,
        description: true,
        benefits: true,
        howToUse: true,
        howItWorks: true,
        generalInfo: true,
        ingredients: true,
      },
    }),
  ]);

  if (!consultant) notFound();

  const items = products.map((p) => ({
    id: p.id,
    name: p.name,
    images: p.images,
    price: Number(p.salePrice),
    description: p.description,
    benefits: p.benefits,
    howToUse: p.howToUse,
    howItWorks: p.howItWorks,
    generalInfo: p.generalInfo,
    ingredients: p.ingredients,
  }));

  return (
    <PublicCatalog
      consultant={consultant}
      products={items}
      fontClass={fraunces.className}
    />
  );
}
