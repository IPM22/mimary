"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatDate } from "@/lib/utils";
import { Plus, CheckCircle, Clock, Phone, MessageCircle, Package, Home, X, CalendarCheck } from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string; text: string; border: string }> = {
  CALL:      { label: "Llamada",    icon: Phone,          bg: "bg-blue-50",    text: "text-blue-500",     border: "border-blue-200" },
  WHATSAPP:  { label: "WhatsApp",   icon: MessageCircle,  bg: "bg-emerald-50", text: "text-emerald-500",  border: "border-emerald-200" },
  VISIT:     { label: "Visita",     icon: Home,           bg: "bg-purple-50",  text: "text-purple-500",   border: "border-purple-200" },
  DELIVERY:  { label: "Entrega",    icon: Package,        bg: "bg-orange-50",  text: "text-orange-500",   border: "border-orange-200" },
  POST_SALE: { label: "Post-venta", icon: CheckCircle,    bg: "bg-pink-50",    text: "text-mk-pink",      border: "border-pink-200" },
  BIRTHDAY:  { label: "Cumpleaños", icon: CalendarCheck,  bg: "bg-yellow-50",  text: "text-yellow-600",   border: "border-yellow-200" },
  OTHER:     { label: "Otro",       icon: Clock,          bg: "bg-gray-100",   text: "text-gray-500",     border: "border-gray-200" },
};

const inputCls = "mt-1 w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-mk-pink/50 transition-colors bg-gray-50 focus:bg-white";
const labelCls = "text-xs font-semibold text-gray-500 uppercase tracking-wide";

function NewFollowUpModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [type, setType] = useState("WHATSAPP");
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const { data: clients } = trpc.clients.list.useQuery({ limit: 100 });
  const create = trpc.followUps.create.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest">Agendar</p>
            <h2 className="text-lg font-bold text-gray-900">Nuevo seguimiento</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Tipo de contacto</label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const active = type === key;
                return (
                  <button key={key} type="button" onClick={() => setType(key)}
                    className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all flex flex-col items-center gap-1
                      ${active ? `${cfg.bg} ${cfg.text} ${cfg.border}` : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                    <Icon size={14} />{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className={labelCls}>Cliente (opcional)</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
              <option value="">Sin cliente específico</option>
              {clients?.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Fecha y hora *</label>
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nota</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="¿Qué hay que hacer?" className={inputCls} />
          </div>
          <button onClick={() => create.mutate({ type: type as any, clientId: clientId || undefined, scheduledDate: date, note })}
            disabled={!date || create.isPending}
            className="w-full py-3 bg-mk-pink text-white font-semibold rounded-xl disabled:opacity-60 hover:bg-pink-700 transition-colors">
            {create.isPending ? "Guardando..." : "Guardar seguimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SeguimientosPage() {
  const [filter, setFilter] = useState<"PENDING" | "DONE">("PENDING");
  const [showForm, setShowForm] = useState(false);
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.followUps.list.useQuery({ status: filter, limit: 50 });
  const complete = trpc.followUps.complete.useMutation({ onSuccess: () => utils.followUps.list.invalidate() });
  const now = new Date();

  return (
    <div className="min-h-full p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest mb-1">Agenda</p>
          <h1 className="text-2xl font-bold text-gray-900">Seguimientos</h1>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-mk-pink text-white font-semibold rounded-xl text-sm hover:bg-pink-700 transition-colors shadow-sm shadow-pink-200">
          <Plus size={15} /><span>Nuevo seguimiento</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {(["PENDING", "DONE"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all
              ${filter === f ? "bg-mk-pink text-white shadow-sm shadow-pink-200" : "bg-white border border-gray-200 text-gray-600 hover:border-mk-pink hover:text-mk-pink"}`}>
            {f === "PENDING" ? "Pendientes" : "Completados"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-0.5">
                  <div className="h-3.5 bg-gray-200 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : data?.followUps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
            <CalendarCheck size={24} className="text-mk-pink/40" />
          </div>
          <p className="text-gray-500 font-medium">
            {filter === "PENDING" ? "Sin seguimientos pendientes 🎉" : "Sin seguimientos completados"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {data?.followUps.map((f) => {
            const cfg = TYPE_CONFIG[f.type] ?? TYPE_CONFIG.OTHER;
            const Icon = cfg.icon;
            const overdue = f.status === "PENDING" && new Date(f.scheduledDate) < now;
            return (
              <div key={f.id} className={`bg-white rounded-2xl p-4 border shadow-sm transition-all hover:shadow-md
                ${overdue ? "border-red-200 bg-red-50/30" : "border-gray-100"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    <Icon size={16} className={cfg.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-gray-900">{cfg.label}</span>
                      {overdue && (
                        <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Vencido</span>
                      )}
                    </div>
                    {f.client && (
                      <p className="text-sm text-gray-600 font-medium truncate">{f.client.name}</p>
                    )}
                    {f.note && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{f.note}</p>}
                    <p className="text-xs text-gray-400 mt-2 font-medium">{formatDate(f.scheduledDate)}</p>
                  </div>
                  {f.status === "PENDING" && (
                    <button onClick={() => complete.mutate({ id: f.id })} disabled={complete.isPending}
                      className="w-8 h-8 flex items-center justify-center hover:bg-emerald-50 rounded-xl text-gray-300 hover:text-emerald-500 transition-colors flex-shrink-0"
                      title="Marcar completado">
                      <CheckCircle size={20} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <NewFollowUpModal onClose={() => setShowForm(false)} onSuccess={() => utils.followUps.list.invalidate()} />}
    </div>
  );
}
