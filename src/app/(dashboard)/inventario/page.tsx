"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatDate } from "@/lib/utils";
import {
  Plus, AlertTriangle, TrendingDown, TrendingUp, Minus, X, Package,
  Search, Check, ChevronLeft, ChevronRight, CalendarClock, Trash2,
} from "lucide-react";

const inputCls = "mt-1 w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-mk-pink/50 transition-colors bg-gray-50 focus:bg-white";
const labelCls = "text-xs font-semibold text-gray-500 uppercase tracking-wide";

function toNum(v: number | string | { toNumber: () => number } | undefined | null): number {
  if (!v) return 0;
  if (typeof v === "object" && "toNumber" in v) return v.toNumber();
  return Number(v);
}
function getFirstImage(images: string[]): string {
  return images.find((u) => {
    const l = u.toLowerCase();
    return !l.endsWith(".svg") && !l.includes("badge") && !l.includes("seal") &&
      !l.includes("navigation") && !l.includes("logo") && !l.includes("category%20");
  }) ?? "";
}

function daysUntil(date: Date | string): number {
  const d = new Date(date);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function expiryBadgeCls(days: number) {
  if (days <= 0) return "bg-red-100 text-red-600 border-red-200";
  if (days <= 7) return "bg-red-50 text-red-500 border-red-100";
  if (days <= 15) return "bg-orange-50 text-orange-600 border-orange-200";
  return "bg-amber-50 text-amber-600 border-amber-100";
}

// ── Adjust Modal ─────────────────────────────────────────────────────────────
function AdjustModal({ item, onClose, onSuccess }: {
  item: { id: string; name: string; quantity: number }; onClose: () => void; onSuccess: () => void;
}) {
  const [type, setType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const adjust = trpc.inventory.adjust.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  const types = [
    { key: "IN" as const, label: "Entrada", icon: TrendingUp, cls: "border-emerald-300 bg-emerald-50 text-emerald-700" },
    { key: "OUT" as const, label: "Salida", icon: TrendingDown, cls: "border-red-300 bg-red-50 text-red-700" },
    { key: "ADJUST" as const, label: "Ajuste", icon: Minus, cls: "border-blue-300 bg-blue-50 text-blue-700" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest">Inventario</p>
            <h2 className="font-bold text-gray-900">Ajustar stock</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4 bg-gray-50 rounded-xl px-3 py-2">
          {item.name} — <span className="font-bold text-gray-800">{item.quantity} unid. actuales</span>
        </p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {types.map(({ key, label, icon: Icon, cls }) => (
            <button key={key} onClick={() => setType(key)}
              className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-colors flex flex-col items-center gap-1 ${type === key ? cls : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
        <div className="space-y-3 mb-4">
          <div>
            <label className={labelCls}>{type === "ADJUST" ? "Nueva cantidad total" : "Cantidad"}</label>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className={inputCls} />
          </div>
          {type === "IN" && (
            <div>
              <label className={labelCls}>Fecha de vencimiento</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">Opcional — para seguimiento de lotes</p>
            </div>
          )}
          <div>
            <label className={labelCls}>Motivo *</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Compra de pedido, venta, pérdida..." className={inputCls} />
          </div>
        </div>
        <button onClick={() => adjust.mutate({ inventoryItemId: item.id, type, quantity, reason, expiresAt: expiresAt || undefined })}
          disabled={!reason.trim() || adjust.isPending}
          className="w-full py-3 bg-mk-pink text-white font-semibold rounded-xl disabled:opacity-50 hover:bg-pink-700">
          {adjust.isPending ? "Guardando..." : "Aplicar ajuste"}
        </button>
        {adjust.error && <p className="text-red-500 text-xs mt-2 text-center">{adjust.error.message}</p>}
      </div>
    </div>
  );
}

// ── Add Product Modal ─────────────────────────────────────────────────────────
type CatalogProduct = { id: string; name: string; images: string[]; category: string; basePrice: number | string | { toNumber: () => number } };
type Batch = { quantity: number; expiresAt: string };

function AddProductModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [mobilePage, setMobilePage] = useState<"products" | "config">("products");
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const [batches, setBatches] = useState<Batch[]>([{ quantity: 1, expiresAt: "" }]);
  const [threshold, setThreshold] = useState(2);
  const chipsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateChipsArrows() {
    const el = chipsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  const { data: catalog } = trpc.catalog.list.useQuery({ search, category, limit: 48 });
  const { data: categories } = trpc.catalog.categories.useQuery();
  const add = trpc.inventory.addProduct.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  useEffect(() => {
    const t = setTimeout(updateChipsArrows, 80);
    return () => clearTimeout(t);
  }, [categories]);

  function updateBatch(idx: number, field: keyof Batch, val: string | number) {
    setBatches((prev) => prev.map((b, i) => i === idx ? { ...b, [field]: val } : b));
  }
  function addBatch() {
    setBatches((prev) => [...prev, { quantity: 1, expiresAt: "" }]);
  }
  function removeBatch(idx: number) {
    setBatches((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalQty = batches.reduce((s, b) => s + (b.quantity || 0), 0);
  const canAdd = !!selected && batches.length > 0 && batches.every((b) => b.quantity > 0 && !!b.expiresAt);

  const ProductsPanel = (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b border-gray-100 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto del catálogo..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-mk-pink/40 focus:bg-white" />
        </div>
        <div className="relative flex items-center">
          {canScrollLeft && (
            <button onClick={() => { chipsRef.current?.scrollBy({ left: -180, behavior: "smooth" }); }}
              className="absolute left-0 z-10 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:border-mk-pink hover:text-mk-pink flex-shrink-0">
              <ChevronLeft size={13} />
            </button>
          )}
          <div ref={chipsRef} onScroll={updateChipsArrows}
            className={`flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden ${canScrollLeft ? "pl-9" : ""} ${canScrollRight ? "pr-9" : ""}`}
            style={{ scrollbarWidth: "none" }}>
            <button onClick={() => setCategory("")}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${!category ? "bg-mk-pink text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
              Todos
            </button>
            {categories?.map((cat) => (
              <button key={cat.name} onClick={() => setCategory(category === cat.name ? "" : cat.name)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${category === cat.name ? "bg-mk-pink text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                {cat.name}
              </button>
            ))}
          </div>
          {canScrollRight && (
            <button onClick={() => { chipsRef.current?.scrollBy({ left: 180, behavior: "smooth" }); }}
              className="absolute right-0 z-10 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:border-mk-pink hover:text-mk-pink flex-shrink-0">
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {catalog?.products.map((p) => {
            const img = getFirstImage(p.images);
            const isSelected = selected?.id === p.id;
            return (
              <button key={p.id} onClick={() => { setSelected(p as CatalogProduct); setMobilePage("config"); }}
                className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-200 text-left group ${isSelected ? "border-mk-pink shadow-lg shadow-pink-100 scale-[0.98]" : "border-gray-100 hover:border-pink-200 hover:shadow-md"}`}>
                <div className="aspect-square bg-gray-50 overflow-hidden">
                  {img ? <img src={img} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-100"><span className="text-3xl font-bold text-mk-pink/20">{p.name[0]}</span></div>}
                </div>
                {isSelected && <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-mk-pink flex items-center justify-center shadow-md"><Check size={12} className="text-white" strokeWidth={3} /></div>}
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{p.name}</p>
                  {toNum(p.basePrice) > 0 && <p className="text-xs font-bold text-mk-pink mt-1">${toNum(p.basePrice).toFixed(2)}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const ConfigPanel = (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto p-5">
        <button onClick={() => setMobilePage("products")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 md:hidden">
          <ChevronLeft size={16} /> Volver al catálogo
        </button>
        {selected ? (
          <div className="space-y-5">
            {/* Product preview */}
            <div className="bg-gray-50 rounded-2xl p-3.5 flex gap-3 items-start">
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-white border border-gray-100">
                {(() => { const img = getFirstImage(selected.images); return img
                  ? <img src={img} alt={selected.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-100"><span className="text-lg font-bold text-mk-pink/40">{selected.name[0]}</span></div>; })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{selected.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{selected.category}</p>
              </div>
              <button onClick={() => { setSelected(null); setMobilePage("products"); }} className="text-gray-300 hover:text-gray-500 flex-shrink-0"><X size={15} /></button>
            </div>

            {/* Batches */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls}>Lotes con fecha de vencimiento</label>
                {totalQty > 0 && <span className="text-xs font-bold text-mk-pink">{totalQty} unid. total</span>}
              </div>
              <div className="space-y-2">
                {batches.map((batch, idx) => (
                  <div key={idx} className="flex items-end gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="w-20 flex-shrink-0">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Cant.</label>
                      <input
                        type="number" min="1" value={batch.quantity}
                        onChange={(e) => updateBatch(idx, "quantity", parseInt(e.target.value) || 1)}
                        className="mt-1 w-full px-2 py-1.5 border-2 border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-mk-pink/50 font-semibold text-center"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Fecha de vencimiento *</label>
                      <input
                        type="date" value={batch.expiresAt}
                        onChange={(e) => updateBatch(idx, "expiresAt", e.target.value)}
                        className="mt-1 w-full px-2 py-1.5 border-2 border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-mk-pink/50 text-gray-700"
                      />
                    </div>
                    {batches.length > 1 && (
                      <button onClick={() => removeBatch(idx)} className="mb-0.5 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addBatch}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-mk-pink hover:text-pink-700 transition-colors">
                <Plus size={13} /> Agregar otro lote
              </button>
            </div>

            {/* Alert threshold */}
            <div>
              <label className={labelCls}>Alerta de stock bajo</label>
              <input type="number" min="0" value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value) || 0)} className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">Aviso cuando queden ≤ estas unidades</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center"><Package size={24} className="text-mk-pink/30" /></div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Selecciona un producto</p>
              <p className="text-xs text-gray-400 mt-1">Haz clic en cualquier producto del catálogo</p>
            </div>
          </div>
        )}
      </div>
      {selected && (
        <div className="flex-shrink-0 px-5 pb-5 space-y-2">
          {!canAdd && batches.some((b) => !b.expiresAt) && (
            <p className="text-xs text-amber-600 text-center">Completa la fecha de vencimiento de cada lote</p>
          )}
          {add.error && <p className="text-red-500 text-xs text-center">{add.error.message}</p>}
          <button
            onClick={() => add.mutate({ productId: selected.id, batches, alertThreshold: threshold })}
            disabled={!canAdd || add.isPending}
            className="w-full py-3 bg-mk-pink text-white font-semibold rounded-xl disabled:opacity-50 hover:bg-pink-700 text-sm">
            {add.isPending ? "Guardando..." : `Agregar al inventario · ${totalQty} unid.`}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest">Inventario</p>
            <h2 className="font-bold text-gray-900">Agregar producto al stock</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="md:hidden h-full overflow-hidden">{mobilePage === "products" ? ProductsPanel : ConfigPanel}</div>
          <div className="hidden md:flex h-full overflow-hidden">
            <div className="flex-1 min-w-0 border-r border-gray-100 overflow-hidden">{ProductsPanel}</div>
            <div className="w-80 flex-shrink-0 overflow-hidden">{ConfigPanel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function InventarioPage() {
  const [adjustItem, setAdjustItem] = useState<{ id: string; name: string; quantity: number } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"" | "ok" | "low" | "out">("");
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [expiryDismissed, setExpiryDismissed] = useState(false);
  const utils = trpc.useUtils();

  const { data: items, isLoading } = trpc.inventory.list.useQuery({});
  const { data: expiringBatches } = trpc.inventory.expiringBatches.useQuery({ days: 30 });

  const lowStock = items?.filter((i) => i.quantity <= i.alertThreshold) ?? [];

  const filteredItems = items?.filter((item) => {
    const matchesSearch = !search || item.product.name.toLowerCase().includes(search.toLowerCase()) || item.product.category?.toLowerCase().includes(search.toLowerCase());
    const isEmpty = item.quantity === 0;
    const isLow = !isEmpty && item.quantity <= item.alertThreshold;
    const matchesStock = !stockFilter || (stockFilter === "out" && isEmpty) || (stockFilter === "low" && isLow) || (stockFilter === "ok" && !isEmpty && !isLow);
    return matchesSearch && matchesStock;
  });

  function onSuccess() {
    utils.inventory.list.invalidate();
    utils.inventory.expiringBatches.invalidate();
  }

  return (
    <div className="min-h-full p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest mb-1">Stock</p>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-mk-pink text-white font-semibold rounded-xl text-sm hover:bg-pink-700 transition-colors shadow-sm shadow-pink-200">
          <Plus size={15} /><span>Agregar producto</span>
        </button>
      </div>

      {/* Próximos a vencer */}
      {(expiringBatches?.length ?? 0) > 0 && !expiryDismissed && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-orange-700 font-semibold text-sm">
              <CalendarClock size={15} />{expiringBatches!.length} lote(s) próximos a vencer en los próximos 30 días
            </div>
            <button onClick={() => setExpiryDismissed(true)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-orange-100 transition-colors flex-shrink-0">
              <X size={14} className="text-orange-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {expiringBatches!.map((batch) => {
              const days = daysUntil(batch.expiresAt);
              return (
                <div key={batch.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-orange-100 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{batch.inventoryItem.product.name}</p>
                    <p className="text-xs text-gray-400">{batch.quantity} unid. · Vence {formatDate(batch.expiresAt)}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${expiryBadgeCls(days)}`}>
                    {days <= 0 ? "Vencido" : days === 1 ? "1 día" : `${days} días`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock bajo */}
      {lowStock.length > 0 && !alertDismissed && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
              <AlertTriangle size={15} />{lowStock.length} producto(s) con stock bajo
            </div>
            <button onClick={() => setAlertDismissed(true)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-amber-100 transition-colors flex-shrink-0">
              <X size={14} className="text-amber-500" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStock.map((i) => (
              <div key={i.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-amber-100">
                <span className="text-sm text-amber-800 truncate mr-3">{i.product.name}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${i.quantity === 0 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                  {i.quantity} / {i.alertThreshold}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + stock filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-mk-pink/20 focus:border-mk-pink/40 transition-all shadow-sm" />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {([
            { value: "", label: "Todos" },
            { value: "ok", label: "OK" },
            { value: "low", label: "Stock bajo" },
            { value: "out", label: "Agotado" },
          ] as const).map((f) => (
            <button key={f.value} onClick={() => setStockFilter(f.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                stockFilter === f.value ? "border-mk-pink bg-pink-50 text-mk-pink" : "border-gray-100 text-gray-500 hover:border-gray-200 bg-white"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 flex gap-8">
            {[8, 36, 20, 16, 16, 20].map((w, i) => <div key={i} className={`h-3 bg-gray-200 rounded-full w-${w}`} />)}
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-5 px-5 py-4 border-b border-gray-50">
              <div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-200 rounded-full w-40" />
                <div className="h-3 bg-gray-100 rounded-full w-24" />
              </div>
              <div className="h-5 bg-gray-100 rounded-full w-20" />
              <div className="h-3.5 bg-gray-100 rounded-full w-12" />
              <div className="h-5 bg-gray-100 rounded-full w-16" />
              <div className="flex gap-2 ml-auto">
                <div className="w-8 h-8 bg-gray-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
            <Package size={24} className="text-mk-pink/40" />
          </div>
          <p className="text-gray-500 font-medium">{items?.length === 0 ? "Sin productos en inventario" : "Sin resultados para ese filtro"}</p>
          {items?.length === 0 && <button onClick={() => setShowAdd(true)} className="mt-2 text-sm text-mk-pink underline underline-offset-2">Agregar el primero</button>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Producto</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Categoría</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Stock</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Próx. vencimiento</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems?.map((item) => {
                  const isLow = item.quantity <= item.alertThreshold;
                  const isEmpty = item.quantity === 0;
                  const img = getFirstImage(item.product.images ?? []);
                  const nextBatch = (item as any).batches?.[0];
                  const daysLeft = nextBatch ? daysUntil(nextBatch.expiresAt) : null;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-pink-50 to-rose-50 border border-gray-100">
                            {img
                              ? <img src={img} alt={item.product.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><span className="text-xs font-bold text-mk-pink/40">{item.product.name[0]}</span></div>
                            }
                          </div>
                          <span className="font-medium text-gray-900 truncate">{item.product.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-400 hidden sm:table-cell">{item.product.category}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-base font-bold ${isEmpty ? "text-red-500" : isLow ? "text-amber-500" : "text-gray-800"}`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center hidden md:table-cell">
                        {nextBatch ? (
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${daysLeft !== null && daysLeft <= 30 ? expiryBadgeCls(daysLeft) : "bg-gray-50 text-gray-400 border-gray-100"}`}>
                            {formatDate(nextBatch.expiresAt)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isEmpty ? "bg-red-50 text-red-500 border border-red-100" : isLow ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
                          {isEmpty ? "Agotado" : isLow ? "Stock bajo" : "OK"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => setAdjustItem({ id: item.id, name: item.product.name, quantity: item.quantity })}
                          className="px-3 py-1.5 text-xs font-semibold border-2 border-gray-100 rounded-lg hover:border-mk-pink hover:text-mk-pink transition-colors">
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adjustItem && <AdjustModal item={adjustItem} onClose={() => setAdjustItem(null)} onSuccess={onSuccess} />}
      {showAdd && <AddProductModal onClose={() => setShowAdd(false)} onSuccess={onSuccess} />}
    </div>
  );
}
