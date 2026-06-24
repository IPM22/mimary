"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus, ShoppingBag, X, ChevronLeft, ChevronRight, Receipt, Check,
  Package, DollarSign, CalendarDays, Banknote,
} from "lucide-react";
import { SaleFormModal } from "@/components/sales/SaleFormModal";

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
const INSTALLMENT_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendiente", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  PAID:    { label: "Pagado",    cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
};

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

// ── Add Payment Modal ────────────────────────────────────────────────────────
function AddPaymentForm({ saleId, remaining, onSuccess }: { saleId: string; remaining: number; onSuccess: () => void }) {
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [method, setMethod] = useState<"CASH" | "TRANSFER" | "CARD" | "CREDIT">("CASH");
  const [note, setNote] = useState("");
  const utils = trpc.useUtils();

  const addPayment = trpc.sales.addPayment.useMutation({
    onSuccess: () => {
      utils.sales.list.invalidate();
      utils.sales.byId.invalidate({ id: saleId });
      onSuccess();
    },
  });

  return (
    <div className="border border-emerald-100 bg-emerald-50/30 rounded-2xl p-4 space-y-3">
      <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
        <Banknote size={12} /> Registrar abono
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Monto</label>
          <input
            type="number" min="0.01" step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-emerald-400/60 font-semibold"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Notas</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Opcional"
            className="mt-1 w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-300"
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {(["CASH", "TRANSFER", "CARD", "CREDIT"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMethod(m)}
            className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl border-2 text-[11px] font-semibold transition-all ${method === m ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
            <span>{PAYMENT_ICONS[m]}</span>{PAYMENT_LABELS[m]}
          </button>
        ))}
      </div>
      <button
        onClick={() => addPayment.mutate({ saleId, amount: parseFloat(amount) || 0, paymentMethod: method, note: note || undefined })}
        disabled={addPayment.isPending || !parseFloat(amount) || parseFloat(amount) > remaining + 0.01}
        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2">
        {addPayment.isPending ? "Registrando..." : <><Check size={14} /> Registrar abono</>}
      </button>
      {addPayment.error && <p className="text-red-500 text-xs">{addPayment.error.message}</p>}
    </div>
  );
}

// ── Sale detail modal ───────────────────────────────────────────────────────
function SaleDetailModal({ saleId, onClose, onStatusChange }: { saleId: string; onClose: () => void; onStatusChange: (id: string, status: string) => void }) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const { data: sale, isLoading } = trpc.sales.byId.useQuery({ id: saleId });

  if (isLoading || !sale) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-lg shadow-2xl animate-pulse">
          <div className="h-6 bg-gray-200 rounded-xl w-32 mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const paidAmount = Number(sale.paidAmount);
  const total = Number(sale.total);
  const remaining = total - paidAmount;
  const hasBalance = remaining > 0.01 && sale.status !== "CANCELLED";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest">Detalle</p>
            <h2 className="text-lg font-bold text-gray-900">Venta</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>

        <div className="space-y-4">
          {/* Summary grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Cliente</p>
              <p className="font-semibold text-gray-900">{sale.client?.name ?? (sale as any).clientName ?? "Sin cliente"}</p>
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

          {/* Balance */}
          <div className={`rounded-xl px-4 py-3 border flex items-center justify-between ${hasBalance ? "bg-amber-50 border-amber-100" : "bg-pink-50 border-pink-100"}`}>
            <div className="space-y-0.5">
              <p className="text-xs text-gray-500">Total venta</p>
              <p className="text-xl font-bold text-mk-pink">{formatCurrency(total)}</p>
            </div>
            {paidAmount > 0 && (
              <div className="text-right space-y-0.5">
                <p className="text-xs text-gray-500">Pagado</p>
                <p className="text-sm font-bold text-emerald-600">{formatCurrency(paidAmount)}</p>
                {hasBalance && <p className="text-xs text-amber-700 font-semibold">Pendiente: {formatCurrency(remaining)}</p>}
              </div>
            )}
          </div>

          {/* Installments */}
          {sale.installments && sale.installments.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-100">
                <CalendarDays size={13} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cuotas</span>
              </div>
              <div className="divide-y divide-gray-50">
                {sale.installments.map((inst: any) => (
                  <div key={inst.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">{inst.number}</span>
                      <span className="text-sm text-gray-700">{formatDate(inst.dueDate)}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(inst.amount)}</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${INSTALLMENT_STATUS_CFG[inst.status]?.cls}`}>
                        {INSTALLMENT_STATUS_CFG[inst.status]?.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
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

          {/* Payment history */}
          {sale.payments && sale.payments.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-100">
                <DollarSign size={13} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Abonos realizados</span>
              </div>
              <div className="divide-y divide-gray-50">
                {sale.payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="text-sm text-gray-700">{formatDate(p.createdAt)} · {PAYMENT_ICONS[p.paymentMethod]} {PAYMENT_LABELS[p.paymentMethod]}</p>
                      {p.note && <p className="text-xs text-gray-400">{p.note}</p>}
                    </div>
                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(p.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sale.notes && (
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">Notas</p>
              <p className="text-sm text-gray-700">{sale.notes}</p>
            </div>
          )}

          {/* Add payment */}
          {hasBalance && !showPaymentForm && (
            <button
              onClick={() => setShowPaymentForm(true)}
              className="w-full py-2.5 border-2 border-emerald-200 text-emerald-700 font-semibold rounded-xl text-sm hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
              <Banknote size={15} /> Agregar abono
            </button>
          )}

          {hasBalance && showPaymentForm && (
            <AddPaymentForm
              saleId={sale.id}
              remaining={remaining}
              onSuccess={() => setShowPaymentForm(false)}
            />
          )}
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
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
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
    onSuccess: () => { utils.sales.list.invalidate(); },
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
                {data?.sales.map((sale) => {
                  const balance = Number(sale.total) - Number((sale as any).paidAmount ?? 0);
                  return (
                    <tr key={sale.id} onClick={() => setSelectedSaleId(sale.id)}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                      <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">{formatDate(sale.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
                            <ShoppingBag size={13} className="text-mk-pink" />
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">{sale.client?.name ?? (sale as any).clientName ?? "Sin cliente"}</span>
                            {balance > 0.01 && <p className="text-[11px] text-amber-600 font-semibold">Pendiente: {formatCurrency(balance)}</p>}
                          </div>
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden divide-y divide-gray-50">
            {data?.sales.map((sale) => {
              const balance = Number(sale.total) - Number((sale as any).paidAmount ?? 0);
              return (
                <div key={sale.id} onClick={() => setSelectedSaleId(sale.id)} className="p-4 cursor-pointer active:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag size={16} className="text-mk-pink" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{sale.client?.name ?? (sale as any).clientName ?? "Sin cliente"}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(sale.createdAt)} · {PAYMENT_LABELS[sale.paymentMethod]}</p>
                      {balance > 0.01 && <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Pendiente: {formatCurrency(balance)}</p>}
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1.5">
                      <p className="font-bold text-gray-900">{formatCurrency(sale.total)}</p>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block ${STATUS_CFG[sale.status]?.cls}`}>
                        {STATUS_CFG[sale.status]?.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
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

      {showForm && <SaleFormModal onClose={() => setShowForm(false)} onSuccess={() => utils.sales.list.invalidate()} />}
      {selectedSaleId && (
        <SaleDetailModal
          saleId={selectedSaleId}
          onClose={() => setSelectedSaleId(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
