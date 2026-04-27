"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, ChevronLeft, ChevronRight, User, Sparkles, Tag } from "lucide-react";

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

type ClientForm = z.infer<typeof clientSchema>;

const inputCls = "mt-1 w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-mk-pink/50 transition-colors bg-gray-50 focus:bg-white";
const labelCls = "text-xs font-semibold text-gray-500 uppercase tracking-wide";

const TABS = [
  { id: 0, label: "Contacto",     Icon: User },
  { id: 1, label: "Perfil de piel", Icon: Sparkles },
  { id: 2, label: "Notas",        Icon: Tag },
];

type Props = {
  onClose: () => void;
  onSuccess: () => void;
  defaultValues?: Partial<ClientForm>;
};

export function ClientFormModal({ onClose, onSuccess, defaultValues }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [tagInput, setTagInput] = useState("");
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema) as any,
    defaultValues: { tags: [], ...defaultValues },
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
                    {["Referida", "Instagram", "Facebook", "WhatsApp", "Evento", "Solicitud pública"].map((src) => {
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
