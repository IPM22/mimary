"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus, UserCheck, UserX, X, Users, Phone, Mail,
  Pencil, Clock, Check,
} from "lucide-react";

const inputCls = "mt-1 w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-mk-pink/50 transition-colors bg-gray-50 focus:bg-white";
const labelCls = "text-xs font-semibold text-gray-500 uppercase tracking-wide";

function RequestConsultantModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState(false);
  const submit = trpc.consultants.submitRequest.useMutation({
    onSuccess: () => { setSent(true); setTimeout(() => { onSuccess(); onClose(); }, 1800); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest">Equipo</p>
            <h2 className="text-lg font-bold text-gray-900">Solicitar consultora</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>
        {sent ? (
          <div className="py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <Check size={24} className="text-emerald-500" />
            </div>
            <p className="font-semibold text-gray-900">Solicitud enviada</p>
            <p className="text-sm text-gray-400 mt-1">El administrador la revisará pronto.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <p className="text-xs text-amber-700 font-medium">Esta solicitud será revisada por el administrador antes de crear la cuenta.</p>
            </div>
            <div>
              <label className={labelCls}>Nombre completo *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Ana Martínez" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Correo electrónico *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@email.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>WhatsApp</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 809 000 0000" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Notas (opcional)</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Razón u observaciones" className={inputCls} />
            </div>
            {submit.error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-xl">{submit.error.message}</p>}
            <button onClick={() => submit.mutate({ name, email, phone: phone || undefined, notes: notes || undefined })}
              disabled={!name || !email || submit.isPending}
              className="w-full py-3 bg-mk-pink text-white font-semibold rounded-xl disabled:opacity-60 hover:bg-pink-700">
              {submit.isPending ? "Enviando..." : "Enviar solicitud"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EditConsultantModal({ consultant, onClose, onSuccess }: {
  consultant: { id: string; name: string; email: string; phone: string | null; mkNumber: string | null; commission: number | null };
  onClose: () => void; onSuccess: () => void;
}) {
  const [name, setName] = useState(consultant.name);
  const [phone, setPhone] = useState(consultant.phone ?? "");
  const [mkNumber, setMkNumber] = useState(consultant.mkNumber ?? "");
  const [commission, setCommission] = useState(String(consultant.commission ?? ""));
  const update = trpc.consultants.update.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest">Editar</p>
            <h2 className="text-lg font-bold text-gray-900">{consultant.name}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Nombre completo</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Correo (no editable)</label>
            <input value={consultant.email} disabled className="mt-1 w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>WhatsApp</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 809..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Número MK</label>
              <input value={mkNumber} onChange={(e) => setMkNumber(e.target.value)} placeholder="Opcional" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Comisión %</label>
            <input type="number" min="0" max="100" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="Ej: 25" className={inputCls} />
          </div>
          {update.error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-xl">{update.error.message}</p>}
          <button onClick={() => update.mutate({ id: consultant.id, name: name || undefined, phone: phone || undefined, mkNumber: mkNumber || undefined, commission: commission ? Number(commission) : undefined })}
            disabled={update.isPending}
            className="w-full py-3 bg-mk-pink text-white font-semibold rounded-xl disabled:opacity-60 hover:bg-pink-700">
            {update.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConsultantCard({ consultant, onEdit }: {
  consultant: { id: string; name: string; email: string; phone: string | null; mkNumber: string | null; commission: any; active: boolean; avatar: string | null; createdAt: Date };
  onEdit: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: metrics } = trpc.consultants.metrics.useQuery({ consultantId: consultant.id });
  const update = trpc.consultants.update.useMutation({ onSuccess: () => utils.consultants.list.invalidate() });
  const initials = consultant.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className={`bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md flex flex-col
      ${consultant.active ? "border-gray-100" : "border-gray-200 opacity-60"}`}>
      {/* Header de la tarjeta */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {consultant.avatar
            ? <img src={consultant.avatar} alt={consultant.name} className="w-full h-full object-cover" />
            : <span className="text-mk-pink font-bold text-base">{initials}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900">{consultant.name}</h3>
            {!consultant.active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactiva</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-500 flex items-center gap-1"><Mail size={10} className="text-gray-400" />{consultant.email}</span>
            {consultant.phone && <span className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{consultant.phone}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {consultant.mkNumber && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">#{consultant.mkNumber}</span>}
            {consultant.commission != null && <span className="text-xs text-mk-gold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">{consultant.commission}% comisión</span>}
            <span className="text-xs text-gray-400">Desde {formatDate(consultant.createdAt)}</span>
          </div>
        </div>
        {/* Acciones */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-2 rounded-xl hover:bg-blue-50 text-gray-300 hover:text-blue-500 transition-colors" title="Editar">
            <Pencil size={15} />
          </button>
          <button onClick={() => update.mutate({ id: consultant.id, active: !consultant.active })} disabled={update.isPending}
            className={`p-2 rounded-xl transition-colors ${consultant.active ? "hover:bg-amber-50 text-gray-300 hover:text-amber-500" : "hover:bg-emerald-50 text-gray-300 hover:text-emerald-500"}`}
            title={consultant.active ? "Desactivar" : "Activar"}>
            {consultant.active ? <UserX size={15} /> : <UserCheck size={15} />}
          </button>
        </div>
      </div>

      {/* Métricas */}
      {metrics && (
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
          <div className="text-center bg-pink-50 rounded-xl py-2.5">
            <p className="text-sm font-bold text-mk-pink">{formatCurrency(metrics.salesThisMonth)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Este mes</p>
          </div>
          <div className="text-center bg-gray-50 rounded-xl py-2.5">
            <p className="text-sm font-bold text-gray-900">{metrics.clientCount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Clientas</p>
          </div>
          <div className="text-center bg-gray-50 rounded-xl py-2.5">
            <p className="text-sm font-bold text-gray-900">{metrics.pendingFollowUps}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Seguim.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConsultorasPage() {
  const { data: currentUser } = trpc.auth.me.useQuery();
  const [showRequest, setShowRequest] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const utils = trpc.useUtils();

  if (currentUser && currentUser.role !== "DIRECTORA" && currentUser.role !== "ADMIN") {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-gray-400 text-sm">Acceso no autorizado</p>
      </div>
    );
  }

  const { data: consultants, isLoading } = trpc.consultants.list.useQuery();
  const { data: myRequests } = trpc.consultants.myRequests.useQuery();
  const active = consultants?.filter((c) => c.active) ?? [];
  const editingConsultant = consultants?.find((c) => c.id === editing);
  const pendingRequests = myRequests?.filter((r) => r.status === "PENDING") ?? [];

  return (
    <div className="min-h-full p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest mb-1">Equipo</p>
          <h1 className="text-2xl font-bold text-gray-900">Consultoras</h1>
        </div>
        <div className="flex items-center gap-3">
          {consultants && <p className="text-sm text-gray-400 hidden sm:block">{active.length} activas · {consultants.length} total</p>}
          <button onClick={() => setShowRequest(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-mk-pink text-white font-semibold rounded-xl text-sm hover:bg-pink-700 transition-colors shadow-sm shadow-pink-200">
            <Plus size={15} /><span>Solicitar consultora</span>
          </button>
        </div>
      </div>

      {/* Solicitudes pendientes */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-amber-500" />
            <p className="text-sm font-semibold text-amber-700">{pendingRequests.length} solicitud(es) pendiente(s)</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {pendingRequests.map((r) => (
              <p key={r.id} className="text-xs text-amber-600">· {r.name} ({r.email}) — esperando aprobación del admin</p>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                  <div className="flex gap-1.5 mt-1">
                    <div className="h-5 bg-gray-100 rounded-full w-16" />
                    <div className="h-5 bg-gray-100 rounded-full w-12" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-12 bg-gray-100 rounded-xl" />
                <div className="h-12 bg-gray-100 rounded-xl" />
                <div className="h-12 bg-gray-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : consultants?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
            <Users size={26} className="text-mk-pink/40" />
          </div>
          <p className="text-gray-500 font-medium">Sin consultoras en tu equipo</p>
          <p className="text-sm text-gray-400 mt-1">Solicita agregar tu primera consultora</p>
          <button onClick={() => setShowRequest(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-mk-pink text-white font-semibold rounded-xl text-sm hover:bg-pink-700">
            <Plus size={14} /> Solicitar consultora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {consultants?.map((c) => (
            <ConsultantCard key={c.id} consultant={c as any} onEdit={() => setEditing(c.id)} />
          ))}
        </div>
      )}

      {showRequest && <RequestConsultantModal onClose={() => setShowRequest(false)} onSuccess={() => utils.consultants.myRequests.invalidate()} />}
      {editing && editingConsultant && (
        <EditConsultantModal consultant={editingConsultant as any} onClose={() => setEditing(null)} onSuccess={() => utils.consultants.list.invalidate()} />
      )}
    </div>
  );
}
