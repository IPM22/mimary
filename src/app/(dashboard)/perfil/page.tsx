"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { createClient } from "@/lib/supabase/client";
import { User, Phone, Mail, Hash, KeyRound, Check, Shield } from "lucide-react";

const inputCls = "mt-1 w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-mk-pink/50 transition-colors bg-gray-50 focus:bg-white";
const labelCls = "text-xs font-semibold text-gray-500 uppercase tracking-wide";

export default function PerfilPage() {
  const { data: currentUser } = trpc.auth.me.useQuery();
  const { data: profile, isLoading } = trpc.consultants.myProfile.useQuery();
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [infoSaved, setInfoSaved] = useState(false);

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const updateProfile = trpc.consultants.updateMyProfile.useMutation({
    onSuccess: async () => {
      await utils.consultants.myProfile.invalidate();
      await utils.auth.me.invalidate();
      setInfoSaved(true);
      setTimeout(() => setInfoSaved(false), 2500);
    },
  });

  const handleChangePw = async () => {
    if (newPw !== confirmPw) { setPwError("Las contraseñas no coinciden"); return; }
    if (newPw.length < 6) { setPwError("Mínimo 6 caracteres"); return; }
    setPwLoading(true);
    setPwError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);
    if (error) { setPwError(error.message); return; }
    setNewPw(""); setConfirmPw("");
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 2500);
  };

  const initials = (profile?.name ?? currentUser?.name ?? "")
    .split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const roleLabel = currentUser?.role === "DIRECTORA" ? "Directora" : currentUser?.role === "ADMIN" ? "Admin" : "Consultora";

  if (isLoading) {
    return (
      <div className="min-h-full p-4 md:p-8 space-y-5 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-xl w-32" />
        <div className="h-32 bg-white rounded-2xl border border-gray-100" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-white rounded-2xl border border-gray-100" />
          <div className="h-64 bg-white rounded-2xl border border-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 md:p-8 space-y-6 max-w-5xl">
      <div className="pt-1">
        <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest mb-1">Cuenta</p>
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
      </div>

      {/* Avatar + resumen */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-200 to-rose-300 flex items-center justify-center flex-shrink-0 shadow-sm shadow-pink-200">
          <span className="text-white font-bold text-2xl">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-gray-900">{profile?.name}</p>
          <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
            <Mail size={13} className="text-gray-400" />{profile?.email}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs bg-pink-50 text-mk-pink font-semibold px-2.5 py-1 rounded-full border border-pink-100 flex items-center gap-1">
              <Shield size={10} /> {roleLabel}
            </span>
            {profile?.mkNumber && (
              <span className="text-xs bg-gray-50 text-gray-500 font-medium px-2.5 py-1 rounded-full border border-gray-100 flex items-center gap-1">
                <Hash size={10} /> {profile.mkNumber}
              </span>
            )}
            {profile?.phone && (
              <span className="text-xs bg-gray-50 text-gray-500 font-medium px-2.5 py-1 rounded-full border border-gray-100 flex items-center gap-1">
                <Phone size={10} /> {profile.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dos columnas en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Información personal */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center">
              <User size={15} className="text-mk-pink" />
            </div>
            <h2 className="font-semibold text-gray-900">Información personal</h2>
          </div>
          <div>
            <label className={labelCls}>Nombre completo</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Correo electrónico</label>
            <input value={profile?.email ?? ""} disabled
              className="mt-1 w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">El correo no se puede cambiar</p>
          </div>
          <div>
            <label className={labelCls}>WhatsApp / Teléfono</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 mt-0.5" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 809 000 0000"
                className="mt-1 w-full pl-9 pr-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-mk-pink/50 transition-colors bg-gray-50 focus:bg-white" />
            </div>
          </div>
          {updateProfile.error && (
            <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-xl">{updateProfile.error.message}</p>
          )}
          <button
            onClick={() => updateProfile.mutate({ name: name || undefined, phone: phone || undefined })}
            disabled={updateProfile.isPending}
            className={`w-full py-3 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
              infoSaved ? "bg-emerald-500 text-white" : "bg-mk-pink text-white hover:bg-pink-700 disabled:opacity-60"
            }`}>
            {infoSaved ? <><Check size={16} /> Guardado</> : updateProfile.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        {/* Cambiar contraseña */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <KeyRound size={15} className="text-amber-500" />
            </div>
            <h2 className="font-semibold text-gray-900">Cambiar contraseña</h2>
          </div>
          <div>
            <label className={labelCls}>Nueva contraseña</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
              placeholder="Mínimo 6 caracteres" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Confirmar nueva contraseña</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Repite la nueva contraseña" className={inputCls} />
            {newPw && confirmPw && newPw !== confirmPw && (
              <p className="text-red-500 text-xs mt-1">Las contraseñas no coinciden</p>
            )}
          </div>
          {pwError && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-xl">{pwError}</p>}

          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-xs text-gray-500">Al cambiar tu contraseña deberás volver a iniciar sesión en todos tus dispositivos.</p>
          </div>

          <button
            onClick={handleChangePw}
            disabled={!newPw || newPw.length < 6 || newPw !== confirmPw || pwLoading}
            className={`w-full py-3 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
              pwSaved ? "bg-emerald-500 text-white" : "bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
            }`}>
            {pwSaved ? <><Check size={16} /> Contraseña actualizada</> : pwLoading ? "Cambiando..." : "Cambiar contraseña"}
          </button>
        </div>
      </div>
    </div>
  );
}
