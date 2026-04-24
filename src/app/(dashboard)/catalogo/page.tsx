"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils";
import { Search, X, Link2, DollarSign, ChevronLeft, ChevronRight, Check, Copy, Sparkles } from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  name: string;
  images: string[];
  category: string;
  subcategory: string | null;
  basePrice: number | string | { toNumber: () => number };
  discontinued: boolean;
  priceOverrides: { salePrice: number | string | { toNumber: () => number } }[];
  description?: string | null;
  benefits?: string | null;
  howItWorks?: string | null;
  howToUse?: string | null;
  generalInfo?: string | null;
  ingredients?: string | null;
  mkUrl?: string | null;
  sku?: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function toNum(v: number | string | { toNumber: () => number } | undefined): number {
  if (!v) return 0;
  if (typeof v === "object" && "toNumber" in v) return v.toNumber();
  return Number(v);
}

// Filtra URLs que son logos/SVGs/imágenes de navegación capturadas por error
function getProductImages(images: string[]): string[] {
  return images.filter((url) => {
    if (!url) return false;
    const low = url.toLowerCase();
    if (low.endsWith(".svg")) return false;
    if (low.includes("svg-icons")) return false;
    if (low.includes("/images/logo")) return false;
    if (low.includes("naviagtion") || low.includes("navigation%20images")) return false;
    if (low.includes("category%20images") || low.includes("category images")) return false;
    if (low.includes("mk-icons-arrow")) return false;
    return true;
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ── ProductImage — con fallback elegante ─────────────────────────────────────

function ProductImage({
  images,
  name,
  className = "",
}: {
  images: string[];
  name: string;
  className?: string;
}) {
  const filtered = getProductImages(images);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const src = filtered[idx];

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-100 ${className}`}>
        <span className="text-3xl font-bold text-mk-pink/30 select-none">{initials(name)}</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && <div className="absolute inset-0 bg-gray-100 animate-pulse" />}
      <img
        src={src}
        alt={name}
        loading="lazy"
        decoding="async"
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (idx < filtered.length - 1) setIdx((i) => i + 1);
          else setFailed(true);
        }}
      />
    </div>
  );
}

// ── ProductCard ───────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onClick,
  onSetPrice,
  onGenerateLink,
}: {
  product: Product;
  onClick: () => void;
  onSetPrice: (e: React.MouseEvent) => void;
  onGenerateLink: (e: React.MouseEvent) => void;
}) {
  const salePrice = toNum(product.priceOverrides[0]?.salePrice);

  return (
    <article
      onClick={onClick}
      className={`group relative bg-white rounded-2xl overflow-hidden cursor-pointer border border-gray-100
        transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-pink-100
        ${product.discontinued ? "opacity-50 grayscale" : ""}`}
    >
      {/* Imagen */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-pink-50 to-rose-50">
        <ProductImage
          images={product.images}
          name={product.name}
          className="w-full h-full transition-transform duration-500 group-hover:scale-105"
        />
        {product.discontinued && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-bold bg-gray-800 text-white px-2 py-0.5 rounded-full tracking-wide uppercase">
              Descontinuado
            </span>
          </div>
        )}
        {salePrice > 0 && (
          <div className="absolute top-2 right-2">
            <span className="text-[11px] font-bold bg-mk-pink text-white px-2 py-0.5 rounded-full">
              {formatCurrency(salePrice)}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-[10px] font-semibold text-mk-pink/70 uppercase tracking-widest mb-0.5 truncate">
          {product.subcategory ?? product.category}
        </p>
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-3 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Acciones */}
        <div className="flex gap-1.5">
          <button
            onClick={onSetPrice}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium
              border border-gray-200 rounded-lg hover:border-mk-pink hover:text-mk-pink
              transition-colors duration-150"
          >
            <DollarSign size={11} />
            Precio
          </button>
          <button
            onClick={onGenerateLink}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium
              bg-mk-pink text-white rounded-lg hover:bg-pink-700
              transition-colors duration-150"
          >
            <Link2 size={11} />
            Compartir
          </button>
        </div>
      </div>
    </article>
  );
}

// ── Formateador de texto ──────────────────────────────────────────────────────
// Convierte texto plano con bullets (•, *, -) y saltos de línea en JSX legible

function FormattedText({ text, className = "" }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n{2,}/).filter(Boolean);
  return (
    <div className={`space-y-3 ${className}`}>
      {paragraphs.map((para, pi) => {
        const lines = para.split("\n").filter(Boolean);
        const isList = lines.some((l) => /^[•\-\*]\s/.test(l.trim()));
        if (isList) {
          return (
            <ul key={pi} className="space-y-1.5 list-none">
              {lines.map((line, li) => {
                const clean = line.trim().replace(/^[•\-\*]\s*/, "");
                if (!clean) return null;
                const isBullet = /^[•\-\*]\s/.test(line.trim());
                return isBullet ? (
                  <li key={li} className="flex gap-2 text-sm leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-mk-pink/50 flex-shrink-0" />
                    <span>{clean}</span>
                  </li>
                ) : (
                  <p key={li} className="text-sm leading-relaxed text-gray-500 italic">{line.trim()}</p>
                );
              })}
            </ul>
          );
        }
        return (
          <p key={pi} className="text-sm leading-relaxed">
            {lines.join(" ")}
          </p>
        );
      })}
    </div>
  );
}

// ── Sección de contenido ──────────────────────────────────────────────────────

function Section({
  label,
  text,
  color = "gray",
  collapsible = false,
}: {
  label: string;
  text: string;
  color?: "pink" | "amber" | "blue" | "gray";
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  const colorMap = {
    pink:  { bg: "bg-pink-50",  border: "border-pink-100",  label: "text-mk-pink" },
    amber: { bg: "bg-amber-50", border: "border-amber-100", label: "text-amber-700" },
    blue:  { bg: "bg-blue-50",  border: "border-blue-100",  label: "text-blue-700" },
    gray:  { bg: "bg-gray-50",  border: "border-gray-100",  label: "text-gray-500" },
  };
  const c = colorMap[color];

  return (
    <div className={`rounded-2xl border ${c.bg} ${c.border} overflow-hidden`}>
      <button
        type="button"
        onClick={() => collapsible && setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 ${collapsible ? "cursor-pointer" : "cursor-default"}`}
      >
        <span className={`text-[11px] font-bold uppercase tracking-widest ${c.label}`}>{label}</span>
        {collapsible && (
          <ChevronRight size={13} className={`${c.label} transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
        )}
      </button>
      {open && (
        <div className={`px-4 pb-4 text-gray-700`}>
          <FormattedText text={text} />
        </div>
      )}
    </div>
  );
}

// ── ProductModal — ventana completa ──────────────────────────────────────────

function ProductModal({
  product,
  onClose,
  onSetPrice,
  onGenerateLink,
}: {
  product: Product | null;
  onClose: () => void;
  onSetPrice: () => void;
  onGenerateLink: () => void;
}) {
  const filtered = product ? getProductImages(product.images) : [];
  const [imgIdx, setImgIdx] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const salePrice = product ? toNum(product.priceOverrides[0]?.salePrice) : 0;
  const basePrice = product ? toNum(product.basePrice) : 0;

  // Reset al cambiar producto
  useState(() => { setImgIdx(0); setImgFailed(false); });

  if (!product) return null;

  const currentImg = filtered[Math.min(imgIdx, filtered.length - 1)];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
      <div
        className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold text-mk-pink uppercase tracking-widest">
              {product.subcategory ?? product.category}
            </p>
            <h2 className="text-lg font-bold text-gray-900 leading-tight mt-0.5">{product.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors flex-shrink-0 ml-4"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* ── Body: 2 columnas en desktop ── */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">

          {/* Columna izquierda — Imágenes */}
          <div className="md:w-[42%] flex-shrink-0 flex flex-col bg-gradient-to-br from-pink-50 to-rose-50 border-b md:border-b-0 md:border-r border-gray-100">
            {/* Imagen principal */}
            <div className="relative flex-1 min-h-[240px] max-h-[380px] md:max-h-none">
              {currentImg && !imgFailed ? (
                <img
                  key={currentImg}
                  src={currentImg}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-contain p-4"
                  onError={() => {
                    if (imgIdx < filtered.length - 1) setImgIdx((i) => i + 1);
                    else setImgFailed(true);
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-7xl font-bold text-mk-pink/20">{initials(product.name)}</span>
                </div>
              )}
              {/* Flechas */}
              {filtered.length > 1 && !imgFailed && (
                <>
                  <button
                    onClick={() => setImgIdx((i) => Math.max(0, i - 1))}
                    disabled={imgIdx === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur rounded-full
                      flex items-center justify-center shadow-sm disabled:opacity-20 hover:bg-white transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setImgIdx((i) => Math.min(filtered.length - 1, i + 1))}
                    disabled={imgIdx === filtered.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur rounded-full
                      flex items-center justify-center shadow-sm disabled:opacity-20 hover:bg-white transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {filtered.length > 1 && !imgFailed && (
              <div className="flex gap-2 p-3 overflow-x-auto border-t border-gray-100/80 bg-white/50 flex-shrink-0">
                {filtered.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={`w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all
                      ${i === imgIdx ? "border-mk-pink shadow-sm shadow-pink-200" : "border-transparent hover:border-gray-200"}`}
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Precio + SKU */}
            <div className="px-5 py-4 border-t border-gray-100 bg-white/70 flex-shrink-0 hidden md:block">
              {(salePrice > 0 || basePrice > 0) && (
                <p className="text-2xl font-bold text-mk-pink mb-0.5">
                  {formatCurrency(salePrice > 0 ? salePrice : basePrice)}
                </p>
              )}
              {product.sku && (
                <p className="text-xs text-gray-400">SKU: {product.sku}</p>
              )}
            </div>
          </div>

          {/* Columna derecha — Contenido */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-4">

              {/* Precio mobile */}
              <div className="md:hidden">
                {(salePrice > 0 || basePrice > 0) && (
                  <p className="text-xl font-bold text-mk-pink">
                    {formatCurrency(salePrice > 0 ? salePrice : basePrice)}
                  </p>
                )}
                {product.sku && <p className="text-xs text-gray-400 mt-0.5">SKU: {product.sku}</p>}
              </div>

              {product.description && (
                <div className="text-gray-600">
                  <FormattedText text={product.description} />
                </div>
              )}

              {product.generalInfo && (
                <Section label="Información general" text={product.generalInfo} color="gray" />
              )}

              {product.benefits && (
                <Section label="Ingredientes clave" text={product.benefits} color="pink" />
              )}

              {product.howItWorks && (
                <Section label="Cómo funciona" text={product.howItWorks} color="amber" />
              )}

              {product.howToUse && (
                <Section label="Cómo aplicar" text={product.howToUse} color="blue" />
              )}

              {product.ingredients && (
                <Section label="Lista completa de ingredientes" text={product.ingredients} color="gray" collapsible />
              )}
            </div>
          </div>
        </div>

        {/* ── Footer con acciones ── */}
        <div className="border-t border-gray-100 px-6 py-4 flex gap-3 flex-shrink-0 bg-white">
          <button
            onClick={onSetPrice}
            className="flex items-center justify-center gap-2 px-5 py-2.5 border-2 border-gray-200
              rounded-xl text-sm font-semibold hover:border-mk-pink hover:text-mk-pink transition-colors"
          >
            <DollarSign size={14} />
            {salePrice > 0 ? "Editar precio" : "Poner precio"}
          </button>
          <button
            onClick={onGenerateLink}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-mk-pink
              text-white rounded-xl text-sm font-semibold hover:bg-pink-700 transition-colors"
          >
            <Link2 size={14} />
            Generar link para compartir
          </button>
        </div>
      </div>

      {/* Click fuera para cerrar */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}

// ── Page principal ────────────────────────────────────────────────────────────

export default function CatalogoPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Product | null>(null);
  const [linkModal, setLinkModal] = useState<{ slug: string; url: string } | null>(null);
  const [priceModal, setPriceModal] = useState<{ id: string; current: number } | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: categories } = trpc.catalog.categories.useQuery();
  const { data, isLoading } = trpc.catalog.list.useQuery(
    { search, category, page, limit: 24 },
    { placeholderData: (prev: any) => prev }
  );

  const generateLink = trpc.catalog.generateLink.useMutation({
    onSuccess: (data) => setLinkModal(data),
  });

  const setPrice = trpc.catalog.setPrice.useMutation({
    onSuccess: () => { setPriceModal(null); setNewPrice(""); },
  });

  const handleCopyLink = () => {
    if (!linkModal) return;
    navigator.clipboard.writeText(`${window.location.origin}${linkModal.url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openPriceModal = useCallback((product: Product) => {
    const current = toNum(product.priceOverrides[0]?.salePrice);
    setPriceModal({ id: product.id, current });
    setNewPrice(current > 0 ? String(current) : "");
  }, []);

  const openLinkModal = useCallback((product: Product) => {
    generateLink.mutate({ productId: product.id });
  }, [generateLink]);

  return (
    <div className="min-h-full">
      {/* Modal de detalle */}
      {selected && (
        <ProductModal
          product={selected}
          onClose={() => setSelected(null)}
          onSetPrice={() => { if (selected) openPriceModal(selected); }}
          onGenerateLink={() => { if (selected) openLinkModal(selected); }}
        />
      )}

      <div className="p-4 md:p-8 space-y-5">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest mb-1">Mary Kay</p>
            <h1 className="text-2xl font-bold text-gray-900">Catálogo</h1>
          </div>
          {data && (
            <p className="text-sm text-gray-400 pb-1">{data.total} productos</p>
          )}
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar productos..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm
              placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-mk-pink/20 focus:border-mk-pink/40
              transition-all shadow-sm"
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X size={14} className="text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Chips de categoría */}
        {categories && categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            <button
              onClick={() => { setCategory(""); setPage(1); }}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150
                ${category === ""
                  ? "bg-mk-pink text-white shadow-sm shadow-pink-200"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-mk-pink hover:text-mk-pink"
                }`}
            >
              Todas
            </button>
            {categories.map((c) => (
              <button
                key={c.name}
                onClick={() => { setCategory(c.name); setPage(1); }}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150
                  ${category === c.name
                    ? "bg-mk-pink text-white shadow-sm shadow-pink-200"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-mk-pink hover:text-mk-pink"
                  }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-50 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-2 bg-gray-100 rounded-full animate-pulse w-1/2" />
                  <div className="h-3 bg-gray-100 rounded-full animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded-full animate-pulse w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : data?.products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
              <Search size={24} className="text-mk-pink/40" />
            </div>
            <p className="text-gray-500 text-sm">No se encontraron productos</p>
            <button
              onClick={() => { setSearch(""); setCategory(""); setPage(1); }}
              className="mt-3 text-xs text-mk-pink underline underline-offset-2"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {data?.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product as any}
                onClick={() => setSelected(product as any)}
                onSetPrice={(e) => { e.stopPropagation(); openPriceModal(product as any); }}
                onGenerateLink={(e) => { e.stopPropagation(); openLinkModal(product as any); }}
              />
            ))}
          </div>
        )}

        {/* Paginación */}
        {(data?.pages ?? 1) > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white
                disabled:opacity-30 hover:border-mk-pink hover:text-mk-pink transition-colors disabled:hover:border-gray-200 disabled:hover:text-gray-900"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-500 min-w-[80px] text-center">
              {page} / {data?.pages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === data?.pages}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white
                disabled:opacity-30 hover:border-mk-pink hover:text-mk-pink transition-colors disabled:hover:border-gray-200 disabled:hover:text-gray-900"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Modal: link generado */}
      {linkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-4 mx-auto">
              <Check size={22} className="text-green-500" />
            </div>
            <h2 className="font-bold text-gray-900 text-lg text-center mb-1">Link generado</h2>
            <p className="text-gray-500 text-sm text-center mb-4">Comparte este link con tu cliente</p>
            <div className="bg-gray-50 rounded-xl p-3 break-all text-xs text-gray-600 mb-4 border border-gray-100">
              {typeof window !== "undefined" ? window.location.origin : ""}{linkModal.url}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all
                  ${copied ? "bg-green-500 text-white" : "bg-mk-pink text-white hover:bg-pink-700"}`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "¡Copiado!" : "Copiar"}
              </button>
              <button
                onClick={() => setLinkModal(null)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: precio */}
      {priceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-bold text-gray-900 text-lg mb-1">Precio de venta</h2>
            <p className="text-gray-400 text-sm mb-5">Pesos dominicanos (DOP)</p>
            <div className="relative mb-5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">RD$</span>
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-base font-semibold
                  focus:outline-none focus:border-mk-pink transition-colors"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!priceModal || !newPrice) return;
                  setPrice.mutate({ productId: priceModal.id, salePrice: parseFloat(newPrice) });
                }}
                disabled={setPrice.isPending || !newPrice}
                className="flex-1 py-3 bg-mk-pink text-white rounded-xl text-sm font-semibold
                  disabled:opacity-40 hover:bg-pink-700 transition-colors"
              >
                {setPrice.isPending ? "Guardando..." : "Guardar precio"}
              </button>
              <button
                onClick={() => setPriceModal(null)}
                className="px-4 py-3 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
