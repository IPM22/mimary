"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Plus, CheckCircle, Clock, Phone, MessageCircle, Package, Home, X,
  CalendarCheck, DollarSign, UserPlus, Search, Calendar, ChevronDown,
  MoreVertical, Trash2, Pencil, AlarmClock, User as UserIcon, Filter,
  Mail, MessageSquare, Sparkles, RefreshCw, HelpCircle, Flower2,
} from "lucide-react";

// ─────────────────────────── Concept: PURPOSE ──────────────────────────────
// What is the follow-up about?
type FollowUpType =
  | "DELIVERY" | "POST_SALE" | "BIRTHDAY" | "PAYMENT"
  | "COLD_CONTACT" | "PROSPECTING" | "REACTIVATION" | "FACIAL" | "OTHER"
  // legacy values still in the DB until the migration script runs
  | "CALL" | "WHATSAPP" | "VISIT";

const TYPE_CONFIG: Record<FollowUpType, { label: string; icon: React.ElementType; bg: string; text: string; border: string }> = {
  FACIAL:       { label: "Cita de facial", icon: Flower2,       bg: "bg-rose-50",    text: "text-rose-700",     border: "border-rose-200" },
  DELIVERY:     { label: "Entrega",        icon: Package,       bg: "bg-orange-50",  text: "text-orange-600",   border: "border-orange-200" },
  POST_SALE:    { label: "Post-venta",     icon: CheckCircle,   bg: "bg-pink-50",    text: "text-mk-pink",      border: "border-pink-200" },
  BIRTHDAY:     { label: "Cumpleaños",     icon: CalendarCheck, bg: "bg-yellow-50",  text: "text-yellow-700",   border: "border-yellow-200" },
  PAYMENT:      { label: "Cobro / cuota",  icon: DollarSign,    bg: "bg-emerald-50", text: "text-emerald-700",  border: "border-emerald-200" },
  COLD_CONTACT: { label: "Contacto frío",  icon: UserPlus,      bg: "bg-cyan-50",    text: "text-cyan-700",     border: "border-cyan-200" },
  PROSPECTING:  { label: "Prospección",    icon: Sparkles,      bg: "bg-purple-50",  text: "text-purple-700",   border: "border-purple-200" },
  REACTIVATION: { label: "Reactivación",   icon: RefreshCw,     bg: "bg-indigo-50",  text: "text-indigo-700",   border: "border-indigo-200" },
  OTHER:        { label: "Otro",           icon: HelpCircle,    bg: "bg-gray-100",   text: "text-gray-600",     border: "border-gray-200" },
  // Legacy display fallbacks (won't appear in selectors)
  CALL:         { label: "Llamada",        icon: Phone,         bg: "bg-gray-100",   text: "text-gray-600",     border: "border-gray-200" },
  WHATSAPP:     { label: "WhatsApp",       icon: MessageCircle, bg: "bg-gray-100",   text: "text-gray-600",     border: "border-gray-200" },
  VISIT:        { label: "Visita",         icon: Home,          bg: "bg-gray-100",   text: "text-gray-600",     border: "border-gray-200" },
};

// Types shown in the type selector (excluding legacy values)
const TYPE_OPTIONS: FollowUpType[] = ["FACIAL", "POST_SALE", "DELIVERY", "PAYMENT", "BIRTHDAY", "COLD_CONTACT", "PROSPECTING", "REACTIVATION", "OTHER"];

// ─────────────────────── Concept: CONTACT MODE ─────────────────────────────
// How will we reach them?
type ContactMode = "CALL" | "WHATSAPP" | "IN_PERSON" | "EMAIL" | "SMS" | "OTHER";

const MODE_CONFIG: Record<ContactMode, { label: string; icon: React.ElementType; bg: string; text: string; border: string }> = {
  CALL:      { label: "Llamada",   icon: Phone,         bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-200" },
  WHATSAPP:  { label: "WhatsApp",  icon: MessageCircle, bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  IN_PERSON: { label: "En persona", icon: Home,         bg: "bg-purple-50",  text: "text-purple-600",  border: "border-purple-200" },
  EMAIL:     { label: "Email",     icon: Mail,          bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-200" },
  SMS:       { label: "SMS",       icon: MessageSquare, bg: "bg-slate-50",   text: "text-slate-600",   border: "border-slate-200" },
  OTHER:     { label: "Otro",      icon: HelpCircle,    bg: "bg-gray-100",   text: "text-gray-600",    border: "border-gray-200" },
};

const MODE_OPTIONS: ContactMode[] = ["WHATSAPP", "CALL", "IN_PERSON", "EMAIL", "SMS", "OTHER"];

type Segment = "ALL" | "OVERDUE" | "TODAY" | "TOMORROW" | "WEEK" | "FUTURE";

const SEGMENTS: { value: Segment; short: string; tone: string }[] = [
  { value: "ALL",      short: "Todos",     tone: "bg-gray-100 text-gray-700 border-gray-200" },
  { value: "OVERDUE",  short: "Vencidos",  tone: "bg-red-50 text-red-700 border-red-200" },
  { value: "TODAY",    short: "Hoy",       tone: "bg-pink-50 text-mk-pink border-pink-200" },
  { value: "TOMORROW", short: "Mañana",    tone: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "WEEK",     short: "Semana",    tone: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "FUTURE",   short: "Próximo",   tone: "bg-purple-50 text-purple-700 border-purple-200" },
];

// ─────────────────────────────── Helpers ───────────────────────────────────
function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function dayDiff(date: Date, ref = new Date()) {
  return Math.round((startOfDay(date).getTime() - startOfDay(ref).getTime()) / 86400000);
}
function formatTime(d: Date) {
  return new Intl.DateTimeFormat("es-DO", { hour: "numeric", minute: "2-digit", hour12: true }).format(d);
}
function formatRelative(date: Date) {
  const diff = dayDiff(date);
  if (diff === 0) return `Hoy · ${formatTime(date)}`;
  if (diff === 1) return `Mañana · ${formatTime(date)}`;
  if (diff === -1) return `Ayer · ${formatTime(date)}`;
  if (diff < 0) return `Hace ${Math.abs(diff)} días`;
  if (diff < 7) return new Intl.DateTimeFormat("es-DO", { weekday: "long", hour: "numeric", minute: "2-digit", hour12: true }).format(date);
  return new Intl.DateTimeFormat("es-DO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(date);
}
function toLocalDateTime(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function whatsappLink(phone: string, msg?: string) {
  const clean = phone.replace(/[^\d]/g, "");
  const url = `https://wa.me/${clean.startsWith("1") || clean.length > 10 ? clean : "1" + clean}`;
  return msg ? `${url}?text=${encodeURIComponent(msg)}` : url;
}

// Migrate legacy type → mode automatically for display
function deriveModeFromLegacyType(type: string): ContactMode | null {
  if (type === "CALL") return "CALL";
  if (type === "WHATSAPP") return "WHATSAPP";
  if (type === "VISIT") return "IN_PERSON";
  return null;
}

// ─────────────────────────── Client typeahead ──────────────────────────────
function ClientCombobox({ clientId, onChange }: { clientId: string; onChange: (id: string, name: string) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = trpc.clients.list.useQuery({ search, limit: 8 }, { enabled: open || search.length > 0 });
  const selectedName = data?.clients.find((c) => c.id === clientId)?.name;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        value={clientId ? (selectedName ?? search) : search}
        onChange={(e) => { setSearch(e.target.value); if (clientId) onChange("", ""); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar clienta..."
        className="w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-mk-pink/50 focus:bg-white transition-colors"
      />
      {clientId && (
        <button type="button" onClick={() => { onChange("", ""); setSearch(""); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
          <X size={14} />
        </button>
      )}
      {open && (data?.clients?.length ?? 0) > 0 && !clientId && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-44 overflow-y-auto">
          {data!.clients.map((c) => (
            <button key={c.id} type="button"
              onClick={() => { onChange(c.id, c.name); setSearch(c.name); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-pink-50 hover:text-mk-pink transition-colors border-b border-gray-50 last:border-0">
              {c.name}
              {c.phone && <span className="text-xs text-gray-400 ml-2">{c.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── New / Edit modal ──────────────────────────────
function FollowUpModal({ editing, onClose, onSuccess }: {
  editing?: { id: string; type: string; contactMode: string | null; clientId: string | null; scheduledDate: Date | string; note: string | null };
  onClose: () => void; onSuccess: () => void;
}) {
  const isEdit = !!editing;
  // Map legacy type → modern shape on edit
  const legacyMode = editing ? deriveModeFromLegacyType(editing.type) : null;
  const initialType: FollowUpType = legacyMode ? "OTHER" : (editing?.type as FollowUpType) ?? "POST_SALE";
  const initialMode: ContactMode | "" = (editing?.contactMode as ContactMode) ?? legacyMode ?? "WHATSAPP";

  const [type, setType] = useState<FollowUpType>(initialType);
  const [mode, setMode] = useState<ContactMode | "">(initialMode);
  const [clientId, setClientId] = useState(editing?.clientId ?? "");
  const [date, setDate] = useState(editing ? toLocalDateTime(new Date(editing.scheduledDate)) : "");
  const [note, setNote] = useState(editing?.note ?? "");

  const create = trpc.followUps.create.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  const update = trpc.followUps.update.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  const submitting = create.isPending || update.isPending;
  const error = create.error?.message ?? update.error?.message;

  function handleSubmit() {
    if (!date) return;
    const payload = {
      type: type as Exclude<FollowUpType, "CALL" | "WHATSAPP" | "VISIT">,
      contactMode: (mode || undefined) as ContactMode | undefined,
      scheduledDate: new Date(date).toISOString(),
      note,
    };
    if (isEdit) {
      update.mutate({ id: editing!.id, ...payload });
    } else {
      create.mutate({ ...payload, clientId: clientId || undefined });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest">{isEdit ? "Editar" : "Agendar"}</p>
            <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Seguimiento" : "Nuevo seguimiento"}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="space-y-4">
          {/* Type / purpose */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tipo de seguimiento</label>
            <p className="text-[11px] text-gray-400 mb-1.5">¿Para qué es este contacto?</p>
            <div className="grid grid-cols-2 gap-1.5">
              {TYPE_OPTIONS.map((key) => {
                const cfg = TYPE_CONFIG[key];
                const Icon = cfg.icon;
                const active = type === key;
                return (
                  <button key={key} type="button" onClick={() => setType(key)}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-semibold border-2 transition-all flex items-center gap-1.5 text-left
                      ${active ? `${cfg.bg} ${cfg.text} ${cfg.border}` : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                    <Icon size={13} className="flex-shrink-0" /><span className="truncate">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contact mode */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Modo de contacto</label>
            <p className="text-[11px] text-gray-400 mb-1.5">¿Cómo vas a comunicarte?</p>
            <div className="grid grid-cols-3 gap-1.5">
              {MODE_OPTIONS.map((key) => {
                const cfg = MODE_CONFIG[key];
                const Icon = cfg.icon;
                const active = mode === key;
                return (
                  <button key={key} type="button" onClick={() => setMode(active ? "" : key)}
                    className={`py-2 px-1.5 rounded-xl text-[11px] font-semibold border-2 transition-all flex flex-col items-center gap-0.5
                      ${active ? `${cfg.bg} ${cfg.text} ${cfg.border}` : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                    <Icon size={13} />{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {!isEdit && (
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                <UserIcon size={10} /> Cliente (opcional)
              </label>
              <ClientCombobox clientId={clientId} onChange={(id) => setClientId(id)} />
            </div>
          )}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
              <Calendar size={10} /> Fecha y hora
            </label>
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-mk-pink/50 focus:bg-white transition-colors" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Nota</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="¿Qué hay que hacer?"
              className="w-full px-3 py-2 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-mk-pink/50 focus:bg-white transition-colors resize-none" />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button onClick={handleSubmit} disabled={!date || submitting}
            className="w-full py-2.5 bg-mk-pink text-white font-semibold rounded-xl disabled:opacity-60 hover:bg-pink-700 transition-colors text-sm">
            {submitting ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar seguimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Reschedule popover ──────────────────────────────
function ReschedulePopover({ currentDate, onReschedule, onClose }: {
  currentDate: Date; onReschedule: (date: Date) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [customDate, setCustomDate] = useState(toLocalDateTime(currentDate));

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [onClose]);

  function buildDate(daysAhead: number, hour?: number) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    if (hour !== undefined) d.setHours(hour, 0, 0, 0);
    return d;
  }

  const options = [
    { label: "Esta tarde", date: () => { const d = new Date(); d.setHours(17, 0, 0, 0); return d; } },
    { label: "Mañana 9am", date: () => buildDate(1, 9) },
    { label: "En 3 días", date: () => buildDate(3, 10) },
    { label: "Próx. semana", date: () => buildDate(7, 10) },
  ];

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 w-60 bg-white rounded-2xl border border-gray-200 shadow-xl z-30 p-3 space-y-2">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reagendar</p>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((opt) => (
          <button key={opt.label} type="button" onClick={() => { onReschedule(opt.date()); onClose(); }}
            className="px-2 py-2 bg-gray-50 hover:bg-pink-50 hover:text-mk-pink border border-gray-100 rounded-xl text-[11px] font-semibold text-gray-700 transition-colors">
            {opt.label}
          </button>
        ))}
      </div>
      <div className="pt-1.5 border-t border-gray-100 space-y-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Personalizar</p>
        <input type="datetime-local" value={customDate} onChange={(e) => setCustomDate(e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-mk-pink/50" />
        <button type="button" onClick={() => { onReschedule(new Date(customDate)); onClose(); }}
          className="w-full py-1.5 bg-mk-pink hover:bg-pink-700 text-white text-xs font-semibold rounded-lg transition-colors">
          Aplicar
        </button>
      </div>
    </div>
  );
}

// ─────────────────────── Followup card ─────────────────────────────────────
type FollowUp = {
  id: string; type: string; contactMode: string | null;
  status: "PENDING" | "DONE"; scheduledDate: Date | string; note: string | null;
  clientId: string | null;
  client: { id: string; name: string; phone: string | null } | null;
};

function FollowUpCard({ f, onComplete, onReschedule, onEdit, onDelete }: {
  f: FollowUp;
  onComplete: (id: string) => void;
  onReschedule: (id: string, date: Date) => void;
  onEdit: (f: FollowUp) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reschedOpen, setReschedOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Derive effective type and mode (handles legacy rows)
  const legacyMode = deriveModeFromLegacyType(f.type);
  const effectiveType: FollowUpType = legacyMode ? "OTHER" : (f.type as FollowUpType);
  const effectiveMode: ContactMode | null = (f.contactMode as ContactMode) ?? legacyMode;

  const typeCfg = TYPE_CONFIG[effectiveType] ?? TYPE_CONFIG.OTHER;
  const modeCfg = effectiveMode ? MODE_CONFIG[effectiveMode] : null;
  const TypeIcon = typeCfg.icon;
  const ModeIcon = modeCfg?.icon;

  const date = new Date(f.scheduledDate);
  const overdue = f.status === "PENDING" && dayDiff(date) < 0;
  const isToday = f.status === "PENDING" && dayDiff(date) === 0;
  const done = f.status === "DONE";

  const borderCls = done
    ? "border-gray-100 opacity-75"
    : overdue
      ? "border-red-200 bg-red-50/30"
      : isToday
        ? "border-pink-200 bg-pink-50/20"
        : "border-gray-100";

  return (
    <div className={`group relative bg-white rounded-2xl p-4 border shadow-sm hover:shadow-md transition-all ${borderCls}`}>
      {/* Status strip */}
      <div className="flex items-center justify-between mb-2.5">
        <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1
          ${done ? "text-emerald-600" : overdue ? "text-red-600" : isToday ? "text-mk-pink" : "text-gray-400"}`}>
          {done ? <CheckCircle size={11} /> : overdue ? <AlarmClock size={11} /> : <Clock size={11} />}
          {done ? "Completado" : overdue ? `Vencido · ${formatRelative(date)}` : formatRelative(date)}
        </span>
        <div className="flex items-center gap-0.5">
          {f.status === "PENDING" && (
            <button onClick={() => onComplete(f.id)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:bg-emerald-50 hover:text-emerald-500 transition-colors"
              title="Marcar completado">
              <CheckCircle size={16} />
            </button>
          )}
          <div ref={menuRef} className="relative">
            <button onClick={() => setMenuOpen((v) => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <MoreVertical size={15} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden">
                <button onClick={() => { onEdit(f); setMenuOpen(false); }}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                  <Pencil size={12} /> Editar
                </button>
                <button onClick={() => { onDelete(f.id); setMenuOpen(false); }}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 hover:text-red-600 flex items-center gap-2 text-gray-700 border-t border-gray-50">
                  <Trash2 size={12} /> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Type + mode chips */}
      <div className="flex items-center gap-1 flex-wrap mb-2.5">
        <span className={`text-[10px] font-bold inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${typeCfg.bg} ${typeCfg.text}`}>
          <TypeIcon size={10} />{typeCfg.label}
        </span>
        {modeCfg && ModeIcon && (
          <span className={`text-[10px] font-semibold inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${modeCfg.bg} ${modeCfg.text}`}>
            <ModeIcon size={10} />{modeCfg.label}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="space-y-0.5">
        {f.client ? (
          <p className="text-sm text-gray-900 font-semibold truncate">{f.client.name}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">Sin cliente</p>
        )}
        {f.client?.phone && <p className="text-xs text-gray-400">{f.client.phone}</p>}
        {f.note && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{f.note}</p>}
      </div>

      {/* Quick actions */}
      {!done && (
        <div className="flex items-center justify-between gap-1.5 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1">
            {f.client?.phone && (
              <>
                <a href={`tel:${f.client.phone}`}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[11px] font-semibold transition-colors"
                  title="Llamar">
                  <Phone size={11} /> Llamar
                </a>
                <a href={whatsappLink(f.client.phone, f.note ?? undefined)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-[11px] font-semibold transition-colors"
                  title="WhatsApp">
                  <MessageCircle size={11} /> WhatsApp
                </a>
              </>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setReschedOpen((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-[11px] font-semibold transition-colors">
              <Calendar size={11} /> Reagendar <ChevronDown size={10} />
            </button>
            {reschedOpen && (
              <ReschedulePopover
                currentDate={date}
                onReschedule={(d) => onReschedule(f.id, d)}
                onClose={() => setReschedOpen(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────── Group followups by date ───────────────────────────
function groupByDateBucket(followUps: FollowUp[]): { label: string; key: string; items: FollowUp[] }[] {
  const buckets: Record<string, { label: string; order: number; items: FollowUp[] }> = {};
  for (const f of followUps) {
    const date = new Date(f.scheduledDate);
    const diff = dayDiff(date);
    let key: string;
    let label: string;
    let order: number;

    if (f.status === "DONE") { key = "done"; label = "Completados"; order = 999; }
    else if (diff < 0) { key = "overdue"; label = "Vencidos"; order = 0; }
    else if (diff === 0) { key = "today"; label = "Hoy"; order = 1; }
    else if (diff === 1) { key = "tomorrow"; label = "Mañana"; order = 2; }
    else if (diff < 7) { key = "week"; label = "Esta semana"; order = 3; }
    else if (diff < 30) { key = "month"; label = "Este mes"; order = 4; }
    else { key = "later"; label = "Más adelante"; order = 5; }

    if (!buckets[key]) buckets[key] = { label, order, items: [] };
    buckets[key].items.push(f);
  }
  return Object.entries(buckets)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, v]) => ({ key, label: v.label, items: v.items }));
}

// ───────────────────────────── Main page ───────────────────────────────────
export default function SeguimientosPage() {
  const [status, setStatus] = useState<"PENDING" | "DONE">("PENDING");
  const [segment, setSegment] = useState<Segment>("ALL");
  const [selectedTypes, setSelectedTypes] = useState<FollowUpType[]>([]);
  const [selectedModes, setSelectedModes] = useState<ContactMode[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: stats } = trpc.followUps.stats.useQuery();
  const { data, isLoading } = trpc.followUps.list.useQuery({
    status,
    segment: status === "PENDING" ? segment : undefined,
    types: selectedTypes.length > 0 ? selectedTypes : undefined,
    modes: selectedModes.length > 0 ? selectedModes : undefined,
    search: search || undefined,
    limit: 200,
  });

  const complete = trpc.followUps.complete.useMutation({
    onSuccess: () => { utils.followUps.list.invalidate(); utils.followUps.stats.invalidate(); },
  });
  const reschedule = trpc.followUps.reschedule.useMutation({
    onSuccess: () => { utils.followUps.list.invalidate(); utils.followUps.stats.invalidate(); },
  });
  const remove = trpc.followUps.delete.useMutation({
    onSuccess: () => { utils.followUps.list.invalidate(); utils.followUps.stats.invalidate(); },
  });

  const groups = useMemo(() => groupByDateBucket((data?.followUps ?? []) as any), [data]);

  function toggleType(t: FollowUpType) {
    setSelectedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }
  function toggleMode(m: ContactMode) {
    setSelectedModes((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  }

  const showSegments = status === "PENDING";

  return (
    <div className="min-h-full p-4 md:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest mb-1">Agenda</p>
          <h1 className="text-2xl font-bold text-gray-900">Seguimientos</h1>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-mk-pink text-white font-semibold rounded-xl text-sm hover:bg-pink-700 transition-colors shadow-sm shadow-pink-200">
          <Plus size={15} /><span>Nuevo</span>
        </button>
      </div>

      {/* KPI strip — only on pending */}
      {showSegments && stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { value: "OVERDUE" as Segment, label: "Vencidos", count: stats.overdue, accent: "text-red-600", bg: "bg-red-50", border: "border-red-100", ring: "ring-red-200" },
            { value: "TODAY" as Segment,    label: "Hoy",      count: stats.today,    accent: "text-mk-pink", bg: "bg-pink-50", border: "border-pink-100", ring: "ring-pink-200" },
            { value: "TOMORROW" as Segment, label: "Mañana",   count: stats.tomorrow, accent: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", ring: "ring-amber-200" },
            { value: "WEEK" as Segment,     label: "Semana",   count: stats.week,     accent: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", ring: "ring-blue-200" },
            { value: "FUTURE" as Segment,   label: "Próximo",  count: stats.future,   accent: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100", ring: "ring-purple-200" },
          ].map((s) => {
            const active = segment === s.value;
            return (
              <button key={s.value} onClick={() => setSegment(active ? "ALL" : s.value)}
                className={`text-left px-3 py-2.5 rounded-2xl border-2 transition-all ${active ? `${s.bg} ${s.border} ring-2 ${s.ring}` : "bg-white border-gray-100 hover:border-gray-200"}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${active ? s.accent : "text-gray-400"}`}>{s.label}</p>
                <p className={`text-xl font-bold ${active ? s.accent : "text-gray-900"}`}>{s.count}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Toolbar: status, search */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        {/* Status toggle */}
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 self-start">
          {([
            { v: "PENDING" as const, label: "Pendientes", count: stats?.allPending },
            { v: "DONE" as const,    label: "Completados", count: stats?.done },
          ]).map((s) => (
            <button key={s.v} onClick={() => { setStatus(s.v); setSegment("ALL"); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5
                ${status === s.v ? "bg-mk-pink text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {s.label}
              {typeof s.count === "number" && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                  ${status === s.v ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {s.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente o nota..."
            className="w-full pl-9 pr-9 py-2 bg-white border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-mk-pink/50 transition-colors" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Periodo (when pending) */}
      {showSegments && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1 flex items-center gap-1">
            <Filter size={10} /> Periodo
          </span>
          {SEGMENTS.map((s) => {
            const active = segment === s.value;
            return (
              <button key={s.value} onClick={() => setSegment(s.value)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all
                  ${active ? `${s.tone} shadow-sm` : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                {s.short}
              </button>
            );
          })}
        </div>
      )}

      {/* Tipo de seguimiento */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1 flex items-center gap-1">
          <Filter size={10} /> Tipo
        </span>
        <button onClick={() => setSelectedTypes([])}
          className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all
            ${selectedTypes.length === 0 ? "bg-mk-pink text-white border-mk-pink shadow-sm" : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"}`}>
          Todos
        </button>
        {TYPE_OPTIONS.map((key) => {
          const cfg = TYPE_CONFIG[key];
          const Icon = cfg.icon;
          const active = selectedTypes.includes(key);
          return (
            <button key={key} onClick={() => toggleType(key)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all flex items-center gap-1
                ${active ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm` : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"}`}>
              <Icon size={11} />{cfg.label}
            </button>
          );
        })}
      </div>

      {/* Modo de contacto */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1 flex items-center gap-1">
          <Filter size={10} /> Modo
        </span>
        <button onClick={() => setSelectedModes([])}
          className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all
            ${selectedModes.length === 0 ? "bg-mk-pink text-white border-mk-pink shadow-sm" : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"}`}>
          Todos
        </button>
        {MODE_OPTIONS.map((key) => {
          const cfg = MODE_CONFIG[key];
          const Icon = cfg.icon;
          const active = selectedModes.includes(key);
          return (
            <button key={key} onClick={() => toggleMode(key)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all flex items-center gap-1
                ${active ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm` : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"}`}>
              <Icon size={11} />{cfg.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-pulse">
              <div className="h-3 bg-gray-100 rounded-full w-32 mb-3" />
              <div className="flex gap-1.5 mb-2.5">
                <div className="h-5 bg-gray-100 rounded w-20" />
                <div className="h-5 bg-gray-100 rounded w-16" />
              </div>
              <div className="space-y-1.5 mb-3">
                <div className="h-3.5 bg-gray-200 rounded-full w-3/4" />
                <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                <div className="h-3 bg-gray-100 rounded-full w-1/3" />
              </div>
              <div className="flex gap-1.5 pt-3 border-t border-gray-50">
                <div className="h-6 bg-gray-100 rounded-lg w-16" />
                <div className="h-6 bg-gray-100 rounded-lg w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : (data?.followUps.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
            <CalendarCheck size={24} className="text-mk-pink/40" />
          </div>
          <p className="text-gray-500 font-medium">
            {status === "PENDING"
              ? search ? "Sin coincidencias" : "Sin seguimientos pendientes 🎉"
              : "Aún no completas seguimientos"}
          </p>
          {status === "PENDING" && !search && (
            <button onClick={() => { setEditing(null); setShowForm(true); }}
              className="mt-3 text-sm text-mk-pink underline underline-offset-2">
              Agendar el primero
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="flex items-center gap-2 mb-2.5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{g.label}</h3>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{g.items.length}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {g.items.map((f) => (
                  <FollowUpCard
                    key={f.id} f={f}
                    onComplete={(id) => complete.mutate({ id })}
                    onReschedule={(id, date) => reschedule.mutate({ id, scheduledDate: date.toISOString() })}
                    onEdit={(f) => { setEditing(f); setShowForm(true); }}
                    onDelete={(id) => setConfirmDelete(id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <FollowUpModal
          editing={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSuccess={() => { utils.followUps.list.invalidate(); utils.followUps.stats.invalidate(); }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">¿Eliminar seguimiento?</h3>
            <p className="text-sm text-gray-500 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => { remove.mutate({ id: confirmDelete }); setConfirmDelete(null); }}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
