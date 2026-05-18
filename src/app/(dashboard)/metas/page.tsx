"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus, X, Trophy, DollarSign, Users, UserPlus, Package,
  Calendar, CalendarDays, CalendarRange, Search, Filter,
  MoreVertical, Pencil, Trash2, Clock, CheckCircle, AlarmClock,
  Sparkles, Target,
} from "lucide-react";

// ─────────────────────────── Goal type config ──────────────────────────────
type GoalType = "SALES_AMOUNT" | "NEW_CLIENTS" | "PRODUCT_UNITS" | "GROUP_SALES";
const TYPE_CONFIG: Record<GoalType, { label: string; short: string; icon: React.ElementType; bg: string; text: string; border: string }> = {
  SALES_AMOUNT:  { label: "Monto de ventas",       short: "Ventas",   icon: DollarSign, bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  GROUP_SALES:   { label: "Ventas grupales",       short: "Grupales", icon: Users,      bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
  NEW_CLIENTS:   { label: "Nuevas clientas",       short: "Clientas", icon: UserPlus,   bg: "bg-pink-50",    text: "text-mk-pink",     border: "border-pink-200" },
  PRODUCT_UNITS: { label: "Unidades de producto",  short: "Unidades", icon: Package,    bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200" },
};
const TYPE_OPTIONS: GoalType[] = ["SALES_AMOUNT", "NEW_CLIENTS", "PRODUCT_UNITS", "GROUP_SALES"];

type GoalPeriod = "WEEKLY" | "MONTHLY" | "QUARTERLY";
const PERIOD_CONFIG: Record<GoalPeriod, { label: string; icon: React.ElementType; bg: string; text: string; border: string }> = {
  WEEKLY:    { label: "Semanal",    icon: Calendar,      bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
  MONTHLY:   { label: "Mensual",    icon: CalendarDays,  bg: "bg-sky-50",    text: "text-sky-700",    border: "border-sky-200" },
  QUARTERLY: { label: "Trimestral", icon: CalendarRange, bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
};
const PERIOD_OPTIONS: GoalPeriod[] = ["WEEKLY", "MONTHLY", "QUARTERLY"];

// ───────────────────────── Status segment helpers ──────────────────────────
type Segment = "ALL" | "IN_PROGRESS" | "UPCOMING" | "COMPLETED" | "EXPIRED";

function getGoalSegment(item: { goal: any; percentage: number }): Exclude<Segment, "ALL"> {
  const now = new Date();
  const start = new Date(item.goal.startDate);
  const end = new Date(item.goal.endDate);
  end.setHours(23, 59, 59, 999);
  if (item.percentage >= 100) return "COMPLETED";
  if (now < start) return "UPCOMING";
  if (now > end) return "EXPIRED";
  return "IN_PROGRESS";
}

function daysUntil(date: Date) {
  const ms = date.getTime() - new Date().getTime();
  return Math.ceil(ms / 86400000);
}

// ─────────────────────────── Goal card ─────────────────────────────────────
function GoalCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-pulse">
      <div className="flex gap-1.5 mb-2.5">
        <div className="h-5 bg-gray-100 rounded w-24" />
        <div className="h-5 bg-gray-100 rounded w-20" />
      </div>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 space-y-1.5">
          <div className="h-4 bg-gray-200 rounded-full w-3/4" />
          <div className="h-3 bg-gray-100 rounded-full w-1/2" />
        </div>
        <div className="h-7 w-12 bg-gray-200 rounded-xl" />
      </div>
      <div className="h-2 bg-gray-100 rounded-full mb-2" />
      <div className="flex justify-between">
        <div className="h-3 bg-gray-100 rounded-full w-20" />
        <div className="h-3 bg-gray-100 rounded-full w-16" />
      </div>
    </div>
  );
}

function GoalCard({ item, isDirectora, onEdit, onDelete }: {
  item: { goal: any; current: number; target: number; percentage: number };
  isDirectora: boolean;
  onEdit: (goal: any) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { goal, current, target, percentage } = item;
  const pct = Math.min(100, Math.round(percentage));
  const isAmount = goal.type === "SALES_AMOUNT" || goal.type === "GROUP_SALES";
  const segment = getGoalSegment(item);

  const typeCfg = TYPE_CONFIG[goal.type as GoalType] ?? TYPE_CONFIG.SALES_AMOUNT;
  const periodCfg = PERIOD_CONFIG[goal.period as GoalPeriod] ?? PERIOD_CONFIG.MONTHLY;
  const TypeIcon = typeCfg.icon;
  const PeriodIcon = periodCfg.icon;

  const segmentInfo: Record<Exclude<Segment, "ALL">, { label: string; icon: React.ElementType; text: string }> = {
    COMPLETED:   { label: "Completada",   icon: CheckCircle, text: "text-emerald-600" },
    IN_PROGRESS: { label: "En progreso",  icon: Clock,       text: "text-mk-pink" },
    UPCOMING:    { label: "Próxima",      icon: Sparkles,    text: "text-purple-600" },
    EXPIRED:     { label: "Vencida",      icon: AlarmClock,  text: "text-red-600" },
  };
  const segInfo = segmentInfo[segment];
  const SegIcon = segInfo.icon;

  const borderCls = segment === "COMPLETED"
    ? "border-emerald-100"
    : segment === "EXPIRED"
      ? "border-gray-100 opacity-75"
      : segment === "UPCOMING"
        ? "border-purple-100 bg-purple-50/20"
        : "border-gray-100";

  const barColor = segment === "COMPLETED"
    ? "#22c55e"
    : segment === "EXPIRED" ? "#9ca3af"
      : segment === "UPCOMING" ? "#a855f7"
        : pct >= 60 ? "#E91E8C" : "#f59e0b";

  const pctColor = segment === "COMPLETED"
    ? "text-emerald-500"
    : segment === "EXPIRED" ? "text-gray-400"
      : segment === "UPCOMING" ? "text-purple-500"
        : pct >= 60 ? "text-mk-pink" : "text-amber-500";

  const endDate = new Date(goal.endDate);
  const startDate = new Date(goal.startDate);
  const daysLeft = daysUntil(endDate);
  const daysToStart = daysUntil(startDate);

  let timeLabel = "";
  if (segment === "UPCOMING") timeLabel = daysToStart === 1 ? "Inicia mañana" : `Inicia en ${daysToStart} días`;
  else if (segment === "IN_PROGRESS") timeLabel = daysLeft === 0 ? "Termina hoy" : daysLeft === 1 ? "Termina mañana" : `${daysLeft} días restantes`;
  else if (segment === "EXPIRED") timeLabel = `Venció hace ${Math.abs(daysLeft)} días`;
  else if (segment === "COMPLETED") timeLabel = `Finalizó ${formatDate(goal.endDate)}`;

  return (
    <div className={`group relative bg-white rounded-2xl p-4 border shadow-sm hover:shadow-md transition-all flex flex-col ${borderCls}`}>
      {/* Status strip */}
      <div className="flex items-center justify-between mb-2.5">
        <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${segInfo.text}`}>
          <SegIcon size={11} />{segInfo.label}
        </span>
        {isDirectora && (
          <div ref={menuRef} className="relative">
            <button onClick={() => setMenuOpen((v) => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <MoreVertical size={15} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden">
                <button onClick={() => { onEdit(goal); setMenuOpen(false); }}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                  <Pencil size={12} /> Editar
                </button>
                <button onClick={() => { onDelete(goal.id); setMenuOpen(false); }}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 hover:text-red-600 flex items-center gap-2 text-gray-700 border-t border-gray-50">
                  <Trash2 size={12} /> Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Type + period chips */}
      <div className="flex items-center gap-1 flex-wrap mb-2.5">
        <span className={`text-[10px] font-bold inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${typeCfg.bg} ${typeCfg.text}`}>
          <TypeIcon size={10} />{typeCfg.short}
        </span>
        <span className={`text-[10px] font-semibold inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${periodCfg.bg} ${periodCfg.text}`}>
          <PeriodIcon size={10} />{periodCfg.label}
        </span>
        {goal.targetUser ? (
          <span className="text-[10px] font-semibold inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
            <Users size={10} />{goal.targetUser.name}
          </span>
        ) : (
          <span className="text-[10px] font-semibold inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
            <Users size={10} />Equipo
          </span>
        )}
      </div>

      {/* Title + percentage */}
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-tight truncate">
            {goal.description || typeCfg.label}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDate(goal.startDate)} – {formatDate(goal.endDate)}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className={`text-2xl font-bold leading-none ${pctColor}`}>{pct}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
      </div>

      {/* Stats */}
      <div className="flex items-end justify-between text-xs mt-auto">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Actual</p>
          <p className="text-sm font-bold text-gray-800">{isAmount ? formatCurrency(current) : current}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Meta</p>
          <p className="text-sm font-bold text-gray-800">{isAmount ? formatCurrency(target) : target}</p>
        </div>
      </div>
      {timeLabel && (
        <p className={`text-[11px] mt-2 pt-2 border-t border-gray-100 font-semibold ${
          segment === "EXPIRED" ? "text-red-500" : segment === "COMPLETED" ? "text-emerald-600" : segment === "UPCOMING" ? "text-purple-600" : daysLeft <= 3 ? "text-amber-600" : "text-gray-500"
        }`}>
          {timeLabel}
        </p>
      )}
    </div>
  );
}

// ──────────────────────────── Goal modal ───────────────────────────────────
function GoalModal({ editing, onClose, onSuccess }: {
  editing?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!editing;
  const [type, setType] = useState<GoalType>(editing?.type ?? "SALES_AMOUNT");
  const [period, setPeriod] = useState<GoalPeriod>(editing?.period ?? "MONTHLY");
  const [targetValue, setTargetValue] = useState(editing ? String(Number(editing.targetValue)) : "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [startDate, setStartDate] = useState(editing ? new Date(editing.startDate).toISOString().split("T")[0] : "");
  const [endDate, setEndDate] = useState(editing ? new Date(editing.endDate).toISOString().split("T")[0] : "");
  const [targetUserId, setTargetUserId] = useState(editing?.targetUserId ?? "");
  const { data: consultants } = trpc.consultants.list.useQuery();
  const { data: me } = trpc.auth.me.useQuery();

  const create = trpc.goals.create.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  const update = trpc.goals.update.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });
  const submitting = create.isPending || update.isPending;
  const error = create.error?.message ?? update.error?.message;

  function handleSubmit() {
    const payload = {
      type, period,
      targetValue: parseFloat(targetValue),
      description: description || undefined,
      startDate, endDate,
      targetUserId: targetUserId || undefined,
    };
    if (isEdit) {
      update.mutate({ id: editing.id, ...payload });
    } else {
      create.mutate(payload);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest">{isEdit ? "Editar" : "Crear"}</p>
            <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Meta" : "Nueva meta"}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Tipo de meta</label>
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

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Período</label>
            <div className="grid grid-cols-3 gap-1.5">
              {PERIOD_OPTIONS.map((key) => {
                const cfg = PERIOD_CONFIG[key];
                const Icon = cfg.icon;
                const active = period === key;
                return (
                  <button key={key} type="button" onClick={() => setPeriod(key)}
                    className={`py-2 px-1.5 rounded-xl text-[11px] font-semibold border-2 transition-all flex flex-col items-center gap-0.5
                      ${active ? `${cfg.bg} ${cfg.text} ${cfg.border}` : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                    <Icon size={13} />{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
              <Users size={10} /> Para
            </label>
            <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-mk-pink/50 focus:bg-white transition-colors">
              <option value="">Todo el equipo</option>
              {me && <option value={me.id}>{me.name} (yo)</option>}
              {consultants?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Valor objetivo *</label>
              <input type="number" min="0" step="0.01" value={targetValue} onChange={(e) => setTargetValue(e.target.value)}
                placeholder={type === "SALES_AMOUNT" || type === "GROUP_SALES" ? "Ej: 50000" : "Ej: 10"}
                className="w-full px-3 py-2 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-mk-pink/50 focus:bg-white transition-colors font-semibold" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Descripción</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Meta de mayo"
                className="w-full px-3 py-2 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-mk-pink/50 focus:bg-white transition-colors" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Inicio</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-mk-pink/50 focus:bg-white transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Fin</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-mk-pink/50 focus:bg-white transition-colors" />
            </div>
          </div>

          {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

          <button onClick={handleSubmit}
            disabled={!targetValue || !startDate || !endDate || submitting}
            className="w-full py-2.5 bg-mk-pink text-white font-semibold rounded-xl disabled:opacity-60 hover:bg-pink-700 transition-colors text-sm">
            {submitting ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear meta"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── Main page ───────────────────────────────────
export default function MetasPage() {
  const { data: user } = trpc.auth.me.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [segment, setSegment] = useState<Segment>("ALL");
  const [selectedTypes, setSelectedTypes] = useState<GoalType[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<GoalPeriod[]>([]);
  const [search, setSearch] = useState("");
  const isDirectora = user?.role === "DIRECTORA" || user?.role === "ADMIN";
  const utils = trpc.useUtils();

  // Always fetch all; categorize and filter client-side
  const { data: allGoals, isLoading } = trpc.goals.listWithProgress.useQuery({ active: false });
  const remove = trpc.goals.delete.useMutation({
    onSuccess: () => utils.goals.listWithProgress.invalidate(),
  });

  // Compute stats per segment
  const stats = useMemo(() => {
    const counts = { inProgress: 0, upcoming: 0, completed: 0, expired: 0, all: 0 };
    for (const item of allGoals ?? []) {
      counts.all++;
      const s = getGoalSegment(item);
      if (s === "IN_PROGRESS") counts.inProgress++;
      else if (s === "UPCOMING") counts.upcoming++;
      else if (s === "COMPLETED") counts.completed++;
      else if (s === "EXPIRED") counts.expired++;
    }
    return counts;
  }, [allGoals]);

  // Filter
  const filtered = useMemo(() => {
    return (allGoals ?? []).filter((item) => {
      const s = getGoalSegment(item);
      if (segment !== "ALL" && s !== segment) return false;
      if (selectedTypes.length > 0 && !selectedTypes.includes(item.goal.type)) return false;
      if (selectedPeriods.length > 0 && !selectedPeriods.includes(item.goal.period)) return false;
      if (search) {
        const q = search.toLowerCase();
        const desc = (item.goal.description ?? "").toLowerCase();
        const target = (item.goal.targetUser?.name ?? "").toLowerCase();
        if (!desc.includes(q) && !target.includes(q)) return false;
      }
      return true;
    });
  }, [allGoals, segment, selectedTypes, selectedPeriods, search]);

  // Group by segment for display (only when no specific segment selected)
  const groups = useMemo(() => {
    if (segment !== "ALL") return [{ key: segment, label: "", items: filtered }];
    const buckets: Record<string, { label: string; order: number; items: typeof filtered }> = {};
    for (const item of filtered) {
      const s = getGoalSegment(item);
      const info = {
        IN_PROGRESS: { label: "En progreso", order: 0 },
        UPCOMING:    { label: "Próximas",    order: 1 },
        COMPLETED:   { label: "Completadas", order: 2 },
        EXPIRED:     { label: "Vencidas",    order: 3 },
      }[s];
      if (!buckets[s]) buckets[s] = { label: info.label, order: info.order, items: [] };
      buckets[s].items.push(item);
    }
    return Object.entries(buckets)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([key, v]) => ({ key, label: v.label, items: v.items }));
  }, [filtered, segment]);

  function toggleType(t: GoalType) {
    setSelectedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }
  function togglePeriod(p: GoalPeriod) {
    setSelectedPeriods((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  return (
    <div className="min-h-full p-4 md:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest mb-1">Progreso</p>
          <h1 className="text-2xl font-bold text-gray-900">Metas</h1>
        </div>
        {isDirectora && (
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-mk-pink text-white font-semibold rounded-xl text-sm hover:bg-pink-700 transition-colors shadow-sm shadow-pink-200">
            <Plus size={15} /><span>Nueva meta</span>
          </button>
        )}
      </div>

      {/* KPI strip */}
      {!isLoading && stats.all > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { value: "IN_PROGRESS" as Segment, label: "En progreso",  count: stats.inProgress, accent: "text-mk-pink",     bg: "bg-pink-50",   border: "border-pink-100",   ring: "ring-pink-200" },
            { value: "UPCOMING" as Segment,    label: "Próximas",     count: stats.upcoming,   accent: "text-purple-600",  bg: "bg-purple-50", border: "border-purple-100", ring: "ring-purple-200" },
            { value: "COMPLETED" as Segment,   label: "Completadas",  count: stats.completed,  accent: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", ring: "ring-emerald-200" },
            { value: "EXPIRED" as Segment,     label: "Vencidas",     count: stats.expired,    accent: "text-red-600",     bg: "bg-red-50",     border: "border-red-100",     ring: "ring-red-200" },
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

      {/* Toolbar: status pill + search */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 self-start">
          {([
            { v: "ALL" as Segment,         label: "Todas",        count: stats.all },
            { v: "IN_PROGRESS" as Segment, label: "Activas",      count: stats.inProgress },
          ]).map((s) => (
            <button key={s.v} onClick={() => setSegment(s.v)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5
                ${segment === s.v ? "bg-mk-pink text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {s.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                ${segment === s.v ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500"}`}>
                {s.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descripción o persona..."
            className="w-full pl-9 pr-9 py-2 bg-white border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-mk-pink/50 transition-colors" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Type filters */}
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
              <Icon size={11} />{cfg.short}
            </button>
          );
        })}
      </div>

      {/* Period filters */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1 flex items-center gap-1">
          <Filter size={10} /> Periodo
        </span>
        <button onClick={() => setSelectedPeriods([])}
          className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all
            ${selectedPeriods.length === 0 ? "bg-mk-pink text-white border-mk-pink shadow-sm" : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"}`}>
          Todos
        </button>
        {PERIOD_OPTIONS.map((key) => {
          const cfg = PERIOD_CONFIG[key];
          const Icon = cfg.icon;
          const active = selectedPeriods.includes(key);
          return (
            <button key={key} onClick={() => togglePeriod(key)}
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
          {[...Array(6)].map((_, i) => <GoalCardSkeleton key={i} />)}
        </div>
      ) : (allGoals?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
            <Trophy size={24} className="text-mk-pink/40" />
          </div>
          <p className="text-gray-500 font-medium">No hay metas creadas</p>
          {isDirectora && (
            <button onClick={() => { setEditing(null); setShowForm(true); }}
              className="mt-3 text-sm text-mk-pink underline underline-offset-2">
              Crear la primera meta
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3">
            <Target size={22} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium text-sm">Sin metas que coincidan con los filtros</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.key}>
              {g.label && (
                <div className="flex items-center gap-2 mb-2.5">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{g.label}</h3>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{g.items.length}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {g.items.map((item) => (
                  <GoalCard key={item.goal.id} item={item} isDirectora={isDirectora}
                    onEdit={(goal) => { setEditing(goal); setShowForm(true); }}
                    onDelete={(id) => setConfirmDelete(id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <GoalModal
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSuccess={() => utils.goals.listWithProgress.invalidate()}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">¿Eliminar meta?</h3>
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
