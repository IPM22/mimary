"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Inbox, Phone, MessageSquare, ChevronLeft, ChevronRight,
  CheckCircle, ShoppingCart, X, Clock, User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type Status = "PENDING" | "CONTACTED" | "SOLD" | "DISMISSED";

const STATUS_LABEL: Record<Status, string> = {
  PENDING:   "Pendiente",
  CONTACTED: "Contactado",
  SOLD:      "Vendido",
  DISMISSED: "Descartado",
};

const STATUS_COLOR: Record<Status, string> = {
  PENDING:   "bg-amber-50 text-amber-600 border-amber-200",
  CONTACTED: "bg-blue-50 text-blue-600 border-blue-200",
  SOLD:      "bg-emerald-50 text-emerald-600 border-emerald-200",
  DISMISSED: "bg-gray-100 text-gray-500 border-gray-200",
};

function waLink(phone: string, productName: string, clientName: string) {
  const digits = phone.replace(/\D/g, "");
  const e164 = /^(809|829|849)/.test(digits) ? "1" + digits : digits;
  const text = `Hola ${clientName}, te escribo por el producto "${productName}" que solicitaste a través de MiMary.`;
  return `https://wa.me/${e164}?text=${encodeURIComponent(text)}`;
}

const WaIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function SolicitudesPage() {
  const [statusFilter, setStatusFilter] = useState<Status | undefined>("PENDING");
  const [page, setPage] = useState(1);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.requests.list.useQuery(
    { status: statusFilter, page, limit: 20 },
    { staleTime: 30_000 }
  );
  const { data: pendingCount } = trpc.requests.pendingCount.useQuery(undefined, { staleTime: 30_000 });

  const updateStatus = trpc.requests.updateStatus.useMutation({
    onSuccess: () => {
      utils.requests.list.invalidate();
      utils.requests.pendingCount.invalidate();
    },
  });

  const filters: { value: Status | undefined; label: string }[] = [
    { value: undefined,    label: "Todas" },
    { value: "PENDING",    label: `Pendientes${(pendingCount ?? 0) > 0 ? ` (${pendingCount})` : ""}` },
    { value: "CONTACTED",  label: "Contactadas" },
    { value: "SOLD",       label: "Vendidas" },
    { value: "DISMISSED",  label: "Descartadas" },
  ];

  return (
    <div className="min-h-full p-4 md:p-8 max-w-6xl mx-auto space-y-5 pb-24 md:pb-8">
      {/* Header */}
      <div className="pt-1 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest mb-1">Catálogo público</p>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes</h1>
        </div>
        {(pendingCount ?? 0) > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold px-3 py-1.5 rounded-xl">
            <Clock size={14} />
            {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={String(f.value)}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all whitespace-nowrap
              ${statusFilter === f.value
                ? "border-mk-pink bg-pink-50 text-mk-pink"
                : "border-gray-100 text-gray-500 hover:border-gray-200 bg-white"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (data?.requests.length ?? 0) === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
          <Inbox size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">
            No hay solicitudes {statusFilter ? STATUS_LABEL[statusFilter].toLowerCase() + "s" : ""}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.requests.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 flex gap-4">
                {/* Imagen del producto */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                  {req.product.images[0] ? (
                    <img src={req.product.images[0]} alt={req.product.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200 text-2xl">📦</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">{req.product.name}</p>
                    <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[req.status as Status]}`}>
                      {STATUS_LABEL[req.status as Status]}
                    </span>
                  </div>

                  {/* Cliente */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-sm text-gray-700">
                      <User size={13} className="text-gray-400" />
                      {req.clientName}
                    </span>
                    {req.clientPhone && (
                      <a
                        href={waLink(req.clientPhone, req.product.name, req.clientName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-semibold text-[#25D366] hover:text-[#1ebe5d] transition-colors"
                      >
                        <WaIcon /> {req.clientPhone}
                      </a>
                    )}
                  </div>

                  {/* Mensaje */}
                  {req.message && (
                    <div className="flex items-start gap-1.5 mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5">
                      <MessageSquare size={11} className="flex-shrink-0 mt-0.5 text-gray-400" />
                      <span className="line-clamp-2">{req.message}</span>
                    </div>
                  )}

                  {/* Fecha + consultora */}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <Clock size={11} />
                    {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true, locale: es })}
                    {req.consultant.name && (
                      <span className="text-gray-300">·</span>
                    )}
                    <span className="truncate">{req.consultant.name}</span>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              {req.status !== "SOLD" && req.status !== "DISMISSED" && (
                <div className="px-4 py-3 border-t border-gray-50 flex items-center gap-2 flex-wrap">
                  {req.status === "PENDING" && (
                    <button
                      onClick={() => updateStatus.mutate({ id: req.id, status: "CONTACTED" })}
                      disabled={updateStatus.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-60"
                    >
                      <Phone size={12} /> Marcar contactado
                    </button>
                  )}
                  <button
                    onClick={() => updateStatus.mutate({ id: req.id, status: "SOLD" })}
                    disabled={updateStatus.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-semibold rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-60"
                  >
                    <CheckCircle size={12} /> Marcar vendido
                  </button>
                  <button
                    onClick={() => updateStatus.mutate({ id: req.id, status: "DISMISSED" })}
                    disabled={updateStatus.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-500 border border-gray-200 text-xs font-semibold rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-60 ml-auto"
                  >
                    <X size={12} /> Descartar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {(data?.pages ?? 0) > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-400">{data?.total} solicitudes · página {page} de {data?.pages}</p>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 disabled:opacity-40 transition-colors">
              <ChevronLeft size={14} className="text-gray-500" />
            </button>
            <button onClick={() => setPage((p) => Math.min(data!.pages, p + 1))} disabled={page === data?.pages}
              className="p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 disabled:opacity-40 transition-colors">
              <ChevronRight size={14} className="text-gray-500" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
