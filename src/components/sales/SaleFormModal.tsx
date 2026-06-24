"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils";
import {
  X, ChevronLeft, ChevronRight, Search, Minus, Plus, Trash2,
  ShoppingCart, CreditCard, Check, User, DollarSign, Banknote,
} from "lucide-react";

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo", TRANSFER: "Transferencia", CARD: "Tarjeta", CREDIT: "Crédito",
};
const PAYMENT_ICONS: Record<string, string> = {
  CASH: "💵", TRANSFER: "🏦", CARD: "💳", CREDIT: "📋",
};

export type SaleFormInitialItem = {
  productId: string;
  name: string;
  images: string[];
  quantity: number;
  unitPrice: number;
};

type CartItem = {
  productId: string; name: string; images: string[];
  quantity: number; unitPrice: number;
  discountType: "AMOUNT" | "PERCENT";
  discountValue: number;
};
type CatalogProduct = {
  id: string; name: string; images: string[]; category: string;
  salePrice: number | string | { toNumber: () => number };
  stock: number;
};

function toNum(v: number | string | { toNumber: () => number } | undefined): number {
  if (!v) return 0;
  if (typeof v === "object" && "toNumber" in v) return v.toNumber();
  return Number(v);
}

function getItemDiscount(item: CartItem): number {
  if (item.discountType === "PERCENT") {
    return (item.quantity * item.unitPrice * item.discountValue) / 100;
  }
  return item.discountValue;
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

function ClientCombobox({ clientId, clientName, onClientChange, onNameChange }: {
  clientId: string; clientName: string;
  onClientChange: (id: string, name: string) => void;
  onNameChange: (name: string) => void;
}) {
  const [search, setSearch] = useState(clientName);
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

export interface SaleFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
  /** Productos con los que precargar el carrito (ej. desde una solicitud). */
  initialItems?: SaleFormInitialItem[];
  initialClientId?: string;
  initialClientName?: string;
  /** Si viene de una solicitud, se enlaza la venta y se notifica vía onSuccess. */
  requestId?: string;
  /** Texto del encabezado, ej. "Registrar venta desde solicitud". */
  eyebrow?: string;
  title?: string;
}

export function SaleFormModal({
  onClose, onSuccess, initialItems, initialClientId, initialClientName, requestId,
  eyebrow = "Registrar", title = "Nueva venta",
}: SaleFormModalProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [cart, setCart] = useState<CartItem[]>(
    (initialItems ?? []).map((i) => ({
      productId: i.productId, name: i.name, images: i.images,
      quantity: i.quantity, unitPrice: i.unitPrice,
      discountType: "AMOUNT", discountValue: 0,
    }))
  );
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [clientName, setClientName] = useState(initialClientName ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "CARD" | "CREDIT">("CASH");
  const [paymentMode, setPaymentMode] = useState<"PAID" | "PENDING" | "INSTALLMENTS">("PAID");
  const [installmentCount, setInstallmentCount] = useState(2);
  const [installmentFrequency, setInstallmentFrequency] = useState<"MONTHLY" | "BIWEEKLY">("MONTHLY");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [notes, setNotes] = useState("");
  // Si ya viene con productos precargados, abre directo en el checkout.
  const [step, setStep] = useState<"products" | "checkout">(
    (initialItems?.length ?? 0) > 0 ? "checkout" : "products"
  );
  const [initialPaymentAmount, setInitialPaymentAmount] = useState("");
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<"CASH" | "TRANSFER" | "CARD" | "CREDIT">("CASH");

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

  const total = cart.reduce((s, i) => s + i.quantity * i.unitPrice - getItemDiscount(i), 0);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  function getPrice(p: CatalogProduct): number {
    return toNum(p.salePrice);
  }
  function addToCart(p: CatalogProduct) {
    const price = getPrice(p);
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) return prev.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: p.id, name: p.name, images: p.images, quantity: 1, unitPrice: price, discountType: "AMOUNT" as const, discountValue: 0 }];
    });
  }
  function updateQty(productId: string, delta: number) {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  }
  function updatePrice(productId: string, val: string) {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, unitPrice: parseFloat(val) || 0 } : i));
  }
  function updateDiscountValue(productId: string, val: string) {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, discountValue: parseFloat(val) || 0 } : i));
  }
  function toggleDiscountType(productId: string) {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, discountType: i.discountType === "AMOUNT" ? "PERCENT" : "AMOUNT", discountValue: 0 } : i));
  }
  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }
  function handleSubmit() {
    if (cart.length === 0) return;
    if (paymentMode === "INSTALLMENTS" && (!firstDueDate || installmentCount < 2)) return;
    const parsedInitial = parseFloat(initialPaymentAmount) || 0;
    create.mutate({
      clientId: clientId || undefined,
      clientName: clientName || undefined,
      paymentMethod,
      paymentMode,
      notes: notes || undefined,
      requestId: requestId || undefined,
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, discount: getItemDiscount(i) })),
      installmentsConfig: paymentMode === "INSTALLMENTS" ? { count: installmentCount, firstDueDate, frequency: installmentFrequency } : undefined,
      initialPayment: paymentMode === "PENDING" && parsedInitial > 0 ? { amount: parsedInitial, paymentMethod: initialPaymentMethod } : undefined,
    });
  }
  const cartQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    cart.forEach((i) => { map[i.productId] = i.quantity; });
    return map;
  }, [cart]);

  const canSubmit = cart.length > 0 && (paymentMode !== "INSTALLMENTS" || (!!firstDueDate && installmentCount >= 2));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-stretch md:items-center justify-center md:p-4">
      <div className="bg-gray-50 w-full md:max-w-6xl md:h-[92vh] flex flex-col md:rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold text-mk-pink uppercase tracking-widest">{eyebrow}</p>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
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
            <div className="px-4 pt-3 pb-2 bg-white border-b border-gray-100 space-y-2 flex-shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-mk-pink/40 focus:bg-white transition-colors" />
              </div>
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
                  const stock = (p as any).stock as number;
                  const outOfStock = stock === 0;
                  const lowStock = !outOfStock && stock <= 2;
                  return (
                    <button key={p.id} type="button"
                      onClick={() => !outOfStock && addToCart(p as any)}
                      disabled={outOfStock}
                      className={`relative flex flex-col items-center rounded-2xl p-2.5 border-2 transition-all duration-150 text-left ${
                        outOfStock
                          ? "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed"
                          : inCart > 0
                            ? "bg-white border-mk-pink shadow-sm shadow-pink-100 hover:shadow-md active:scale-95"
                            : "bg-white border-transparent hover:border-pink-100 hover:shadow-md active:scale-95"
                      }`}>
                      {inCart > 0 && !outOfStock && (
                        <span className="absolute top-2 right-2 w-5 h-5 bg-mk-pink text-white text-[10px] font-bold rounded-full flex items-center justify-center z-10">{inCart}</span>
                      )}
                      {outOfStock && (
                        <span className="absolute top-2 right-2 text-[9px] font-bold bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full z-10 uppercase tracking-wide">Sin stock</span>
                      )}
                      {lowStock && !inCart && (
                        <span className="absolute top-2 left-2 text-[9px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full z-10">{stock}</span>
                      )}
                      <div className={`w-full aspect-square rounded-xl overflow-hidden mb-2 ${outOfStock ? "bg-gray-100 grayscale" : "bg-gradient-to-br from-pink-50 to-rose-50"}`}>
                        <img src={getFirstImage(p.images)} alt={p.name} loading="lazy" decoding="async"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const t = e.currentTarget; t.style.display = "none";
                            const par = t.parentElement;
                            if (par) par.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"><span style="font-size:1.5rem;font-weight:700;color:#E91E8C;opacity:0.25">${p.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}</span></div>`;
                          }} />
                      </div>
                      <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 w-full mb-1">{p.name}</p>
                      {price > 0 && <p className={`text-xs font-bold ${outOfStock ? "text-gray-400" : "text-mk-pink"}`}>{formatCurrency(price)}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Checkout panel */}
          <div className={`flex flex-col bg-white border-l border-gray-100 flex-shrink-0 w-full md:w-[340px] lg:w-[380px] ${step === "products" ? "hidden md:flex" : "flex"}`}>
            <button onClick={() => setStep("products")} className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-gray-100 text-sm text-gray-500 hover:text-mk-pink">
              <ChevronLeft size={16} /> Agregar más productos
            </button>

            <div className="px-4 pt-3 pb-3 border-b border-gray-100 flex-shrink-0">
              <ClientCombobox
                clientId={clientId}
                clientName={clientName}
                onClientChange={(id, name) => { setClientId(id); setClientName(name); }}
                onNameChange={(name) => setClientName(name)}
              />
            </div>

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
                        <div className="flex items-center border-2 border-amber-200 rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleDiscountType(item.productId)}
                            className="px-1.5 py-1.5 text-[10px] font-bold bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors border-r border-amber-200 flex-shrink-0">
                            {item.discountType === "PERCENT" ? "%" : "$"}
                          </button>
                          <input
                            type="number" min="0" step={item.discountType === "PERCENT" ? "1" : "0.01"}
                            max={item.discountType === "PERCENT" ? "100" : undefined}
                            value={item.discountValue || ""}
                            onChange={(e) => updateDiscountValue(item.productId, e.target.value)}
                            className="w-12 px-1.5 py-1.5 text-xs bg-white focus:outline-none text-amber-600"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <p className="text-right text-xs text-gray-400 mt-1.5">
                        {getItemDiscount(item) > 0 && (
                          <span className="text-amber-500 mr-1">
                            -{item.discountType === "PERCENT" ? `${item.discountValue}%` : formatCurrency(item.discountValue)}
                          </span>
                        )}
                        Subtotal: <strong className="text-gray-700">{formatCurrency(Math.max(0, item.quantity * item.unitPrice - getItemDiscount(item)))}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

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

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5"><DollarSign size={10} /> Forma de cobro</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { value: "PAID" as const, label: "Saldado", icon: "✅" },
                      { value: "PENDING" as const, label: "Pendiente", icon: "⏳" },
                      { value: "INSTALLMENTS" as const, label: "Cuotas", icon: "📅" },
                    ]).map((m) => (
                      <button key={m.value} type="button" onClick={() => setPaymentMode(m.value)}
                        className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl border-2 text-[11px] font-semibold transition-all ${paymentMode === m.value ? "border-mk-pink bg-pink-50 text-mk-pink" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                        <span>{m.icon}</span>{m.label}
                      </button>
                    ))}
                  </div>

                  {paymentMode === "INSTALLMENTS" && (
                    <div className="mt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        {([
                          { value: "MONTHLY" as const, label: "Mensual" },
                          { value: "BIWEEKLY" as const, label: "Quincenal" },
                        ]).map((f) => (
                          <button key={f.value} type="button" onClick={() => setInstallmentFrequency(f.value)}
                            className={`py-1.5 rounded-xl border-2 text-[11px] font-semibold transition-all ${installmentFrequency === f.value ? "border-mk-pink bg-pink-50 text-mk-pink" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                            {f.label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Cant. cuotas</label>
                          <input
                            type="number" min="2" max="24" value={installmentCount}
                            onChange={(e) => setInstallmentCount(Math.min(24, Math.max(2, parseInt(e.target.value) || 2)))}
                            className="mt-1 w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-mk-pink/50 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Primera cuota</label>
                          <input
                            type="date" value={firstDueDate}
                            onChange={(e) => setFirstDueDate(e.target.value)}
                            className="mt-1 w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-mk-pink/50 text-gray-700"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {paymentMode === "PENDING" && (
                  <div className="border border-emerald-100 bg-emerald-50/40 rounded-xl p-3 space-y-2">
                    <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                      <Banknote size={10} /> Pago inicial (opcional)
                    </label>
                    <input
                      type="number" min="0" step="0.01"
                      value={initialPaymentAmount}
                      onChange={(e) => setInitialPaymentAmount(e.target.value)}
                      placeholder={`Máx. ${formatCurrency(Math.max(0, total))}`}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-emerald-400/60 font-semibold"
                    />
                    {parseFloat(initialPaymentAmount) > 0 && (
                      <div className="grid grid-cols-4 gap-1">
                        {(["CASH", "TRANSFER", "CARD", "CREDIT"] as const).map((m) => (
                          <button key={m} type="button" onClick={() => setInitialPaymentMethod(m)}
                            className={`flex items-center justify-center gap-0.5 px-1 py-1.5 rounded-lg border-2 text-[10px] font-semibold transition-all ${initialPaymentMethod === m ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                            <span>{PAYMENT_ICONS[m]}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notas (opcional)"
                  className="w-full px-3 py-2 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-mk-pink/50 resize-none" />
                <div className="bg-pink-50 rounded-2xl px-4 py-3 flex items-center justify-between border border-pink-100">
                  <div>
                    <p className="text-xs text-gray-500">{itemCount} producto{itemCount !== 1 ? "s" : ""}</p>
                    <p className="text-xl font-bold text-mk-pink">{formatCurrency(Math.max(0, total))}</p>
                    {paymentMode === "PENDING" && parseFloat(initialPaymentAmount) > 0 && (
                      <p className="text-[11px] text-emerald-600 font-semibold">
                        Anticipo: {formatCurrency(Math.min(parseFloat(initialPaymentAmount), total))} · Pendiente: {formatCurrency(Math.max(0, total - Math.min(parseFloat(initialPaymentAmount), total)))}
                      </p>
                    )}
                  </div>
                  <button onClick={handleSubmit} disabled={create.isPending || !canSubmit}
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
