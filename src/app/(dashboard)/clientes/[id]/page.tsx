"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft, Phone, Mail, MapPin, Cake, Tag, Sparkles,
  ShoppingBag, CalendarCheck, Pencil, X, Check, CheckCircle,
  MessageCircle, Package, Home, Clock, DollarSign, CreditCard,
  ChevronDown, ChevronUp,
} from "lucide-react";

const inputCls = "mt-1 w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-mk-pink/50 transition-colors bg-gray-50 focus:bg-white";
const labelCls = "text-xs font-semibold text-gray-500 uppercase tracking-wide";

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING:   { label: "Pendiente",  cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  PAID:      { label: "Pagado",     cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  DELIVERED: { label: "Entregado",  cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  CANCELLED: { label: "Cancelado",  cls: "bg-red-50 text-red-600 border border-red-200" },
};

const INST_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendiente", cls: "bg-amber-50 text-amber-700" },
  PAID:    { label: "Pagado",    cls: "bg-emerald-50 text-emerald-700" },
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo", TRANSFER: "Transferencia", CARD: "Tarjeta", CREDIT: "Crédito",
};
const PAYMENT_ICONS: Record<string, string> = {
  CASH: "💵", TRANSFER: "🏦", CARD: "💳", CREDIT: "📋",
};

const FOLLOWUP_ICONS: Record<string, React.ElementType> = {
  CALL: Phone, WHATSAPP: MessageCircle, VISIT: Home,
  DELIVERY: Package, POST_SALE: CheckCircle, BIRTHDAY: Cake, PAYMENT: DollarSign, OTHER: Clock,
};
const FOLLOWUP_LABELS: Record<string, string> = {
  CALL: "Llamada", WHATSAPP: "WhatsApp", VISIT: "Visita",
  DELIVERY: "Entrega", POST_SALE: "Post-venta", BIRTHDAY: "Cumpleaños", PAYMENT: "Pago de cuota", OTHER: "Otro",
};

// ── Add Payment Modal ────────────────────────────────────────────────────────
function AddPaymentModal({ sale, onClose, onSuccess }: { sale: any; onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"CASH" | "TRANSFER" | "CARD" | "CREDIT">("CASH");
  const [note, setNote] = useState("");

  const remaining = Number(sale.total) - Number(sale.paidAmount);
  const addPayment = trpc.sales.addPayment.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });

  const amountNum = parseFloat(amount) || 0;
  const canSubmit = amountNum > 0 && amountNum <= remaining + 0.01;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest">Registrar</p>
            <h2 className="text-lg font-bold text-gray-900">Abono de pago</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="bg-amber-50 rounded-xl px-4 py-3 border border-amber-100 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total venta</span>
            <span className="font-semibold text-gray-800">{formatCurrency(sale.total)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500">Ya pagado</span>
            <span className="font-semibold text-emerald-700">{formatCurrency(sale.paidAmount)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1 pt-1 border-t border-amber-200">
            <span className="font-semibold text-amber-700">Saldo pendiente</span>
            <span className="font-bold text-amber-700">{formatCurrency(remaining)}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Monto del abono (RD$)</label>
            <input
              type="number" min="1" step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Máx. ${formatCurrency(remaining)}`}
              className={inputCls}
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls + " flex items-center gap-1.5 mb-2"}><CreditCard size={10} /> Método de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {(["CASH", "TRANSFER", "CARD", "CREDIT"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${method === m ? "border-mk-pink bg-pink-50 text-mk-pink" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                  <span>{PAYMENT_ICONS[m]}</span>{PAYMENT_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Nota (opcional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: pago en efectivo" className={inputCls} />
          </div>

          {addPayment.error && <p className="text-red-500 text-xs">{addPayment.error.message}</p>}

          <button
            onClick={() => addPayment.mutate({ saleId: sale.id, amount: amountNum, paymentMethod: method, note: note || undefined })}
            disabled={!canSubmit || addPayment.isPending}
            className="w-full py-3 bg-mk-pink text-white font-semibold rounded-xl disabled:opacity-60 hover:bg-pink-700 flex items-center justify-center gap-2">
            {addPayment.isPending ? "Registrando..." : <><Check size={15} /> Registrar abono</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sale row with expandable detail ─────────────────────────────────────────
function SaleRow({ sale, onAbonar }: { sale: any; onAbonar: (sale: any) => void }) {
  const [expanded, setExpanded] = useState(false);
  const remaining = Number(sale.total) - Number(sale.paidAmount ?? 0);
  const hasBalance = remaining > 0.01 && sale.status !== "CANCELLED";
  const hasInstallments = (sale.installments?.length ?? 0) > 0;

  return (
    <>
      <tr
        className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${expanded ? "bg-gray-50/30" : ""}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(sale.createdAt)}</td>
        <td className="px-5 py-3 hidden sm:table-cell">
          <div className="flex gap-1 flex-wrap">
            {sale.items.slice(0, 2).map((item: any, i: number) => (
              <span key={i} className="text-[11px] bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {item.product?.name} ×{item.quantity}
              </span>
            ))}
            {sale.items.length > 2 && <span className="text-[11px] text-gray-400">+{sale.items.length - 2}</span>}
          </div>
        </td>
        <td className="px-5 py-3 text-right whitespace-nowrap">
          <p className="font-bold text-gray-900">{formatCurrency(sale.total)}</p>
          {hasBalance && <p className="text-[11px] text-amber-600 font-semibold">Debe: {formatCurrency(remaining)}</p>}
        </td>
        <td className="px-5 py-3 text-center">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_CFG[sale.status]?.cls}`}>
            {STATUS_CFG[sale.status]?.label}
          </span>
        </td>
        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-2">
            {hasBalance && (
              <button
                onClick={() => onAbonar(sale)}
                className="flex items-center gap-1 px-2.5 py-1 bg-mk-pink text-white text-[11px] font-bold rounded-lg hover:bg-pink-700 transition-colors">
                <DollarSign size={10} /> Abonar
              </button>
            )}
            <span className="text-gray-300">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </div>
        </td>
      </tr>

      {expanded && hasInstallments && (
        <tr>
          <td colSpan={5} className="px-5 pb-3 pt-0">
            <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-white">
                <DollarSign size={12} className="text-mk-pink" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan de cuotas</span>
              </div>
              <div className="divide-y divide-gray-100">
                {sale.installments.map((inst: any) => (
                  <div key={inst.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-16">Cuota {inst.number}</span>
                      <span className="text-xs text-gray-500">{formatDate(inst.dueDate)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700">{formatCurrency(inst.amount)}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${INST_STATUS_CFG[inst.status]?.cls}`}>
                        {INST_STATUS_CFG[inst.status]?.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Edit client modal ────────────────────────────────────────────────────────
function EditClientModal({ client, onClose, onSuccess }: { client: any; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(client.name ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [address, setAddress] = useState(client.address ?? "");
  const [skinType, setSkinType] = useState(client.skinType ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");
  const [birthday, setBirthday] = useState(client.birthday ? new Date(client.birthday).toISOString().split("T")[0] : "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(client.tags ?? []);

  const update = trpc.clients.update.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(""); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest">Editar</p>
            <h2 className="text-lg font-bold text-gray-900">{client.name}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Nombre completo *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>WhatsApp / Teléfono</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 809 000 0000" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Dirección</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tipo de piel</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {["Normal", "Seca", "Mixta", "Grasa", "Sensible"].map((tipo) => (
                <button key={tipo} type="button" onClick={() => setSkinType(skinType === tipo ? "" : tipo)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${skinType === tipo ? "border-mk-pink bg-pink-50 text-mk-pink" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                  {tipo}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Cumpleaños</label>
              <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Etiquetas</label>
              <div className="flex gap-2 mt-1">
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="VIP, frecuente..." className="flex-1 px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-mk-pink/50" />
                <button type="button" onClick={addTag} className="px-3 py-2.5 bg-gray-100 rounded-xl text-sm font-semibold hover:bg-gray-200">+</button>
              </div>
            </div>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-pink-50 text-mk-pink text-xs rounded-full border border-pink-100">
                  {tag}<button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))}><X size={11} /></button>
                </span>
              ))}
            </div>
          )}
          <div>
            <label className={labelCls}>Notas internas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} />
          </div>
          {update.error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-xl">{update.error.message}</p>}
          <button onClick={() => update.mutate({ id: client.id, name, phone: phone || undefined, email: email || undefined, address: address || undefined, skinType: skinType || undefined, notes: notes || undefined, birthday: birthday || undefined, tags })}
            disabled={!name || update.isPending}
            className="w-full py-3 bg-mk-pink text-white font-semibold rounded-xl disabled:opacity-60 hover:bg-pink-700">
            {update.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [showEdit, setShowEdit] = useState(false);
  const [tab, setTab] = useState<"ventas" | "seguimientos">("ventas");
  const [paymentSale, setPaymentSale] = useState<any>(null);

  const { data: client, isLoading } = trpc.clients.byId.useQuery({ id });
  const complete = trpc.followUps.complete.useMutation({ onSuccess: () => utils.clients.byId.invalidate({ id }) });

  if (isLoading) {
    return (
      <div className="min-h-full p-4 md:p-8 space-y-5 animate-pulse">
        <div className="h-8 w-32 bg-gray-200 rounded-xl" />
        <div className="h-40 bg-white rounded-2xl border border-gray-100" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-white rounded-2xl border border-gray-100" />
          <div className="lg:col-span-2 h-64 bg-white rounded-2xl border border-gray-100" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-3">
        <p className="text-gray-400">Clienta no encontrada</p>
        <button onClick={() => router.back()} className="text-sm text-mk-pink underline">Volver</button>
      </div>
    );
  }

  const initials = client.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const pendingFollowUps = client.followUps.filter((f: any) => f.status === "PENDING");
  const totalSpent = client.sales.reduce((s: number, sale: any) => s + Number(sale.total), 0);

  return (
    <div className="min-h-full p-4 md:p-8 space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors flex-shrink-0">
          <ArrowLeft size={16} className="text-gray-500" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest">Clienta</p>
          <h1 className="text-xl font-bold text-gray-900 truncate">{client.name}</h1>
        </div>
        <button onClick={() => setShowEdit(true)}
          className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-100 text-gray-600 font-semibold rounded-xl text-sm hover:border-mk-pink hover:text-mk-pink transition-colors">
          <Pencil size={14} /> Editar
        </button>
      </div>

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna izquierda: info */}
        <div className="space-y-4">
          {/* Avatar + stats rápidas */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-200 to-rose-300 flex items-center justify-center flex-shrink-0 shadow-sm shadow-pink-100">
                <span className="text-white font-bold text-xl">{initials}</span>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg leading-tight">{client.name}</p>
                {client.user && <p className="text-xs text-gray-400 mt-0.5">Consultora: {(client.user as any).name}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center bg-pink-50 rounded-xl py-2.5">
                <p className="text-sm font-bold text-mk-pink">{formatCurrency(totalSpent)}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Total</p>
              </div>
              <div className="text-center bg-gray-50 rounded-xl py-2.5">
                <p className="text-sm font-bold text-gray-900">{client.sales.length}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Ventas</p>
              </div>
              <div className="text-center bg-gray-50 rounded-xl py-2.5">
                <p className="text-sm font-bold text-gray-900">{pendingFollowUps.length}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Seguim.</p>
              </div>
            </div>
          </div>

          {/* Datos de contacto */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Phone size={14} className="text-mk-pink" /> Contacto
            </h3>
            {client.phone && (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0"><Phone size={12} className="text-emerald-500" /></div>
                <span className="text-sm text-gray-700">{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0"><Mail size={12} className="text-blue-500" /></div>
                <span className="text-sm text-gray-700 truncate">{client.email}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0"><MapPin size={12} className="text-gray-400" /></div>
                <span className="text-sm text-gray-700">{client.address}</span>
              </div>
            )}
            {client.birthday && (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0"><Cake size={12} className="text-mk-pink" /></div>
                <span className="text-sm text-gray-700">{formatDate(client.birthday)}</span>
              </div>
            )}
            {!client.phone && !client.email && !client.address && !client.birthday && (
              <p className="text-xs text-gray-400">Sin datos de contacto</p>
            )}
          </div>

          {/* Perfil */}
          {(client.skinType || client.source || client.tags?.length > 0 || client.notes) && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Sparkles size={14} className="text-mk-pink" /> Perfil
              </h3>
              {client.skinType && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-20">Tipo piel</span>
                  <span className="text-xs font-semibold bg-pink-50 text-mk-pink px-2.5 py-1 rounded-full border border-pink-100">{client.skinType}</span>
                </div>
              )}
              {client.source && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-20">Llegó por</span>
                  <span className="text-xs font-medium text-gray-600">{client.source}</span>
                </div>
              )}
              {client.tags?.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-xs text-gray-400 w-20 mt-0.5 flex-shrink-0"><Tag size={11} className="inline mr-1" />Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {client.tags.map((tag: string) => (
                      <span key={tag} className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-100">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {client.notes && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Notas</p>
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2 leading-relaxed">{client.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Columna derecha: ventas + seguimientos */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
            <button onClick={() => setTab("ventas")}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${tab === "ventas" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <ShoppingBag size={14} /> Ventas ({client.sales.length})
            </button>
            <button onClick={() => setTab("seguimientos")}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${tab === "seguimientos" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <CalendarCheck size={14} /> Seguimientos ({client.followUps.length})
            </button>
          </div>

          {tab === "ventas" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {client.sales.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <ShoppingBag size={28} className="text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">Sin ventas registradas</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Fecha</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Productos</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {client.sales.map((sale: any) => (
                      <SaleRow key={sale.id} sale={sale} onAbonar={setPaymentSale} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === "seguimientos" && (
            <div className="space-y-3">
              {client.followUps.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16">
                  <CalendarCheck size={28} className="text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">Sin seguimientos registrados</p>
                </div>
              ) : (
                client.followUps.map((f: any) => {
                  const Icon = FOLLOWUP_ICONS[f.type] ?? Clock;
                  const overdue = f.status === "PENDING" && new Date(f.scheduledDate) < new Date();
                  return (
                    <div key={f.id} className={`bg-white rounded-2xl p-4 border shadow-sm flex items-start gap-3 ${overdue ? "border-red-200 bg-red-50/20" : "border-gray-100"}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${f.status === "DONE" ? "bg-gray-100" : "bg-pink-50"}`}>
                        <Icon size={15} className={f.status === "DONE" ? "text-gray-400" : "text-mk-pink"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{FOLLOWUP_LABELS[f.type] ?? "Seguimiento"}</span>
                          {overdue && <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Vencido</span>}
                          {f.status === "DONE" && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1"><Check size={10} /> Completado</span>}
                        </div>
                        {f.note && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{f.note}</p>}
                        <p className="text-xs text-gray-400 mt-1">{formatDate(f.scheduledDate)}</p>
                      </div>
                      {f.status === "PENDING" && (
                        <button onClick={() => complete.mutate({ id: f.id })} disabled={complete.isPending}
                          className="w-8 h-8 flex items-center justify-center hover:bg-emerald-50 rounded-xl text-gray-300 hover:text-emerald-500 transition-colors flex-shrink-0"
                          title="Marcar completado">
                          <CheckCircle size={18} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <EditClientModal
          client={client}
          onClose={() => setShowEdit(false)}
          onSuccess={() => utils.clients.byId.invalidate({ id })}
        />
      )}

      {paymentSale && (
        <AddPaymentModal
          sale={paymentSale}
          onClose={() => setPaymentSale(null)}
          onSuccess={() => utils.clients.byId.invalidate({ id })}
        />
      )}
    </div>
  );
}
