"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import { CheckCircle, X } from "lucide-react";

const schema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type FormData = z.infer<typeof schema>;

// ── Modal: Solicitar acceso ───────────────────────────────────────────────────

function RequestAccessModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);

  const request = trpc.auth.requestAccess.useMutation({
    onSuccess: () => setDone(true),
  });

  const inputCls = "mt-1 w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mk-pink/30";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest">Acceso</p>
            <h2 className="text-lg font-bold text-gray-900">Solicitar acceso</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {done ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">¡Solicitud enviada!</h3>
            <p className="text-sm text-gray-500">
              Un administrador revisará tu solicitud y te enviará las credenciales de acceso.
            </p>
            <button onClick={onClose} className="mt-2 w-full py-2.5 mk-gradient text-white font-semibold rounded-xl text-sm">
              Entendido
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Completa el formulario y un administrador te dará acceso al sistema.
            </p>

            <div>
              <label className="text-sm font-medium text-gray-700">Nombre completo *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className={inputCls} />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Correo electrónico *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" className={inputCls} />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">WhatsApp / Teléfono</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="809-555-1234" className={inputCls} />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Mensaje (opcional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="¿Quieres ser consultora o directora?" className={`${inputCls} resize-none`} />
            </div>

            {request.error && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-xl">{request.error.message}</p>
            )}

            <button
              onClick={() => request.mutate({ name, email, phone: phone || undefined, notes: notes || undefined })}
              disabled={!name.trim() || !email.trim() || request.isPending}
              className="w-full py-3 mk-gradient text-white font-semibold rounded-xl text-sm disabled:opacity-60 hover:opacity-90 transition-opacity"
            >
              {request.isPending ? "Enviando..." : "Enviar solicitud"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRequest, setShowRequest] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (authError) {
      setError("Correo o contraseña incorrectos");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mk-pink-light via-white to-mk-gold-light p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="MiMary" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-gray-900">
            <span className="text-gray-800">Mi</span><span className="text-mk-pink">Mary</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Sistema de Gestión</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Iniciar sesión</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="tu@correo.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mk-pink focus:border-transparent"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                {...register("password")}
                type="password"
                placeholder="••••••"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mk-pink focus:border-transparent"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 mk-gradient text-white font-semibold rounded-lg shadow hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          ¿No tienes acceso?{" "}
          <button onClick={() => setShowRequest(true)} className="text-mk-pink font-semibold hover:underline">
            Solicitar acceso
          </button>
        </p>
      </div>

      {showRequest && <RequestAccessModal onClose={() => setShowRequest(false)} />}
    </div>
  );
}
