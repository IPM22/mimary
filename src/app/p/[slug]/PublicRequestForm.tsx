"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import {
  StoreHeader, StoreFooter, StorefrontStyles, ProductDetail, ProductCard, ProductSheet, CartSheet,
  fmt,
  type StoreConsultant, type StoreProduct, type CartItem,
} from "@/components/storefront/Storefront";

interface Props {
  consultant: StoreConsultant;
  mainProduct: StoreProduct;
  others: StoreProduct[];
  fontClass: string;
}

export function PublicRequestForm({ consultant, mainProduct, others, fontClass }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [detail, setDetail] = useState<StoreProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

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

      <main className="max-w-5xl mx-auto px-5 pt-6 pb-28">
        {/* Producto principal — mismo detalle que en el catálogo */}
        <div className="relative bg-white rounded-3xl border border-[#efe2d8] overflow-hidden shadow-sm">
          <div className="absolute -top-16 -right-12 w-56 h-56 rounded-full bg-[#f7c9dd] blur-3xl opacity-40 sf-blob pointer-events-none" />
          <ProductDetail
            product={mainProduct}
            fontClass={fontClass}
            inCart={cart.find((c) => c.productId === mainProduct.id)?.quantity ?? 0}
            onAdd={(qty) => addToCart(mainProduct, qty)}
          />
        </div>

        {/* Más productos — mismas tarjetas que el catálogo */}
        {others.length > 0 && (
          <section className="mt-12">
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c9a84c]">También disponible</p>
                <h2 className={`${fontClass} text-2xl md:text-3xl font-semibold`}>Más productos</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {others.map((p) => (
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
          </section>
        )}
      </main>

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
          source="product"
          onUpdateQty={updateQty}
          onRemove={removeFromCart}
          onClose={() => setCartOpen(false)}
        />
      )}
    </div>
  );
}
