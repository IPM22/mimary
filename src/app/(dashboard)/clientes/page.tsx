"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatDate } from "@/lib/utils";
import { Search, Plus, Phone, ChevronLeft, ChevronRight, User } from "lucide-react";
import Link from "next/link";
import { ClientFormModal } from "@/components/clients/ClientFormModal";

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.clients.list.useQuery({ search, page, limit: 25 }, { placeholderData: (prev: any) => prev });

  return (
    <div className="min-h-full p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest mb-1">Gestión</p>
          <h1 className="text-2xl font-bold text-gray-900">Clientas</h1>
        </div>
        <div className="flex items-center gap-3">
          {data && <p className="text-sm text-gray-400 hidden sm:block">{data.total} clientas</p>}
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-mk-pink text-white font-semibold rounded-xl text-sm hover:bg-pink-700 transition-colors shadow-sm shadow-pink-200">
            <Plus size={15} /><span>Nueva clienta</span>
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative max-w-lg">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por nombre o teléfono..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-mk-pink/20 focus:border-mk-pink/40 transition-all shadow-sm" />
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
          <div className="hidden md:block">
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 flex gap-8">
              {[36, 20, 18, 20, 16, 12].map((w, i) => <div key={i} className={`h-3 bg-gray-200 rounded-full w-${w}`} />)}
            </div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-5 px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-3 w-48">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 bg-gray-200 rounded-full w-28" />
                    <div className="h-3 bg-gray-100 rounded-full w-20" />
                  </div>
                </div>
                <div className="h-3 bg-gray-100 rounded-full w-24" />
                <div className="h-5 bg-gray-100 rounded-full w-16" />
                <div className="flex gap-1.5">
                  <div className="h-5 bg-gray-100 rounded-full w-12" />
                  <div className="h-5 bg-gray-100 rounded-full w-16" />
                </div>
                <div className="h-3 bg-gray-100 rounded-full w-20 ml-auto" />
              </div>
            ))}
          </div>
          <div className="md:hidden space-y-px">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-4 border-b border-gray-50">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-200 rounded-full w-32" />
                  <div className="h-3 bg-gray-100 rounded-full w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : data?.clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
            <User size={24} className="text-mk-pink/40" />
          </div>
          <p className="text-gray-500 font-medium">No se encontraron clientas</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Tabla desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Clienta</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Teléfono</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo de piel</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Etiquetas</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Desde</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center flex-shrink-0">
                          {client.avatar
                            ? <img src={client.avatar} alt={client.name} className="w-full h-full rounded-full object-cover" />
                            : <span className="text-mk-pink font-bold text-xs">{client.name[0].toUpperCase()}</span>
                          }
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{client.name}</p>
                          {(client as any).email && <p className="text-xs text-gray-400">{(client as any).email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {client.phone ? (
                        <span className="flex items-center gap-1.5"><Phone size={12} className="text-gray-400" />{client.phone}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{(client as any).skinType ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {client.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[11px] text-mk-pink bg-pink-50 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400 whitespace-nowrap">{formatDate((client as any).createdAt)}</td>
                    <td className="px-5 py-3">
                      <Link href={`/clientes/${client.id}`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-mk-pink hover:underline whitespace-nowrap">
                        Ver perfil →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lista mobile */}
          <div className="md:hidden divide-y divide-gray-50">
            {data?.clients.map((client) => (
              <Link key={client.id} href={`/clientes/${client.id}`}
                className="flex items-center gap-3 p-4 hover:bg-gray-50/50 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center flex-shrink-0">
                  {client.avatar
                    ? <img src={client.avatar} alt={client.name} className="w-full h-full rounded-full object-cover" />
                    : <span className="text-mk-pink font-bold">{client.name[0].toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{client.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {client.phone && <span className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{client.phone}</span>}
                    {client.tags.length > 0 && <span className="text-xs text-mk-pink bg-pink-50 px-2 py-0.5 rounded-full">{client.tags[0]}</span>}
                  </div>
                </div>
                <ChevronRight size={15} className="text-gray-300 group-hover:text-mk-pink transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>

          {/* Paginación */}
          {(data?.pages ?? 1) > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">{data?.total} clientas · página {page} de {data?.pages}</p>
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

      {showForm && <ClientFormModal onClose={() => setShowForm(false)} onSuccess={() => utils.clients.list.invalidate()} />}
    </div>
  );
}
