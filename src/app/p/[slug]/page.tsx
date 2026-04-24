import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import dynamic from "next/dynamic";
import type { Metadata } from "next";

const PublicRequestForm = dynamic(
  () => import("./PublicRequestForm").then((m) => ({ default: m.PublicRequestForm })),
  { ssr: false }
);

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const link = await prisma.publicLink.findUnique({
    where: { slug: params.slug, active: true },
  });
  if (!link) return { title: "Producto no encontrado" };

  const product = await prisma.product.findUnique({ where: { id: link.productId } });
  const consultant = await prisma.user.findUnique({ where: { id: link.consultantId }, select: { name: true } });

  return {
    title: `${product?.name} — ${consultant?.name}`,
    description: product?.description?.slice(0, 160),
    openGraph: {
      images: product?.images[0] ? [product.images[0]] : [],
    },
  };
}

export default async function PublicProductPage({ params }: Props) {
  const link = await prisma.publicLink.findUnique({
    where: { slug: params.slug, active: true },
  });

  if (!link) notFound();

  const [product, consultant, priceOverride] = await Promise.all([
    prisma.product.findUnique({ where: { id: link.productId } }),
    prisma.user.findUnique({
      where: { id: link.consultantId },
      select: { id: true, name: true, avatar: true, phone: true },
    }),
    prisma.consultantPrice.findUnique({
      where: {
        userId_productId: {
          userId: link.consultantId,
          productId: link.productId,
        },
      },
    }),
  ]);

  if (!product || !consultant) notFound();

  const displayPrice = priceOverride ? Number(priceOverride.salePrice) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50">
      {/* Header MK */}
      <div className="mk-gradient px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-white font-bold text-sm">MK</span>
        </div>
        <span className="text-white font-semibold text-sm">Mary Kay</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Imágenes */}
        {product.images.length > 0 ? (
          <div className="rounded-3xl overflow-hidden shadow-lg bg-white">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full object-contain max-h-80"
            />
            {product.images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {product.images.slice(1, 5).map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-3xl bg-white shadow-lg h-64 flex items-center justify-center text-gray-200 text-7xl">
            📦
          </div>
        )}

        {/* Info del producto */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-mk-pink uppercase tracking-wide">
              {product.category}{product.subcategory ? ` · ${product.subcategory}` : ""}
            </p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{product.name}</h1>
          </div>

          {displayPrice && (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-mk-pink">{formatCurrency(displayPrice)}</span>
            </div>
          )}

          {product.description && (
            <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
          )}

          {product.benefits && (
            <div className="bg-mk-pink-light rounded-2xl p-4">
              <p className="text-sm font-semibold text-mk-pink mb-2">Ingredientes clave</p>
              <p className="text-sm text-gray-700 leading-relaxed">{product.benefits}</p>
            </div>
          )}

          {(product as any).howItWorks && (
            <div className="bg-amber-50 rounded-2xl p-4">
              <p className="text-sm font-semibold text-mk-gold mb-2">Cómo funciona</p>
              <p className="text-sm text-gray-700 leading-relaxed">{(product as any).howItWorks}</p>
            </div>
          )}

          {(product as any).howToUse && (
            <div className="bg-mk-gold-light rounded-2xl p-4">
              <p className="text-sm font-semibold text-mk-gold mb-2">Cómo aplicar</p>
              <p className="text-sm text-gray-700 leading-relaxed">{(product as any).howToUse}</p>
            </div>
          )}

          {(product as any).generalInfo && (
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Información general</p>
              <p className="text-sm text-gray-600 leading-relaxed">{(product as any).generalInfo}</p>
            </div>
          )}

          {product.ingredients && (
            <details className="bg-gray-50 rounded-2xl p-4">
              <summary className="text-sm font-semibold text-gray-700 cursor-pointer">Lista completa de ingredientes</summary>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{product.ingredients}</p>
            </details>
          )}
        </div>

        {/* Presentación de la consultora */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full mk-gradient flex items-center justify-center flex-shrink-0">
            {consultant.avatar ? (
              <img src={consultant.avatar} alt={consultant.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-white font-bold text-xl">{consultant.name[0]}</span>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Tu consultora Mary Kay</p>
            <p className="font-bold text-gray-900">{consultant.name}</p>
          </div>
        </div>

        {/* Formulario de solicitud */}
        <PublicRequestForm
          productId={product.id}
          consultantId={consultant.id}
        />
      </div>
    </div>
  );
}
