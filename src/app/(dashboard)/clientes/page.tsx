"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatDate } from "@/lib/utils";
import { Search, Plus, Phone, X, ChevronLeft, ChevronRight, User, Sparkles, Tag } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const clientSchema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  birthday: z.string().optional(),
  address: z.string().optional(),
  skinType: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()),
});

type ClientForm = {
  name: string; phone?: string; email?: string; birthday?: string;
  address?: string; skinType?: string; source?: string; notes?: string; tags: string[];
};

const inputCls = "mt-1 w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-mk-pink/50 transition-colors bg-gray-50 focus:bg-white";
const labelCls = "text-xs font-semibold text-gray-500 uppercase tracking-wide";

const TABS = [
  { id: 0, label: "Contacto", Icon: User },
  { id: 1, label: "Perfil de piel", Icon: Sparkles },
  { id: 2, label: "Notas", Icon: Tag },
];

function ClientFormModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [activeTab, setActiveTab] = useState(0);
  const [tagInput, setTagInput] = useState("");
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema) as any,
    defaultValues: { tags: [] },
  });
  const tags = watch("tags");
  const create = trpc.clients.create.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) { setValue("tags", [...tags, t]); setTagInput(""); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 pt-6 pb-0 flex-shrink-0">
          <div>
            <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest">Nueva</p>
            <h2 className="text-lg font-bold text-gray-900">Agregar clienta</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="flex px-6 mt-4 border-b border-gray-100 flex-shrink-0">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px mr-1
                ${activeTab === id ? "border-mk-pink text-mk-pink" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit((d) => create.mutate({ ...d, tags: d.tags ?? [] }))} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {activeTab === 0 && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Nombre completo *</label>
                  <input {...register("name")} className={inputCls} placeholder="Ej: María García" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>WhatsApp / Teléfono</label>
                    <input {...register("phone")} className={inputCls} placeholder="+1 809 000 0000" />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input {...register("email")} type="email" className={inputCls} placeholder="correo@email.com" />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Dirección</label>
                  <input {...register("address")} className={inputCls} placeholder="Ciudad, sector..." />
                </div>
              </div>
            )}
            {activeTab === 1 && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Tipo de piel</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["Normal", "Seca", "Mixta", "Grasa", "Sensible"].map((tipo) => {
                      const active = (watch("skinType") ?? "").toLowerCase() === tipo.toLowerCase();
                      return (
                        <button key={tipo} type="button" onClick={() => setValue("skinType", active ? "" : tipo)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${active ? "border-mk-pink bg-pink-50 text-mk-pink" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                          {tipo}
                        </button>
                      );
                    })}
                  </div>
                  <input {...register("skinType")} className={inputCls + " mt-3"} placeholder="O escribe libremente..." />
                </div>
                <div>
                  <label className={labelCls}>Cumpleaños</label>
                  <input {...register("birthday")} type="date" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Cómo llegó</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["Referida", "Instagram", "Facebook", "WhatsApp", "Evento"].map((src) => {
                      const active = (watch("source") ?? "").toLowerCase() === src.toLowerCase();
                      return (
                        <button key={src} type="button" onClick={() => setValue("source", active ? "" : src)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${active ? "border-mk-pink bg-pink-50 text-mk-pink" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                          {src}
                        </button>
                      );
                    })}
                  </div>
                  <input {...register("source")} className={inputCls + " mt-3"} placeholder="O escribe libremente..." />
                </div>
              </div>
            )}
            {activeTab === 2 && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Notas internas</label>
                  <textarea {...register("notes")} rows={4} placeholder="Preferencias, alergias, observaciones..." className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Etiquetas</label>
                  <div className="flex gap-2 mt-1">
                    <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                      placeholder="VIP, frecuente, prospecto..." className={inputCls + " flex-1 mt-0"} />
                    <button type="button" onClick={addTag} className="px-4 py-2.5 bg-gray-100 rounded-xl text-sm font-semibold hover:bg-gray-200">+</button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {tags.map((tag) => (
                        <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-pink-50 text-mk-pink text-xs rounded-full border border-pink-100">
                          {tag}
                          <button type="button" onClick={() => setValue("tags", tags.filter((t) => t !== tag))}><X size={11} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">Presiona Enter o &quot;+&quot; para agregar</p>
                </div>
              </div>
            )}
          </div>
          <div className="px-6 pb-6 pt-3 border-t border-gray-100 flex-shrink-0">
            {create.error && <p className="text-red-500 text-xs mb-3 text-center">{create.error.message}</p>}
            <div className="flex gap-2">
              {activeTab > 0 && (
                <button type="button" onClick={() => setActiveTab((t) => t - 1)}
                  className="px-5 py-3 border-2 border-gray-100 rounded-xl text-sm font-semibold text-gray-600 hover:border-gray-200">
                  <ChevronLeft size={16} className="inline -mt-0.5" /> Anterior
                </button>
              )}
              {activeTab < TABS.length - 1 ? (
                <button type="button" onClick={() => setActiveTab((t) => t + 1)}
                  className="flex-1 py-3 bg-gray-900 text-white font-semibold rounded-xl text-sm hover:bg-gray-800">
                  Siguiente <ChevronRight size={16} className="inline -mt-0.5" />
                </button>
              ) : null}
              <button type="submit" disabled={create.isPending}
                className="flex-1 py-3 bg-mk-pink text-white font-semibold rounded-xl disabled:opacity-60 hover:bg-pink-700 text-sm">
                {create.isPending ? "Guardando..." : "Guardar clienta"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

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
