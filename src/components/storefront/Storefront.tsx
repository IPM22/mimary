"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  X, Plus, Minus, ShoppingBag, CheckCircle, ChevronDown, Trash2, Heart,
} from "lucide-react";

// ── Tipos compartidos ──────────────────────────────────────────────────────────

export type StoreConsultant = { id: string; name: string; avatar: string | null; phone: string | null };

export type StoreProduct = {
  id: string;
  name: string;
  images: string[];
  price: number;
  description: string | null;
  benefits: string | null;
  howToUse: string | null;
  howItWorks: string | null;
  generalInfo: string | null;
  ingredients: string | null;
};

export type CartItem = { productId: string; name: string; image: string | null; price: number; quantity: number };

// ── Helpers ─────────────────────────────────────────────────────────────────────

export function fmt(price: number) {
  return `RD$${price.toLocaleString("es-DO", { minimumFractionDigits: 0 })}`;
}

export function waDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return /^(809|829|849)/.test(digits) ? "1" + digits : digits;
}

export const WaIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// Animaciones + textura compartidas (se inyecta una sola vez por página)
export const StorefrontStyles = () => (
  <style>{`
    @keyframes sf-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes sf-blob { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(12px,-18px) scale(1.08); } }
    .sf-rise { animation: sf-rise .5s cubic-bezier(.22,.61,.36,1) both; }
    .sf-blob { animation: sf-blob 14s ease-in-out infinite; }
    .sf-grain { background-image: radial-gradient(rgba(201,168,76,.10) 1px, transparent 1px); background-size: 18px 18px; }
  `}</style>
);

// ── Top bar ──────────────────────────────────────────────────────────────────

export function StoreHeader({
  consultant, cartCount, onOpenCart,
}: {
  consultant: StoreConsultant;
  cartCount: number;
  onOpenCart: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[#fdf6f1]/80 border-b border-[#e7d6c9]">
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white shadow-sm p-1 flex items-center justify-center">
          <img src="/logo.png" alt="MiMary" className="w-full h-full object-contain" />
        </div>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold tracking-tight">{consultant.name}</p>
          <p className="text-[10px] text-[#9c8478] uppercase tracking-[0.18em]">Mary Kay</p>
        </div>
        <button
          onClick={onOpenCart}
          className="ml-auto relative flex items-center gap-2 px-4 py-2 rounded-full bg-[#2a1f25] text-white text-xs font-semibold hover:bg-[#412f38] transition-colors"
        >
          <ShoppingBag size={15} />
          <span className="hidden sm:inline">Mi pedido</span>
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-mk-pink text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────

export function StoreFooter({ consultant, fontClass }: { consultant: StoreConsultant; fontClass: string }) {
  return (
    <footer className="bg-[#2a1f25] text-white">
      <div className="max-w-6xl mx-auto px-5 py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-full mk-gradient flex items-center justify-center flex-shrink-0 overflow-hidden">
            {consultant.avatar ? (
              <img src={consultant.avatar} alt={consultant.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-2xl">{consultant.name[0]}</span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Tu consultora Mary Kay</p>
            <p className={`${fontClass} text-2xl font-semibold`}>{consultant.name}</p>
            <p className="text-white/60 text-sm mt-1">Estoy aquí para ayudarte a encontrar lo que tu piel necesita.</p>
          </div>
          {consultant.phone && (
            <a
              href={`https://wa.me/${waDigits(consultant.phone)}?text=${encodeURIComponent(`Hola ${consultant.name}, vi tu catálogo en MiMary.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-semibold transition-colors"
            >
              <WaIcon /> Escríbeme
            </a>
          )}
        </div>
        <p className="mt-10 text-center text-white/30 text-xs">Hecho con MiMary · {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}

// ── Tarjeta de producto ──────────────────────────────────────────────────────

export function ProductCard({
  product, fontClass, inCart, onOpen, onAdd, onUpdateQty,
}: {
  product: StoreProduct;
  fontClass: string;
  inCart: number;
  onOpen: () => void;
  onAdd: () => void;
  onUpdateQty: (delta: number) => void;
}) {
  return (
    <article className="group bg-white rounded-3xl overflow-hidden border border-[#efe2d8] hover:border-mk-pink/30 hover:shadow-xl hover:shadow-pink-100/50 transition-all duration-300 flex flex-col">
      <button onClick={onOpen} className="relative aspect-square overflow-hidden bg-[#f7eee7] text-left">
        {product.images[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-[#d9c4b6]">✦</div>
        )}
      </button>
      <div className="p-3.5 flex flex-col flex-1">
        <button onClick={onOpen} className="text-left flex-1">
          <h3 className="text-[13px] font-semibold leading-snug line-clamp-2 group-hover:text-mk-pink transition-colors">{product.name}</h3>
        </button>
        <div className="flex items-center justify-between mt-2.5">
          <p className={`${fontClass} text-lg font-semibold text-mk-pink`}>{fmt(product.price)}</p>
          {inCart > 0 ? (
            <div className="flex items-center gap-1.5">
              <button onClick={() => onUpdateQty(-1)} className="w-7 h-7 rounded-full bg-[#f7eee7] flex items-center justify-center hover:bg-[#efe2d8] transition-colors">
                <Minus size={12} />
              </button>
              <span className="text-sm font-bold w-4 text-center">{inCart}</span>
              <button onClick={onAdd} className="w-7 h-7 rounded-full mk-gradient flex items-center justify-center">
                <Plus size={12} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={onAdd}
              className="w-9 h-9 rounded-full bg-[#2a1f25] text-white flex items-center justify-center hover:bg-mk-pink transition-colors"
              aria-label="Agregar al pedido"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Contenido de detalle de producto (compartido por página y hoja) ──────────────

function Accordion({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#e7d6c9] rounded-2xl overflow-hidden bg-white/60">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="text-[12px] font-bold uppercase tracking-wider text-[#5a4940]">{title}</span>
        <ChevronDown size={15} className={`text-[#9c8478] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="px-4 pb-4 text-sm text-[#6b5a51] leading-relaxed whitespace-pre-line">{body}</p>}
    </div>
  );
}

export function ProductDetail({
  product, fontClass, inCart, onAdd,
}: {
  product: StoreProduct;
  fontClass: string;
  inCart: number;
  onAdd: (qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const images = product.images.filter(Boolean);

  return (
    <div className="sm:grid sm:grid-cols-2">
      {/* Imagen */}
      <div className="bg-[#f7eee7]">
        <div className="aspect-square overflow-hidden">
          {images[activeImg] ? (
            <img src={images[activeImg]} alt={product.name} className="w-full h-full object-contain p-4" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl text-[#d9c4b6]">✦</div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 px-4 pb-4 overflow-x-auto">
            {images.slice(0, 6).map((img, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                className={`w-12 h-12 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${i === activeImg ? "border-mk-pink" : "border-transparent opacity-60"}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-6 space-y-4">
        <h2 className={`${fontClass} text-2xl font-semibold leading-tight`}>{product.name}</h2>
        <p className={`${fontClass} text-3xl font-semibold text-mk-pink`}>{fmt(product.price)}</p>

        {product.description && (
          <p className="text-sm text-[#6b5a51] leading-relaxed whitespace-pre-line">{product.description}</p>
        )}
        {product.benefits && <Accordion title="Ingredientes clave" body={product.benefits} />}
        {product.howToUse && <Accordion title="Cómo aplicar" body={product.howToUse} />}
        {product.howItWorks && <Accordion title="Cómo funciona" body={product.howItWorks} />}
        {product.generalInfo && <Accordion title="Información general" body={product.generalInfo} />}
        {product.ingredients && <Accordion title="Lista completa de ingredientes" body={product.ingredients} />}

        {/* Add to cart */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex items-center bg-white border border-[#e7d6c9] rounded-full overflow-hidden">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-[#f7eee7]"><Minus size={14} /></button>
            <span className="w-8 text-center font-bold">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-[#f7eee7]"><Plus size={14} /></button>
          </div>
          <button
            onClick={() => onAdd(qty)}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full mk-gradient text-white font-semibold text-sm shadow-lg shadow-pink-200 hover:opacity-95 transition-opacity"
          >
            <Plus size={16} /> Agregar al pedido
            {inCart > 0 && <span className="text-white/70 text-xs">· {inCart} ya</span>}
          </button>
        </div>
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-[#9c8478]">
          <Heart size={11} className="text-mk-pink" /> Sin pago en línea — coordinas con tu consultora
        </p>
      </div>
    </div>
  );
}

// Hoja modal que envuelve el detalle (catálogo)
export function ProductSheet({
  product, fontClass, inCart, onAdd, onClose,
}: {
  product: StoreProduct;
  fontClass: string;
  inCart: number;
  onAdd: (qty: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#fdf6f1] w-full sm:max-w-3xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto sf-rise">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur shadow flex items-center justify-center hover:bg-white transition-colors">
          <X size={17} className="text-[#5a4940]" />
        </button>
        <ProductDetail
          product={product}
          fontClass={fontClass}
          inCart={inCart}
          onAdd={(qty) => { onAdd(qty); onClose(); }}
        />
      </div>
    </div>
  );
}

// ── Carrito + checkout ──────────────────────────────────────────────────────────

export function CartSheet({
  consultant, cart, fontClass, total, source, onUpdateQty, onRemove, onClose, onBrowse,
}: {
  consultant: StoreConsultant;
  cart: CartItem[];
  fontClass: string;
  total: number;
  source: "product" | "catalog";
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  onBrowse?: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = trpc.publicLinks.submitRequest.useMutation({ onSuccess: () => setSubmitted(true) });
  const count = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#fdf6f1] w-full sm:max-w-md h-full shadow-2xl flex flex-col" style={{ animation: "sf-rise .35s ease both" }}>
        <div className="flex items-center justify-between px-5 h-16 border-b border-[#e7d6c9] flex-shrink-0">
          <h2 className={`${fontClass} text-xl font-semibold`}>{submitted ? "¡Listo!" : "Mi pedido"}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-[#f1e4da] flex items-center justify-center">
            <X size={18} className="text-[#5a4940]" />
          </button>
        </div>

        {submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle size={40} className="text-emerald-500" />
            </div>
            <h3 className={`${fontClass} text-2xl font-semibold`}>Solicitud enviada</h3>
            <p className="text-[#6b5a51] text-sm">
              {consultant.name} recibió tu pedido de <span className="font-semibold">{count} producto{count !== 1 ? "s" : ""}</span> y te contactará pronto.
            </p>
            {consultant.phone && (
              <a
                href={`https://wa.me/${waDigits(consultant.phone)}?text=${encodeURIComponent(`Hola ${consultant.name}, acabo de enviarte un pedido desde MiMary. Soy ${name}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 w-full justify-center py-3.5 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold text-sm transition-colors"
              >
                <WaIcon /> Avisar por WhatsApp
              </a>
            )}
            <button onClick={onClose} className="text-sm text-[#9c8478] hover:text-[#5a4940] mt-1">Seguir explorando</button>
          </div>
        ) : cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3 text-[#9c8478]">
            <ShoppingBag size={44} strokeWidth={1.4} />
            <p className="text-sm">Tu pedido está vacío.</p>
            {onBrowse && <button onClick={onBrowse} className="text-sm text-mk-pink font-semibold hover:underline">Explorar productos</button>}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-[#efe2d8]">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-[#f7eee7] flex items-center justify-center text-xl text-[#d9c4b6] flex-shrink-0">✦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold leading-tight line-clamp-2">{item.name}</p>
                    <p className="text-mk-pink text-sm font-bold mt-0.5">{fmt(item.price * item.quantity)}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => onUpdateQty(item.productId, -1)} className="w-6 h-6 rounded-full bg-[#f7eee7] flex items-center justify-center hover:bg-[#efe2d8]"><Minus size={11} /></button>
                      <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => onUpdateQty(item.productId, 1)} className="w-6 h-6 rounded-full mk-gradient flex items-center justify-center"><Plus size={11} className="text-white" /></button>
                    </div>
                    <button onClick={() => onRemove(item.productId)} className="text-[#c9b3a6] hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}

              <div className="pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[#6b5a51] text-sm">Total estimado</span>
                  <span className={`${fontClass} text-xl font-semibold text-mk-pink`}>{fmt(total)}</span>
                </div>
                <input
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre *"
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-[#e7d6c9] text-sm focus:outline-none focus:border-mk-pink focus:ring-4 focus:ring-mk-pink/10 transition-all"
                />
                <input
                  value={phone} onChange={(e) => setPhone(e.target.value)} type="tel"
                  placeholder="WhatsApp / Teléfono"
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-[#e7d6c9] text-sm focus:outline-none focus:border-mk-pink focus:ring-4 focus:ring-mk-pink/10 transition-all"
                />
                <textarea
                  value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
                  placeholder="¿Alguna pregunta? (opcional)"
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-[#e7d6c9] text-sm focus:outline-none focus:border-mk-pink focus:ring-4 focus:ring-mk-pink/10 transition-all resize-none"
                />
                {submit.error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-xl">{submit.error.message}</p>}
              </div>
            </div>

            <div className="border-t border-[#e7d6c9] p-4 flex-shrink-0 bg-[#fdf6f1]">
              <button
                disabled={!name.trim() || submit.isPending}
                onClick={() =>
                  submit.mutate({
                    consultantId: consultant.id,
                    clientName: name,
                    clientPhone: phone || undefined,
                    message: message || undefined,
                    source,
                    items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
                  })
                }
                className="w-full py-4 rounded-full mk-gradient text-white font-semibold text-[15px] shadow-lg shadow-pink-200 hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {submit.isPending ? "Enviando..." : `Enviar pedido · ${count} producto${count !== 1 ? "s" : ""}`}
              </button>
              <p className="text-center text-[11px] text-[#9c8478] mt-2">Sin pago en línea. {consultant.name.split(" ")[0]} coordina contigo la entrega.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
