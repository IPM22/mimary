"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Users, ShieldCheck, UserCog, Clock, Plus, Search, X, Check, Trash2,
  KeyRound, ChevronLeft, ChevronRight, MoreVertical, UserCheck, UserX,
} from "lucide-react";

const inputCls = "mt-1 w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-mk-pink/50 transition-colors bg-gray-50 focus:bg-white";
const labelCls = "text-xs font-semibold text-gray-500 uppercase tracking-wide";

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-purple-50 text-purple-600 border-purple-100",
  DIRECTORA: "bg-pink-50 text-mk-pink border-pink-100",
  CONSULTORA: "bg-gray-50 text-gray-600 border-gray-100",
};
const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin", DIRECTORA: "Directora", CONSULTORA: "Consultora",
};

// ── Modal: Crear usuario ──────────────────────────────────────────────────────

function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"DIRECTORA" | "CONSULTORA">("CONSULTORA");
  const [parentId, setParentId] = useState("");
  const [phone, setPhone] = useState("");
  const [mkNumber, setMkNumber] = useState("");

  const { data: allUsers } = trpc.admin.listUsers.useQuery({ limit: 100 });
  const parents = allUsers?.users.filter((u) => u.role !== "ADMIN") ?? [];

  const create = trpc.admin.createUser.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest">Admin</p>
            <h2 className="text-lg font-bold text-gray-900">Nuevo usuario</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Nombre completo *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Ej: Ana García" />
          </div>
          <div>
            <label className={labelCls}>Correo electrónico *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="correo@ejemplo.com" />
          </div>
          <div>
            <label className={labelCls}>Contraseña temporal *</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label className={labelCls}>Rol</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(["DIRECTORA", "CONSULTORA"] as const).map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all
                    ${role === r ? "border-mk-pink bg-pink-50 text-mk-pink" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Directora / Padre (opcional)</label>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputCls}>
              <option value="">Sin superior</option>
              {parents.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({ROLE_LABEL[u.role]})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Teléfono</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+1 809..." />
            </div>
            <div>
              <label className={labelCls}>Número MK</label>
              <input value={mkNumber} onChange={(e) => setMkNumber(e.target.value)} className={inputCls} placeholder="Opcional" />
            </div>
          </div>
          {create.error && (
            <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-xl">{create.error.message}</p>
          )}
          <button
            onClick={() => create.mutate({ name, email, password, role, parentId: parentId || undefined, phone: phone || undefined, mkNumber: mkNumber || undefined })}
            disabled={!name || !email || password.length < 6 || create.isPending}
            className="w-full py-3 bg-mk-pink text-white font-semibold rounded-xl disabled:opacity-60 hover:bg-pink-700 transition-colors">
            {create.isPending ? "Creando..." : "Crear usuario"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Resetear contraseña ────────────────────────────────────────────────

function ResetPasswordModal({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const reset = trpc.admin.resetPassword.useMutation({ onSuccess: onClose });
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <KeyRound size={16} className="text-amber-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Resetear contraseña</p>
            <p className="text-xs text-gray-400">{userName}</p>
          </div>
        </div>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
          placeholder="Nueva contraseña (mín. 6 caracteres)" className={inputCls} />
        {reset.error && <p className="text-red-500 text-xs mt-2">{reset.error.message}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 border-2 border-gray-100 text-gray-600 font-semibold rounded-xl text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => reset.mutate({ id: userId, newPassword: pw })}
            disabled={pw.length < 6 || reset.isPending}
            className="flex-1 py-2.5 bg-amber-500 text-white font-semibold rounded-xl text-sm disabled:opacity-60 hover:bg-amber-600">
            {reset.isPending ? "Guardando..." : "Cambiar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Aprobar solicitud ──────────────────────────────────────────────────

function ApproveModal({ request, onClose, onSuccess }: { request: any; onClose: () => void; onSuccess: () => void }) {
  const [pw, setPw] = useState("");
  const approve = trpc.admin.approveRequest.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <UserCheck size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Aprobar solicitud</p>
            <p className="text-xs text-gray-400">{request.name} · {request.email}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Solicitada por <strong>{request.requester?.name}</strong>
          {request.parent && <> · Reporta a <strong>{request.parent.name}</strong></>}
        </p>
        <label className={labelCls}>Contraseña temporal *</label>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
          placeholder="Mínimo 6 caracteres" className={inputCls} />
        {approve.error && <p className="text-red-500 text-xs mt-2">{approve.error.message}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 border-2 border-gray-100 text-gray-600 font-semibold rounded-xl text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => approve.mutate({ requestId: request.id, password: pw })}
            disabled={pw.length < 6 || approve.isPending}
            className="flex-1 py-2.5 bg-emerald-500 text-white font-semibold rounded-xl text-sm disabled:opacity-60 hover:bg-emerald-600">
            {approve.isPending ? "Aprobando..." : "Aprobar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Usuarios ─────────────────────────────────────────────────────────────

function UsersTab() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ADMIN" | "DIRECTORA" | "CONSULTORA" | undefined>();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [resetUser, setResetUser] = useState<{ id: string; name: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = trpc.admin.listUsers.useQuery({
    search: search || undefined,
    role: roleFilter,
    page,
    limit: 20,
  });

  const toggleActive = trpc.admin.updateUser.useMutation({
    onSuccess: () => utils.admin.listUsers.invalidate(),
  });
  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: () => { setDeleteId(null); utils.admin.listUsers.invalidate(); },
  });

  return (
    <div className="space-y-4">
      {/* Barra superior */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre o correo..."
            className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-mk-pink/50 bg-gray-50 focus:bg-white" />
        </div>
        <div className="flex gap-2">
          {([undefined, "ADMIN", "DIRECTORA", "CONSULTORA"] as const).map((r) => (
            <button key={String(r)} onClick={() => { setRoleFilter(r); setPage(1); }}
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all whitespace-nowrap
                ${roleFilter === r ? "border-mk-pink bg-pink-50 text-mk-pink" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
              {r ? ROLE_LABEL[r] : "Todos"}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-mk-pink text-white font-semibold rounded-xl text-sm hover:bg-pink-700 transition-colors shadow-sm shadow-pink-200 flex-shrink-0">
          <Plus size={14} />
          Nuevo
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Cargando...</div>
        ) : (data?.users.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Sin resultados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Usuario</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Rol</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Superior</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Hijos</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${ROLE_BADGE[u.role]}`}>
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-500">{(u as any).parent?.name ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-500">{(u as any)._count?.children ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive.mutate({ id: u.id, active: !u.active })}
                        disabled={u.role === "ADMIN"}
                        title={u.active ? "Desactivar" : "Activar"}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border transition-all
                          ${u.active ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100" : "bg-red-50 text-red-500 border-red-100 hover:bg-red-100"}
                          disabled:opacity-50 disabled:cursor-not-allowed`}>
                        {u.active ? <><UserCheck size={10} />Activo</> : <><UserX size={10} />Inactivo</>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setResetUser({ id: u.id, name: u.name })}
                          title="Resetear contraseña"
                          className="p-1.5 rounded-lg hover:bg-amber-50 hover:text-amber-500 text-gray-400 transition-colors">
                          <KeyRound size={14} />
                        </button>
                        {u.role !== "ADMIN" && (
                          <button onClick={() => setDeleteId(u.id)}
                            title="Eliminar"
                            className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {(data?.pages ?? 0) > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">{data?.total} usuarios · página {page} de {data?.pages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft size={14} className="text-gray-500" />
              </button>
              <button onClick={() => setPage((p) => Math.min(data!.pages, p + 1))} disabled={page === data?.pages}
                className="p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight size={14} className="text-gray-500" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm delete */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4 mx-auto">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-center mb-1">¿Eliminar usuario?</h3>
            <p className="text-sm text-gray-400 text-center mb-5">Esta acción no se puede deshacer. Se eliminarán todos sus datos.</p>
            {deleteUser.error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-xl mb-3">{deleteUser.error.message}</p>}
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border-2 border-gray-100 text-gray-600 font-semibold rounded-xl text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => deleteUser.mutate({ id: deleteId })} disabled={deleteUser.isPending}
                className="flex-1 py-2.5 bg-red-500 text-white font-semibold rounded-xl text-sm disabled:opacity-60 hover:bg-red-600">
                {deleteUser.isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onSuccess={() => utils.admin.listUsers.invalidate()} />}
      {resetUser && <ResetPasswordModal userId={resetUser.id} userName={resetUser.name} onClose={() => setResetUser(null)} />}
    </div>
  );
}

// ── Tab: Solicitudes ──────────────────────────────────────────────────────────

function RequestsTab() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | undefined>("PENDING");
  const [approveTarget, setApproveTarget] = useState<any | null>(null);

  const { data: requests, isLoading } = trpc.admin.listRequests.useQuery({ status: filter });

  const reject = trpc.admin.rejectRequest.useMutation({
    onSuccess: () => { utils.admin.listRequests.invalidate(); utils.admin.stats.invalidate(); },
  });

  const STATUS_BADGE: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-600 border-amber-100",
    APPROVED: "bg-emerald-50 text-emerald-600 border-emerald-100",
    REJECTED: "bg-red-50 text-red-500 border-red-100",
  };
  const STATUS_LABEL: Record<string, string> = {
    PENDING: "Pendiente", APPROVED: "Aprobada", REJECTED: "Rechazada",
  };

  return (
    <div className="space-y-4">
      {/* Filtro estado */}
      <div className="flex gap-2 flex-wrap">
        {([undefined, "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
          <button key={String(s)} onClick={() => setFilter(s)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all
              ${filter === s ? "border-mk-pink bg-pink-50 text-mk-pink" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
            {s ? STATUS_LABEL[s] : "Todas"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
      ) : (requests?.length ?? 0) === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
          <Clock size={28} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Sin solicitudes {filter ? STATUS_LABEL[filter].toLowerCase() + "s" : ""}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests?.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-gray-900">{req.name}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ROLE_BADGE[req.role]}`}>
                      {ROLE_LABEL[req.role]}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGE[req.status]}`}>
                      {STATUS_LABEL[req.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{req.email}{req.phone && ` · ${req.phone}`}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {req.requester
                      ? <>Solicitada por <span className="font-medium text-gray-600">{req.requester.name}</span></>
                      : <span className="inline-flex items-center gap-1 text-mk-pink font-medium">Solicitud pública (login)</span>
                    }
                    {req.parent && <> · Reporta a <span className="font-medium text-gray-600">{req.parent.name}</span></>}
                  </p>
                  {req.reviewNote && (
                    <p className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-lg mt-2 italic">{req.reviewNote}</p>
                  )}
                </div>
                {req.status === "PENDING" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => reject.mutate({ requestId: req.id })}
                      disabled={reject.isPending}
                      className="p-2 rounded-xl border-2 border-red-100 text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50">
                      <X size={14} />
                    </button>
                    <button
                      onClick={() => setApproveTarget(req)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors">
                      <Check size={12} /> Aprobar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {approveTarget && (
        <ApproveModal
          request={approveTarget}
          onClose={() => setApproveTarget(null)}
          onSuccess={() => { utils.admin.listRequests.invalidate(); utils.admin.stats.invalidate(); }}
        />
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState<"users" | "requests">("users");
  const { data: stats } = trpc.admin.stats.useQuery();

  return (
    <div className="min-h-full p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="pt-1">
        <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest mb-1">Panel</p>
        <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total usuarios", value: stats?.totalUsers ?? 0, icon: Users, bg: "bg-pink-50", text: "text-mk-pink" },
          { label: "Directoras", value: stats?.roleCount?.DIRECTORA ?? 0, icon: UserCog, bg: "bg-amber-50", text: "text-amber-500" },
          { label: "Consultoras", value: stats?.roleCount?.CONSULTORA ?? 0, icon: Users, bg: "bg-blue-50", text: "text-blue-500" },
          { label: "Solicitudes pendientes", value: stats?.pendingRequests ?? 0, icon: Clock, bg: "bg-emerald-50", text: "text-emerald-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon size={16} className={s.text} />
            </div>
            <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        <button onClick={() => setTab("users")}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all
            ${tab === "users" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <span className="flex items-center gap-2"><Users size={14} />Usuarios</span>
        </button>
        <button onClick={() => setTab("requests")}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all relative
            ${tab === "requests" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <span className="flex items-center gap-2">
            <Clock size={14} />
            Solicitudes
            {(stats?.pendingRequests ?? 0) > 0 && (
              <span className="bg-mk-pink text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {stats!.pendingRequests}
              </span>
            )}
          </span>
        </button>
      </div>

      {tab === "users" ? <UsersTab /> : <RequestsTab />}
    </div>
  );
}
