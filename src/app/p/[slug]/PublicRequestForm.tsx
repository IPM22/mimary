"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { CheckCircle, MessageCircle } from "lucide-react";

interface Props {
  productId: string;
  consultantId: string;
}

export function PublicRequestForm({ productId, consultantId }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = trpc.publicLinks.submitRequest.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-3xl p-8 text-center space-y-3">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">¡Solicitud enviada!</h3>
        <p className="text-gray-500 text-sm">
          Tu consultora recibirá tu mensaje y se pondrá en contacto contigo pronto.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 mk-gradient rounded-2xl flex items-center justify-center">
          <MessageCircle size={20} className="text-white" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">¡Quiero este producto!</h2>
          <p className="text-xs text-gray-400">Déjanos tus datos y te contactamos</p>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Tu nombre *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="¿Cómo te llamas?"
          className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-mk-pink/30"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">WhatsApp / Teléfono</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
          placeholder="Ej: 809-555-1234"
          className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-mk-pink/30"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Mensaje (opcional)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="¿Tienes alguna pregunta sobre el producto?"
          className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-mk-pink/30 resize-none"
        />
      </div>

      {submit.error && (
        <p className="text-red-500 text-sm">{submit.error.message}</p>
      )}

      <button
        onClick={() =>
          submit.mutate({
            productId,
            consultantId,
            clientName: name,
            clientPhone: phone || undefined,
            message: message || undefined,
          })
        }
        disabled={!name.trim() || submit.isPending}
        className="w-full py-4 mk-gradient text-white font-bold rounded-2xl text-base shadow-lg hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {submit.isPending ? "Enviando..." : "💌 Enviar solicitud"}
      </button>
    </div>
  );
}
