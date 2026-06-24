"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Inbox, MessageSquare, ChevronLeft, ChevronRight,
  X, Clock, User, ShoppingCart, UserPlus, Store, Package,
} from "lucide-react";
import { ClientFormModal } from "@/components/clients/ClientFormModal";
import { SaleFormModal, type SaleFormInitialItem } from "@/components/sales/SaleFormModal";
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

type RequestItem = {
  id: string;
  productId: string;
  quantity: number;
  product: { id: string; name: string; images: string[]; salePrice: number | string };
};

type RequestCard = {
  id: string;
  clientName: string;
  clientPhone: string | null;
  message: string | null;
  status: string;
  source: string | null;
  createdAt: string | Date;
  consultant: { id: string; name: string };
  items: RequestItem[];
  itemCount: number;
  estimatedTotal: number | null;
};

function fmt(price: number) {
  return `RD$${price.toLocaleString("es-DO", { minimumFractionDigits: 0 })}`;
}

function waLink(phone: string, productNames: string[], clientName: string) {
  const digits = phone.replace(/\D/g, "");
  const e164 = /^(809|829|849)/.test(digits) ? "1" + digits : digits;
  const list = productNames.length === 1 ? `el producto "${productNames[0]}"` : `los productos que solicitaste`;
  const text = `Hola ${clientName}, te escribo por ${list} a través de MiMary.`;
  return `https://wa.me/${e164}?text=${encodeURIComponent(text)}`;
}

const WaIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

function ItemThumb({ images, name }: { images: string[]; name: string }) {
  const src = images?.[0];
  if (!src) {
    return <div className="w-full h-full flex items-center justify-center text-gray-200 text-xl">📦</div>;
  }
  return <img src={src} alt={name} className="w-full h-full object-cover" loading="lazy" />;
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function SolicitudesPage() {
  const [statusFilter, setStatusFilter] = useState<Status | undefined>("PENDING");
  const [page, setPage] = useState(1);
  const [saleTarget, setSaleTarget] = useState<RequestCard | null>(null);
  const [clientTarget, setClientTarget] = useState<RequestCard | null>(null);
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

  const requests = (data?.requests ?? []) as unknown as RequestCard[];

  return (
    <div className="min-h-full p-4 md:p-8 space-y-5 pb-24 md:pb-8">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
          <Inbox size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">
            No hay solicitudes {statusFilter ? STATUS_LABEL[statusFilter].toLowerCase() + "s" : ""}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {requests.map((req) => {
            const names = req.items.map((it) => it.product.name);
            return (
              <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                {/* Cabecera: cliente + estado */}
                <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                        <User size={14} className="text-gray-400" />
                        {req.clientName}
                      </span>
                      {req.source === "catalog" && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-mk-pink bg-pink-50 px-1.5 py-0.5 rounded-full">
                          <Store size={9} /> Catálogo
                        </span>
                      )}
                    </div>
                    {req.clientPhone && (
                      <a
                        href={waLink(req.clientPhone, names, req.clientName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#25D366] hover:text-[#1ebe5d] transition-colors mt-1"
                      >
                        <WaIcon /> {req.clientPhone}
                      </a>
                    )}
                  </div>
                  <select
                    value={req.status}
                    onChange={(e) => updateStatus.mutate({ id: req.id, status: e.target.value as Status })}
                    disabled={updateStatus.isPending}
                    className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border cursor-pointer appearance-none text-center disabled:opacity-60 ${STATUS_COLOR[req.status as Status]}`}
                  >
                    <option value="PENDING">Pendiente</option>
                    <option value="CONTACTED">Contactado</option>
                    <option value="SOLD">Vendido</option>
                    <option value="DISMISSED">Descartado</option>
                  </select>
                </div>

                {/* Ítems de la solicitud */}
                <div className="px-4 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                    <Package size={11} /> {req.itemCount} producto{req.itemCount !== 1 ? "s" : ""}
                  </div>
                  <div className="divide-y divide-gray-50 rounded-xl bg-gray-50/60 border border-gray-100 overflow-hidden">
                    {req.items.map((it) => {
                      const price = Number(it.product.salePrice) || 0;
                      return (
                        <div key={it.id} className="flex items-center gap-2.5 px-2.5 py-2">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white flex-shrink-0 border border-gray-100">
                            <ItemThumb images={it.product.images} name={it.product.name} />
                          </div>
                          <p className="text-xs font-medium text-gray-800 leading-tight line-clamp-2 flex-1 min-w-0">{it.product.name}</p>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[11px] font-bold text-gray-700">×{it.quantity}</p>
                            {price > 0 && <p className="text-[11px] text-mk-pink font-semibold">{fmt(price * it.quantity)}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {req.estimatedTotal !== null && (
                    <div className="flex items-center justify-between px-1 pt-0.5">
                      <span className="text-[11px] text-gray-400 font-medium">Total estimado</span>
                      <span className="text-sm font-bold text-mk-pink">{fmt(req.estimatedTotal)}</span>
                    </div>
                  )}
                </div>

                {/* Mensaje */}
                {req.message && (
                  <div className="flex items-start gap-1.5 mx-4 mt-2.5 text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5">
                    <MessageSquare size={11} className="flex-shrink-0 mt-0.5 text-gray-400" />
                    <span className="line-clamp-2">{req.message}</span>
                  </div>
                )}

                {/* Fecha + consultora */}
                <div className="flex items-center gap-2 px-4 mt-2.5 text-xs text-gray-400">
                  <Clock size={11} />
                  {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true, locale: es })}
                  {req.consultant.name && <span className="text-gray-300">·</span>}
                  <span className="truncate">{req.consultant.name}</span>
                </div>

                {/* Acciones */}
                <div className="px-4 py-3 mt-3 border-t border-gray-50 flex items-center gap-2">
                  <button
                    onClick={() => setSaleTarget(req)}
                    className="flex items-center gap-1.5 px-3 py-2 mk-gradient text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity shadow-sm shadow-pink-200"
                  >
                    <ShoppingCart size={12} /> Registrar venta
                  </button>
                  <button
                    onClick={() => setClientTarget(req)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    <UserPlus size={12} /> Crear cliente
                  </button>
                  <button
                    onClick={() => updateStatus.mutate({ id: req.id, status: "DISMISSED" })}
                    disabled={updateStatus.isPending}
                    className="flex items-center gap-1.5 px-3 py-2 text-gray-400 text-xs font-semibold rounded-xl hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60 ml-auto"
                  >
                    <X size={12} /> Descartar
                  </button>
                </div>
              </div>
            );
          })}
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

      {/* Modal registrar venta (componente reutilizado de Ventas, precargado) */}
      {saleTarget && (
        <SaleFormModal
          eyebrow="Solicitud"
          title="Registrar venta"
          requestId={saleTarget.id}
          initialClientName={saleTarget.clientName}
          initialItems={saleTarget.items.map<SaleFormInitialItem>((it) => ({
            productId: it.productId,
            name: it.product.name,
            images: it.product.images,
            quantity: it.quantity,
            unitPrice: Number(it.product.salePrice) || 0,
          }))}
          onClose={() => setSaleTarget(null)}
          onSuccess={() => {
            // La venta se enlazó con la solicitud: márcala como vendida.
            updateStatus.mutate({ id: saleTarget.id, status: "SOLD" });
            utils.requests.list.invalidate();
            utils.requests.pendingCount.invalidate();
            setSaleTarget(null);
          }}
        />
      )}

      {/* Modal crear cliente */}
      {clientTarget && (
        <ClientFormModal
          onClose={() => setClientTarget(null)}
          onSuccess={() => setClientTarget(null)}
          defaultValues={{
            name: clientTarget.clientName,
            phone: clientTarget.clientPhone ?? "",
            source: clientTarget.source === "catalog" ? "Catálogo público" : "Solicitud pública",
          }}
        />
      )}
    </div>
  );
}
