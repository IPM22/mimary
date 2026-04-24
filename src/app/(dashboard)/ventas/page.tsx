"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus, ShoppingBag, X, ChevronLeft, ChevronRight, Receipt,
  Search, Minus, Trash2, ShoppingCart, CreditCard, Check,
  Package, User,
} from "lucide-react";

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo", TRANSFER: "Transferencia", CARD: "Tarjeta", CREDIT: "Crédito",
};
const PAYMENT_ICONS: Record<string, string> = {
  CASH: "💵", TRANSFER: "🏦", CARD: "💳", CREDIT: "📋",
};
const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING:   { label: "Pendiente",  cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  PAID:      { label: "Pagado",     cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  DELIVERED: { label: "Entregado",  cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  CANCELLED: { label: "Cancelado",  cls: "bg-red-50 text-red-600 border border-red-200" },
};

type CartItem = {
  productId: string; name: string; images: string[];
  quantity: number; unitPrice: number; discount: number;
};
type CatalogProduct = {
  id: string; name: string; images: string[]; category: string;
  basePrice: number | string | { toNumber: () => number };
  priceOverrides: { salePrice: number | string | { toNumber: () => number } }[];
};

function toNum(v: number | string | { toNumber: () => number } | undefined): number {
  if (!v) return 0;
  if (typeof v === "object" && "toNumber" in v) return v.toNumber();
  return Number(v);
}

function getFirstImage(images: string[]): string {
  return images.find((u) => {
    const l = u.toLowerCase();
    return !l.endsWith(".svg") && !l.includes("badge") && !l.includes("seal") &&
      !l.includes("navigation") && !l.includes("logo");
  }) ?? "";
}

function ProductThumb({ images, name, size = 48 }: { images: string[]; name: string; size?: number }) {
  const src = getFirstImage(images);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const letters = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  if (!src || failed) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-pink-100 to-rose-200 text-mk-pink font-bold flex-shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.28 }}>
        {letters}
      </div>
    );
  }
  return (
    <div className="relative rounded-xl overflow-hidden flex-shrink-0" style={{ width: size, height: size }}>
      {!loaded && <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-xl" />}
      <img
        src={src}
        alt={name}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

// ── Client combobox ─────────────────────────────────────────────────────────
function ClientCombobox({ clientId, clientName, onClientChange, onNameChange }: {
  clientId: string; clientName: string;
  onClientChange: (id: string, name: string) => void;
  onNameChange: (name: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data } = trpc.clients.list.useQuery({ search, limit: 8 }, { enabled: open || search.length > 0 });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const displayValue = clientId ? (data?.clients.find((c) => c.id === clientId)?.name ?? search) : search;

  return (
    <div ref={containerRef} className="space-y-1.5">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
        <User size={10} /> Cliente
      </label>
      <div className="relative">
        <input
          value={clientId ? displayValue : search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (clientId) onClientChange("", "");
            onNameChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar clienta registrada..."
          className="w-full px-3 py-2 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-mk-pink/50 focus:bg-white transition-colors"
        />
        {clientId && (
          <button onClick={() => { onClientChange("", ""); setSearch(""); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
            <X size={13} />
          </button>
        )}
        {open && (data?.clients?.length ?? 0) > 0 && !clientId && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-40 overflow-y-auto">
            {data!.clients.map((c) => (
              <button key={c.id} type="button"
                onClick={() => { onClientChange(c.id, c.name); setSearch(c.name); setOpen(false); }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-pink-50 hover:text-mk-pink transition-colors border-b border-gray-50 last:border-0">
                {c.name}
                {c.phone && <span className="text-xs text-gray-400 ml-2">{c.phone}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {!clientId && (
        <input value={clientName} onChange={(e) => onNameChange(e.target.value)}
          placeholder="O escribe el nombre si no está registrada"
          className="w-full px-3 py-2 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-mk-pink/50 focus:bg-white transition-colors" />
      )}
    </div>
  );
}

// ── Sale detail modal ───────────────────────────────────────────────────────
function SaleDetailModal({ sale, onClose, onStatusChange }: { sale: any; onClose: () => void; onStatusChange: (id: string, status: string) => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest">Detalle</p>
            <h2 className="text-lg font-bold text-gray-900">Venta</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Cliente</p>
              <p className="font-semibold text-gray-900">{sale.client?.name ?? sale.clientName ?? "Sin cliente"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Fecha</p>
              <p className="font-semibold text-gray-900">{formatDate(sale.createdAt)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Método de pago</p>
              <p className="font-semibold text-gray-900">{PAYMENT_ICONS[sale.paymentMethod]} {PAYMENT_LABELS[sale.paymentMethod]}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Estado</p>
              <select value={sale.status} onChange={(e) => onStatusChange(sale.id, e.target.value)}
                className={`text-xs px-2.5 py-1 rounded-full font-semibold cursor-pointer border-0 appearance-none ${STATUS_CFG[sale.status]?.cls}`}>
                {Object.entries(STATUS_CFG).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-100">
              <Package size={13} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Productos</span>
            </div>
            <div className="divide-y divide-gray-50">
              {sale.items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <ProductThumb images={item.product?.images ?? []} name={item.product?.name ?? "?"} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.product?.name ?? "Producto"}</p>
                    <p className="text-xs text-gray-400">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(item.quantity * Number(item.unitPrice) - Number(item.discount ?? 0))}</p>
                    {Number(item.discount) > 0 && <p className="text-xs text-amber-500">-{formatCurrency(item.discount)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {sale.notes && (
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">Notas</p>
              <p className="text-sm text-gray-700">{sale.notes}</p>
            </div>
          )}

          <div className="flex items-center justify-between bg-pink-50 rounded-xl px-4 py-3 border border-pink-100">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-xl font-bold text-mk-pink">{formatCurrency(sale.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── New sale modal ──────────────────────────────────────────────────────────
function NewSaleModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "CARD" | "CREDIT">("CASH");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"products" | "checkout">("products");

  const catRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { data: categories } = trpc.catalog.categories.useQuery();
  const { data: catalog } = trpc.catalog.list.useQuery({ search, category: activeCategory, limit: 100 });
  const create = trpc.sales.create.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  function checkScroll() {
    const el = catRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }
  useEffect(() => {
    const el = catRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll);
    return () => el.removeEventListener("scroll", checkScroll);
  }, [categories]);

  const total = cart.reduce((s, i) => s + i.quantity * i.unitPrice - i.discount, 0);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  function getPrice(p: CatalogProduct): number {
    const override = toNum(p.priceOverrides[0]?.salePrice);
    return override > 0 ? override : toNum(p.basePrice);
  }
  function addToCart(p: CatalogProduct) {
    const price = getPrice(p);
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) return prev.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: p.id, name: p.name, images: p.images, quantity: 1, unitPrice: price, discount: 0 }];
    });
  }
  function updateQty(productId: string, delta: number) {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  }
  function updatePrice(productId: string, val: string) {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, unitPrice: parseFloat(val) || 0 } : i));
  }
  function updateDiscount(productId: string, val: string) {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, discount: parseFloat(val) || 0 } : i));
  }
  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }
  function handleSubmit() {
    if (cart.length === 0) return;
    create.mutate({
      clientId: clientId || undefined, clientName: clientName || undefined,
      paymentMethod, notes: notes || undefined,
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount })),
    });
  }
  const cartQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    cart.forEach((i) => { map[i.productId] = i.quantity; });
    return map;
  }, [cart]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-stretch md:items-center justify-center md:p-4">
      <div className="bg-gray-50 w-full md:max-w-6xl md:h-[92vh] flex flex-col md:rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold text-mk-pink uppercase tracking-widest">Registrar</p>
            <h2 className="text-lg font-bold text-gray-900">Nueva venta</h2>
          </div>
          <div className="flex items-center gap-3">
            {itemCount > 0 && (
              <button onClick={() => setStep(step === "products" ? "checkout" : "products")}
                className="md:hidden relative flex items-center gap-2 px-4 py-2 bg-mk-pink text-white rounded-xl text-sm font-semibold">
                <ShoppingCart size={15} /><span>{itemCount}</span>
              </button>
            )}
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Products panel */}
          <div className={`flex flex-col flex-1 min-w-0 ${step === "checkout" ? "hidden md:flex" : "flex"}`}>
            {/* Search + category buttons */}
            <div className="px-4 pt-3 pb-2 bg-white border-b border-gray-100 space-y-2 flex-shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-mk-pink/40 focus:bg-white transition-colors" />
              </div>
              {/* Category scroll with arrows */}
              <div className="relative flex items-center gap-1">
                {canScrollLeft && (
                  <button onClick={() => catRef.current?.scrollBy({ left: -160, behavior: "smooth" })}
                    className="w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:border-mk-pink hover:text-mk-pink flex-shrink-0 z-10">
                    <ChevronLeft size={13} />
                  </button>
                )}
                <div ref={catRef} className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none flex-1">
                  <button onClick={() => setActiveCategory("")}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${!activeCategory ? "bg-mk-pink text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    Todos
                  </button>
                  {categories?.map((c) => (
                    <button key={c.name} onClick={() => setActiveCategory(c.name)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${activeCategory === c.name ? "bg-mk-pink text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                      {c.name}
                    </button>
                  ))}
                </div>
                {canScrollRight && (
                  <button onClick={() => catRef.current?.scrollBy({ left: 160, behavior: "smooth" })}
                    className="w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:border-mk-pink hover:text-mk-pink flex-shrink-0 z-10">
                    <ChevronRight size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {catalog?.products.map((p) => {
                  const price = getPrice(p as any);
                  const inCart = cartQtyMap[p.id] ?? 0;
                  return (
                    <button key={p.id} type="button" onClick={() => addToCart(p as any)}
                      className={`relative flex flex-col items-center bg-white rounded-2xl p-2.5 border-2 transition-all duration-150 text-left hover:shadow-md active:scale-95 ${inCart > 0 ? "border-mk-pink shadow-sm shadow-pink-100" : "border-transparent hover:border-pink-100"}`}>
                      {inCart > 0 && (
                        <span className="absolute top-2 right-2 w-5 h-5 bg-mk-pink text-white text-[10px] font-bold rounded-full flex items-center justify-center z-10">{inCart}</span>
                      )}
                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-pink-50 to-rose-50 mb-2">
                        <img src={getFirstImage(p.images)} alt={p.name} loading="lazy" decoding="async"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const t = e.currentTarget; t.style.display = "none";
                            const par = t.parentElement;
                            if (par) par.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"><span style="font-size:1.5rem;font-weight:700;color:#E91E8C;opacity:0.25">${p.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}</span></div>`;
                          }} />
                      </div>
                      <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 w-full mb-1">{p.name}</p>
                      {price > 0 && <p className="text-xs font-bold text-mk-pink">{formatCurrency(price)}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Checkout panel */}
          <div className={`flex flex-col bg-white border-l border-gray-100 flex-shrink-0 w-full md:w-[340px] lg:w-[380px] ${step === "products" ? "hidden md:flex" : "flex"}`}>
            <button onClick={() => setStep("products")} className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-gray-100 text-sm text-gray-500 hover:text-mk-pink">
              <ChevronLeft size={16} /> Volver a productos
            </button>

            {/* Client selector — always visible */}
            <div className="px-4 pt-3 pb-3 border-b border-gray-100 flex-shrink-0">
              <ClientCombobox
                clientId={clientId}
                clientName={clientName}
                onClientChange={(id, name) => { setClientId(id); setClientName(name); }}
                onNameChange={(name) => setClientName(name)}
              />
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-gray-300">
                  <ShoppingCart size={40} strokeWidth={1.5} className="mb-3" />
                  <p className="text-sm font-medium">Agrega productos al carrito</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {cart.map((item) => (
                    <div key={item.productId} className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                      <div className="flex items-start gap-2.5 mb-2">
                        <ProductThumb images={item.images} name={item.name} size={40} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight">{item.name}</p>
                          <p className="text-xs text-mk-pink font-bold mt-0.5">{formatCurrency(item.unitPrice)}</p>
                        </div>
                        <button onClick={() => removeFromCart(item.productId)} className="p-1 rounded-lg hover:bg-red-50 hover:text-red-400 text-gray-300 transition-colors flex-shrink-0"><Trash2 size={13} /></button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                          <button onClick={() => updateQty(item.productId, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 text-gray-600"><Minus size={12} /></button>
                          <span className="w-7 text-center text-sm font-bold text-gray-800">{item.quantity}</span>
                          <button onClick={() => updateQty(item.productId, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-pink-50 hover:text-mk-pink text-gray-600"><Plus size={12} /></button>
                        </div>
                        <input type="number" min="0" step="0.01" value={item.unitPrice || ""} onChange={(e) => updatePrice(item.productId, e.target.value)}
                          className="flex-1 px-2 py-1.5 text-xs border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-mk-pink/50 font-semibold" placeholder="Precio" />
                        <input type="number" min="0" step="0.01" value={item.discount || ""} onChange={(e) => updateDiscount(item.productId, e.target.value)}
                          className="w-16 px-2 py-1.5 text-xs border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-amber-400/50 text-amber-600" placeholder="Desc." />
                      </div>
                      <p className="text-right text-xs text-gray-400 mt-1.5">Subtotal: <strong className="text-gray-700">{formatCurrency(Math.max(0, item.quantity * item.unitPrice - item.discount))}</strong></p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer: payment + submit */}
            {cart.length > 0 && (
              <div className="border-t border-gray-100 p-4 space-y-3 flex-shrink-0">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5"><CreditCard size={10} /> Método de pago</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["CASH", "TRANSFER", "CARD", "CREDIT"] as const).map((m) => (
                      <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${paymentMethod === m ? "border-mk-pink bg-pink-50 text-mk-pink" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                        <span>{PAYMENT_ICONS[m]}</span>{PAYMENT_LABELS[m]}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notas (opcional)"
                  className="w-full px-3 py-2 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-mk-pink/50 resize-none" />
                <div className="bg-pink-50 rounded-2xl px-4 py-3 flex items-center justify-between border border-pink-100">
                  <div>
                    <p className="text-xs text-gray-500">{itemCount} producto{itemCount !== 1 ? "s" : ""}</p>
                    <p className="text-xl font-bold text-mk-pink">{formatCurrency(Math.max(0, total))}</p>
                  </div>
                  <button onClick={handleSubmit} disabled={create.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-mk-pink text-white font-bold rounded-xl disabled:opacity-60 hover:bg-pink-700 text-sm">
                    {create.isPending ? "..." : <><Check size={15} /> Registrar</>}
                  </button>
                </div>
                {create.error && <p className="text-red-500 text-xs text-center">{create.error.message}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function toISODate(d: Date) {
  return d.toISOString().split("T")[0];
}

// ── Sales page ──────────────────────────────────────────────────────────────
export default function VentasPage() {
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [datePreset, setDatePreset] = useState<"" | "today" | "week" | "month" | "custom">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const utils = trpc.useUtils();

  function applyPreset(preset: typeof datePreset) {
    const now = new Date();
    if (preset === "today") {
      setFromDate(toISODate(now));
      setToDate(toISODate(now));
    } else if (preset === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      setFromDate(toISODate(d));
      setToDate(toISODate(now));
    } else if (preset === "month") {
      setFromDate(toISODate(new Date(now.getFullYear(), now.getMonth(), 1)));
      setToDate(toISODate(now));
    } else {
      setFromDate(""); setToDate("");
    }
    setDatePreset(preset);
    setPage(1);
  }

  const { data, isLoading } = trpc.sales.list.useQuery(
    { page, limit: 25, status: statusFilter as any || undefined, from: fromDate || undefined, to: toDate || undefined },
    { placeholderData: (prev: any) => prev }
  );
  const updateStatus = trpc.sales.updateStatus.useMutation({
    onSuccess: () => { utils.sales.list.invalidate(); if (selectedSale) setSelectedSale((s: any) => ({ ...s, status: s.status })); },
  });

  const STATUS_FILTERS = [
    { value: "", label: "Todas" },
    { value: "PENDING", label: "Pendiente" },
    { value: "PAID", label: "Pagado" },
    { value: "DELIVERED", label: "Entregado" },
    { value: "CANCELLED", label: "Cancelado" },
  ];

  function handleStatusChange(id: string, status: string) {
    updateStatus.mutate({ id, status: status as any });
    if (selectedSale?.id === id) setSelectedSale((s: any) => ({ ...s, status }));
  }

  return (
    <div className="min-h-full p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest mb-1">Registro</p>
          <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-mk-pink text-white font-semibold rounded-xl text-sm hover:bg-pink-700 transition-colors shadow-sm shadow-pink-200">
          <Plus size={15} /><span>Nueva venta</span>
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-2.5">
        {/* Status */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-14 flex-shrink-0">Estado</span>
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                statusFilter === f.value ? "border-mk-pink bg-pink-50 text-mk-pink" : "border-gray-100 text-gray-500 hover:border-gray-200 bg-white"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Date */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-14 flex-shrink-0">Fecha</span>
          {([
            { value: "" as const, label: "Todas" },
            { value: "today" as const, label: "Hoy" },
            { value: "week" as const, label: "7 días" },
            { value: "month" as const, label: "Este mes" },
            { value: "custom" as const, label: "Personalizar" },
          ]).map((p) => (
            <button key={p.value} onClick={() => applyPreset(p.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                datePreset === p.value ? "border-mk-pink bg-pink-50 text-mk-pink" : "border-gray-100 text-gray-500 hover:border-gray-200 bg-white"
              }`}>
              {p.label}
            </button>
          ))}
          {datePreset === "custom" && (
            <div className="flex items-center gap-2 mt-1 sm:mt-0">
              <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                className="px-3 py-1.5 border-2 border-gray-100 rounded-xl text-xs bg-white focus:outline-none focus:border-mk-pink/50 text-gray-700" />
              <span className="text-gray-300 text-xs">—</span>
              <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                className="px-3 py-1.5 border-2 border-gray-100 rounded-xl text-xs bg-white focus:outline-none focus:border-mk-pink/50 text-gray-700" />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
          <div className="hidden md:block">
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 flex gap-8">
              {[20, 28, 36, 16, 14, 14].map((w, i) => <div key={i} style={{ width: `${w * 4}px` }} className="h-3 bg-gray-200 rounded-full" />)}
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-5 px-5 py-4 border-b border-gray-50">
                <div className="h-3.5 bg-gray-100 rounded-full w-20 flex-shrink-0" />
                <div className="h-3.5 bg-gray-100 rounded-full w-32" />
                <div className="flex gap-2 flex-1">
                  <div className="h-6 bg-gray-100 rounded-full w-24" />
                  <div className="h-6 bg-gray-100 rounded-full w-20" />
                </div>
                <div className="h-3.5 bg-gray-100 rounded-full w-16" />
                <div className="h-3.5 bg-gray-200 rounded-full w-20 ml-auto" />
                <div className="h-5 bg-gray-100 rounded-full w-16" />
              </div>
            ))}
          </div>
          <div className="md:hidden space-y-px">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-4 border-b border-gray-50">
                <div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-200 rounded-full w-28" />
                  <div className="h-3 bg-gray-100 rounded-full w-20" />
                </div>
                <div className="h-4 bg-gray-200 rounded-full w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : data?.sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
            <Receipt size={24} className="text-mk-pink/40" />
          </div>
          <p className="text-gray-500 font-medium">Sin ventas {statusFilter ? "con ese estado" : "registradas"}</p>
          {!statusFilter && <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-mk-pink underline underline-offset-2">Registrar primera venta</button>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Productos</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Pago</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.sales.map((sale) => (
                  <tr key={sale.id} onClick={() => setSelectedSale(sale)}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                    <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">{formatDate(sale.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
                          <ShoppingBag size={13} className="text-mk-pink" />
                        </div>
                        <span className="font-medium text-gray-900">{sale.client?.name ?? (sale as any).clientName ?? "Sin cliente"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1 flex-wrap">
                        {sale.items.slice(0, 3).map((item: any, i: number) => (
                          <span key={i} className="text-[11px] bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {item.product?.name ?? "Producto"} ×{item.quantity}
                          </span>
                        ))}
                        {sale.items.length > 3 && (
                          <span className="text-[11px] bg-gray-50 border border-gray-100 text-gray-400 px-2 py-0.5 rounded-full">+{sale.items.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">
                      <span className="flex items-center gap-1">{PAYMENT_ICONS[sale.paymentMethod]} {PAYMENT_LABELS[sale.paymentMethod]}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-gray-900 whitespace-nowrap">{formatCurrency(sale.total)}</td>
                    <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <select value={sale.status} onChange={(e) => handleStatusChange(sale.id, e.target.value)}
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold cursor-pointer border-0 appearance-none ${STATUS_CFG[sale.status]?.cls}`}>
                        {Object.entries(STATUS_CFG).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden divide-y divide-gray-50">
            {data?.sales.map((sale) => (
              <div key={sale.id} onClick={() => setSelectedSale(sale)} className="p-4 cursor-pointer active:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag size={16} className="text-mk-pink" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{sale.client?.name ?? (sale as any).clientName ?? "Sin cliente"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(sale.createdAt)} · {PAYMENT_LABELS[sale.paymentMethod]}</p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1.5">
                    <p className="font-bold text-gray-900">{formatCurrency(sale.total)}</p>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block ${STATUS_CFG[sale.status]?.cls}`}>
                      {STATUS_CFG[sale.status]?.label}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {(data?.pages ?? 1) > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">{data?.total} ventas · página {page} de {data?.pages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white disabled:opacity-30 hover:border-mk-pink hover:text-mk-pink transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page === data?.pages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white disabled:opacity-30 hover:border-mk-pink hover:text-mk-pink transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && <NewSaleModal onClose={() => setShowForm(false)} onSuccess={() => utils.sales.list.invalidate()} />}
      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
