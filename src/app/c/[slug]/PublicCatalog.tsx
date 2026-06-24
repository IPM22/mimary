"use client";

import { useState, useMemo, useRef } from "react";
import { Search, X, ArrowRight, Sparkles, ShoppingBag } from "lucide-react";
import {
  StoreHeader, StoreFooter, StorefrontStyles, ProductCard, ProductSheet, CartSheet,
  fmt, waDigits, WaIcon,
  type StoreConsultant, type StoreProduct, type CartItem,
} from "@/components/storefront/Storefront";

interface Props {
  consultant: StoreConsultant;
  products: StoreProduct[];
  fontClass: string;
}

export function PublicCatalog({ consultant, products, fontClass }: Props) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [detail, setDetail] = useState<StoreProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      `${p.name} ${p.description ?? ""}`.toLowerCase().includes(q)
    );
  }, [products, search]);

  function scrollToGrid() {
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function addToCart(p: StoreProduct, qty = 1) {
    setCart((prev) => {
      const exists = prev.find((c) => c.productId === p.id);
      if (exists) return prev.map((c) => (c.productId === p.id ? { ...c, quantity: c.quantity + qty } : c));
      return [...prev, { productId: p.id, name: p.name, image: p.images[0] ?? null, price: p.price, quantity: qty }];
    });
  }
  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev.map((c) => (c.productId === productId ? { ...c, quantity: c.quantity + delta } : c)).filter((c) => c.quantity > 0)
    );
  }
  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="min-h-screen bg-[#fdf6f1] text-[#2a1f25]">
      <StorefrontStyles />
      <StoreHeader consultant={consultant} cartCount={cartCount} onOpenCart={() => setCartOpen(true)} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-[#f7c9dd] blur-3xl opacity-60 sf-blob" />
        <div className="absolute top-20 -left-24 w-72 h-72 rounded-full bg-[#f3e2c0] blur-3xl opacity-70 sf-blob" style={{ animationDelay: "-6s" }} />
        <div className="absolute inset-0 sf-grain pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-5 pt-14 pb-12 md:pt-20 md:pb-16">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-mk-pink mb-5">
            <Sparkles size={13} /> Catálogo Mary Kay
          </p>
          <h1 className={`${fontClass} text-[2.6rem] leading-[1.02] md:text-7xl md:leading-[0.98] font-semibold tracking-tight max-w-3xl`}>
            Belleza que te
            <span className="block italic text-mk-pink">hace sentir bien.</span>
          </h1>
          <p className="mt-6 text-[15px] md:text-lg text-[#6b5a51] max-w-xl leading-relaxed">
            Explora todos los productos disponibles con <span className="font-semibold text-[#2a1f25]">{consultant.name}</span>.
            Arma tu pedido y te contacto para coordinar la entrega.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={scrollToGrid}
              className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-mk-pink text-white text-sm font-semibold shadow-lg shadow-pink-200 hover:bg-[#c4156d] transition-colors"
            >
              Ver productos
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            {consultant.phone && (
              <a
                href={`https://wa.me/${waDigits(consultant.phone)}?text=${encodeURIComponent(`Hola ${consultant.name}, vi tu catálogo en MiMary y quiero asesoría.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-white border border-[#e7d6c9] text-sm font-semibold text-[#2a1f25] hover:border-[#25D366] hover:text-[#1ebe5d] transition-colors"
              >
                <WaIcon /> Hablar con {consultant.name.split(" ")[0]}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── Buscador + grid ── */}
      <section ref={gridRef} className="max-w-6xl mx-auto px-5 pt-6 pb-28 scroll-mt-16">
        <div className="sticky top-14 z-30 -mx-5 px-5 py-3 bg-[#fdf6f1]/90 backdrop-blur-md">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b29f93]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto por nombre..."
              className="w-full pl-11 pr-10 py-3.5 rounded-full bg-white border border-[#e7d6c9] text-sm focus:outline-none focus:border-mk-pink focus:ring-4 focus:ring-mk-pink/10 transition-all shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b29f93] hover:text-[#5a4940]">
                <X size={15} />
              </button>
            )}
          </div>
          {search && (
            <p className="mt-2.5 text-xs text-[#9c8478]">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</p>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-full bg-white border border-[#e7d6c9] flex items-center justify-center mx-auto mb-4">
              <Search size={22} className="text-[#c9a84c]" />
            </div>
            <p className="text-[#6b5a51]">No encontramos productos con ese nombre.</p>
            <button onClick={() => setSearch("")} className="mt-3 text-sm text-mk-pink font-semibold hover:underline">
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                fontClass={fontClass}
                inCart={cart.find((c) => c.productId === p.id)?.quantity ?? 0}
                onOpen={() => setDetail(p)}
                onAdd={() => addToCart(p)}
                onUpdateQty={(delta) => updateQty(p.id, delta)}
              />
            ))}
          </div>
        )}
      </section>

      <StoreFooter consultant={consultant} fontClass={fontClass} />

      {/* Pill flotante de pedido */}
      {cartCount > 0 && !cartOpen && !detail && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 pl-5 pr-3 py-3 rounded-full bg-mk-pink text-white shadow-2xl shadow-pink-300 sf-rise"
        >
          <ShoppingBag size={17} />
          <span className="text-sm font-semibold">{cartCount} en tu pedido</span>
          <span className="bg-white/20 rounded-full px-3 py-1 text-sm font-bold">{fmt(cartTotal)}</span>
        </button>
      )}

      {detail && (
        <ProductSheet
          product={detail}
          fontClass={fontClass}
          inCart={cart.find((c) => c.productId === detail.id)?.quantity ?? 0}
          onAdd={(qty) => addToCart(detail, qty)}
          onClose={() => setDetail(null)}
        />
      )}

      {cartOpen && (
        <CartSheet
          consultant={consultant}
          cart={cart}
          fontClass={fontClass}
          total={cartTotal}
          source="catalog"
          onUpdateQty={updateQty}
          onRemove={removeFromCart}
          onClose={() => setCartOpen(false)}
          onBrowse={() => { setCartOpen(false); scrollToGrid(); }}
        />
      )}
    </div>
  );
}
