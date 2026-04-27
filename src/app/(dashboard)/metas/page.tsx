"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, X, Trophy } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  SALES_AMOUNT: "Monto de ventas", NEW_CLIENTS: "Nuevas clientas",
  PRODUCT_UNITS: "Unidades de producto", GROUP_SALES: "Ventas grupales",
};
const PERIOD_LABELS: Record<string, string> = {
  WEEKLY: "Semanal", MONTHLY: "Mensual", QUARTERLY: "Trimestral",
};

const inputCls = "mt-1 w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-mk-pink/50 transition-colors bg-gray-50 focus:bg-white";
const labelCls = "text-xs font-semibold text-gray-500 uppercase tracking-wide";

function GoalCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 mr-4 space-y-2">
          <div className="h-4 bg-gray-200 rounded-full w-3/4" />
          <div className="h-3 bg-gray-100 rounded-full w-1/2" />
        </div>
        <div className="h-9 w-14 bg-gray-200 rounded-xl" />
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full mb-3" />
      <div className="flex justify-between">
        <div className="h-3 bg-gray-100 rounded-full w-24" />
        <div className="h-3 bg-gray-100 rounded-full w-20" />
      </div>
    </div>
  );
}

function GoalCard({ item }: { item: { goal: any; current: number; target: number; percentage: number } }) {
  const { goal, current, target, percentage } = item;
  const pct = Math.min(100, Math.round(percentage));
  const isAmount = goal.type === "SALES_AMOUNT" || goal.type === "GROUP_SALES";
  const completed = pct >= 100;
  const barColor = completed ? "#22c55e" : pct >= 60 ? "#E91E8C" : "#f59e0b";

  return (
    <div className={`bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md flex flex-col
      ${completed ? "border-emerald-100" : "border-gray-100"}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 mr-4">
          <p className="font-bold text-gray-900 text-sm leading-tight">
            {goal.description || TYPE_LABELS[goal.type]}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {PERIOD_LABELS[goal.period]} · {formatDate(goal.startDate)} – {formatDate(goal.endDate)}
          </p>
          {goal.targetUser && (
            <p className="text-xs text-mk-pink mt-0.5 font-medium">{goal.targetUser.name}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <span className={`text-3xl font-bold ${completed ? "text-emerald-500" : pct >= 60 ? "text-mk-pink" : "text-amber-500"}`}>
            {pct}%
          </span>
          {completed && <p className="text-xs text-emerald-500 font-semibold">¡Completada!</p>}
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 mb-3 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-auto">
        <span>Actual: <strong className="text-gray-800">{isAmount ? formatCurrency(current) : current}</strong></span>
        <span>Meta: <strong className="text-gray-800">{isAmount ? formatCurrency(target) : target}</strong></span>
      </div>
    </div>
  );
}

function NewGoalModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [type, setType] = useState("SALES_AMOUNT");
  const [period, setPeriod] = useState("MONTHLY");
  const [targetValue, setTargetValue] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const { data: consultants } = trpc.consultants.list.useQuery();
  const create = trpc.goals.create.useMutation({ onSuccess: () => { onSuccess(); onClose(); } });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest">Crear</p>
            <h2 className="text-lg font-bold text-gray-900">Nueva meta</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Tipo de meta</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <button key={k} type="button" onClick={() => setType(k)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition-all text-left ${type === k ? "border-mk-pink bg-pink-50 text-mk-pink" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Período</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {Object.entries(PERIOD_LABELS).map(([k, v]) => (
                <button key={k} type="button" onClick={() => setPeriod(k)}
                  className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${period === k ? "border-mk-pink bg-pink-50 text-mk-pink" : "border-gray-100 text-gray-500 hover:border-gray-200"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Para (consultora)</label>
            <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className={inputCls}>
              <option value="">Todo el equipo</option>
              {consultants?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Valor objetivo *</label>
              <input type="number" min="0" step="0.01" value={targetValue} onChange={(e) => setTargetValue(e.target.value)}
                placeholder={type === "SALES_AMOUNT" || type === "GROUP_SALES" ? "Ej: 50000" : "Ej: 10"} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Descripción</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Meta de mayo" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Inicio</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fin</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          {create.error && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-xl">{create.error.message}</p>
          )}
          <button onClick={() => create.mutate({ type: type as any, period: period as any, targetValue: parseFloat(targetValue), description: description || undefined, startDate, endDate, targetUserId: targetUserId || undefined })}
            disabled={!targetValue || !startDate || !endDate || create.isPending}
            className="w-full py-3 bg-mk-pink text-white font-semibold rounded-xl disabled:opacity-60 hover:bg-pink-700 transition-colors">
            {create.isPending ? "Guardando..." : "Crear meta"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MetasPage() {
  const { data: user } = trpc.auth.me.useQuery();
  const [showForm, setShowForm] = useState(false);
  const isDirectora = user?.role === "DIRECTORA" || user?.role === "ADMIN";
  const utils = trpc.useUtils();
  const { data: goals, isLoading } = trpc.goals.listWithProgress.useQuery({ active: true });

  return (
    <div className="min-h-full p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest mb-1">Progreso</p>
          <h1 className="text-2xl font-bold text-gray-900">Metas</h1>
        </div>
        {isDirectora && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-mk-pink text-white font-semibold rounded-xl text-sm hover:bg-pink-700 transition-colors shadow-sm shadow-pink-200">
            <Plus size={15} /><span>Nueva meta</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <GoalCardSkeleton key={i} />)}
        </div>
      ) : goals?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
            <Trophy size={26} className="text-mk-pink/40" />
          </div>
          <p className="text-gray-500 font-medium">Sin metas activas</p>
          {isDirectora && <p className="text-sm text-gray-400 mt-1">Crea una meta para motivar a tu equipo</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals?.map((item) => <GoalCard key={item.goal.id} item={item} />)}
        </div>
      )}

      {showForm && (
        <NewGoalModal
          onClose={() => setShowForm(false)}
          onSuccess={() => utils.goals.listWithProgress.invalidate()}
        />
      )}
    </div>
  );
}
