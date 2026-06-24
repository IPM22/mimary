"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { KeyRound, Check, AlertTriangle } from "lucide-react";

const inputCls =
  "mt-1 w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mk-pink/30";

type Stage = "verifying" | "form" | "invalid" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("verifying");

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState<string>("");
  const ran = useRef(false);

  // Una sola instancia de cliente, con detección de URL desactivada para
  // controlar nosotros el canje del enlace (evita la doble-consumición del código).
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { flowType: "pkce", detectSessionInUrl: false } }
      );
    }
    return supabaseRef.current;
  };

  // Canjea el enlace de recuperación por una sesión
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const supabase = getSupabase();
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    // DEBUG temporal: muestra qué trae el enlace
    setDebug(
      `search="${window.location.search}"\nhash="${window.location.hash}"`
    );

    const init = async () => {
      if (
        query.get("error_description") || query.get("error") ||
        hash.get("error_description") || hash.get("error")
      ) {
        setStage("invalid");
        return;
      }

      // Sesión ya existente (p. ej. al recargar la página tras canjear)
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        setStage("form");
        return;
      }

      // 1) token_hash — plantilla con {{ .TokenHash }}, funciona entre dispositivos
      const tokenHash = query.get("token_hash");
      if (tokenHash) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });
        setStage(otpError ? "invalid" : "form");
        return;
      }

      // 2) code — flujo PKCE de la plantilla por defecto (mismo navegador)
      const code = query.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        setStage(exchangeError ? "invalid" : "form");
        return;
      }

      // 3) tokens en el hash — flujo implícito
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      if (access_token && refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        setStage(sessionError ? "invalid" : "form");
        return;
      }

      setStage("invalid");
    };

    init();
  }, []);

  const handleSubmit = async () => {
    if (newPw !== confirmPw) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (newPw.length < 6) {
      setError("Mínimo 6 caracteres");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = getSupabase();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPw });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setStage("done");
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mk-pink-light via-white to-mk-gold-light p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="MiMary" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-gray-900">
            <span className="text-gray-800">Mi</span>
            <span className="text-mk-pink">Mary</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Restablecer contraseña</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {stage === "verifying" && (
            <div className="text-center py-8 space-y-3">
              <div className="w-10 h-10 mx-auto border-2 border-mk-pink/30 border-t-mk-pink rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Verificando enlace…</p>
            </div>
          )}

          {stage === "invalid" && (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Enlace inválido o expirado</h2>
              <p className="text-sm text-gray-500">
                El enlace para restablecer la contraseña ya no es válido. Solicita uno nuevo desde la pantalla de inicio de sesión.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="mt-2 w-full py-2.5 mk-gradient text-white font-semibold rounded-xl text-sm"
              >
                Volver al inicio de sesión
              </button>
              {debug && (
                <pre className="mt-3 text-left text-[10px] leading-snug text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all">
                  {debug}
                </pre>
              )}
            </div>
          )}

          {stage === "done" && (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check size={32} className="text-green-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">¡Contraseña actualizada!</h2>
              <p className="text-sm text-gray-500">Te estamos redirigiendo a tu cuenta…</p>
            </div>
          )}

          {stage === "form" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                  <KeyRound size={15} className="text-amber-500" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Nueva contraseña</h2>
              </div>
              <p className="text-sm text-gray-500">Crea una nueva contraseña para tu cuenta.</p>

              <div>
                <label className="text-sm font-medium text-gray-700">Nueva contraseña</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className={inputCls}
                />
                {newPw && confirmPw && newPw !== confirmPw && (
                  <p className="text-red-500 text-xs mt-1">Las contraseñas no coinciden</p>
                )}
              </div>

              {error && (
                <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-xl">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={!newPw || newPw.length < 6 || newPw !== confirmPw || loading}
                className="w-full py-3 mk-gradient text-white font-semibold rounded-xl text-sm disabled:opacity-60 hover:opacity-90 transition-opacity"
              >
                {loading ? "Guardando…" : "Guardar contraseña"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
