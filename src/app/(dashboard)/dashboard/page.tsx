"use client";

import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ShoppingCart, Users, CalendarCheck, Bell, TrendingUp, Gift,
  AlertTriangle, Plus, Package, UserPlus, Calendar, ArrowRight,
  BoxesIcon,
} from "lucide-react";

const COLOR_MAP = {
  pink:  { bg: "bg-pink-50",    text: "text-mk-pink",     icon: "text-mk-pink" },
  gold:  { bg: "bg-amber-50",   text: "text-mk-gold",     icon: "text-amber-500" },
  blue:  { bg: "bg-blue-50",    text: "text-blue-600",    icon: "text-blue-500" },
  green: { bg: "bg-emerald-50", text: "text-emerald-600", icon: "text-emerald-500" },
};

function StatCard({ label, value, sub, icon: Icon, color = "pink", loading }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color?: keyof typeof COLOR_MAP; loading?: boolean;
}) {
  const c = COLOR_MAP[color];
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-4`}>
        <Icon size={18} className={c.icon} />
      </div>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-7 bg-gray-200 rounded-lg w-24" />
          <div className="h-3.5 bg-gray-100 rounded-full w-28" />
          <div className="h-3 bg-gray-100 rounded-full w-20" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
          <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </>
      )}
    </div>
  );
}

function SectionCard({ title, icon: Icon, iconBg, children, loading }: {
  title: string; icon: React.ElementType; iconBg: string; children?: React.ReactNode; loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon size={15} className="text-current" />
        </div>
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
      </div>
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-3.5 bg-gray-200 rounded-full w-32" />
                <div className="h-3 bg-gray-100 rounded-full w-20" />
              </div>
              <div className="h-3.5 bg-gray-200 rounded-full w-16" />
            </div>
          ))}
        </div>
      ) : children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 text-center py-6">{text}</p>;
}

export default function DashboardPage() {
  const { data: user } = trpc.auth.me.useQuery();
  const router = useRouter();
  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery();
  const { data: activity, isLoading: activityLoading } = trpc.dashboard.activity.useQuery();
  const isDirectora = user?.role === "DIRECTORA" || user?.role === "ADMIN";
  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <div className="min-h-full p-4 md:p-8 space-y-6">

      {/* Header */}
      <div className="pt-1 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-mk-pink uppercase tracking-widest mb-1">MiMary</p>
          <h1 className="text-2xl font-bold text-gray-900">
            {firstName ? `Hola, ${firstName} 👋` : <span className="inline-block h-7 w-40 bg-gray-200 rounded-lg animate-pulse" />}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {new Date().toLocaleDateString("es-DO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Nueva venta",      icon: Plus,     href: "/ventas",       bg: "bg-mk-pink", text: "text-white" },
          { label: "Agregar cliente",  icon: UserPlus, href: "/clientes",     bg: "bg-white",   text: "text-gray-700" },
          { label: "Ver catálogo",     icon: Package,  href: "/catalogo",     bg: "bg-white",   text: "text-gray-700" },
          { label: "Seguimientos",     icon: Calendar, href: "/seguimientos", bg: "bg-white",   text: "text-gray-700" },
        ].map((action) => (
          <button
            key={action.href}
            onClick={() => router.push(action.href)}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-gray-100 shadow-sm font-semibold text-sm transition-all hover:shadow-md active:scale-[.98] ${action.bg} ${action.text}`}
          >
            <action.icon size={16} className="flex-shrink-0" />
            {action.label}
          </button>
        ))}
      </div>

      {/* KPI stats — load fast */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Ventas hoy" value={formatCurrency(kpis?.today.salesTotal ?? 0)}
          sub={`${kpis?.today.salesCount ?? 0} venta(s)`} icon={ShoppingCart} color="pink" loading={kpisLoading} />
        <StatCard label="Ventas del mes" value={formatCurrency(kpis?.month.salesTotal ?? 0)}
          sub={`${kpis?.month.salesCount ?? 0} venta(s)`} icon={TrendingUp} color="gold" loading={kpisLoading} />
        <StatCard label="Seguimientos hoy" value={String(kpis?.today.followUps ?? 0)}
          sub="pendientes" icon={CalendarCheck} color="blue" loading={kpisLoading} />
        <StatCard label="Solicitudes nuevas" value={String(kpis?.today.requests ?? 0)}
          sub="de links públicos" icon={Bell} color="green" loading={kpisLoading} />
      </div>

      {/* Activity — loads independently */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <SectionCard title="Últimas ventas" icon={ShoppingCart} iconBg="bg-pink-50 text-mk-pink" loading={activityLoading}>
          {(activity?.recentSales?.length ?? 0) === 0 ? (
            <EmptyState text="Sin ventas registradas aún" />
          ) : (
            <ul className="space-y-3">
              {activity?.recentSales.map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{(s.client as any)?.name ?? (s as any).clientName ?? "Cliente"}</p>
                    {isDirectora && <p className="text-xs text-gray-400">{s.consultant.name}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(s.total)}</p>
                    <p className="text-xs text-gray-400">{formatDate(s.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => router.push("/ventas")}
            className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-mk-pink hover:underline">
            Ver todas las ventas <ArrowRight size={12} />
          </button>
        </SectionCard>

        <SectionCard title="Cumpleaños esta semana" icon={Gift} iconBg="bg-pink-50 text-mk-pink" loading={activityLoading}>
          {(activity?.upcomingBirthdays?.length ?? 0) === 0 ? (
            <EmptyState text="Sin cumpleaños próximos" />
          ) : (
            <ul className="space-y-3">
              {activity?.upcomingBirthdays.map((c) => (
                <li key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center">
                      <span className="text-xs font-bold text-mk-pink">{c.name[0]}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">{c.name}</span>
                  </div>
                  <span className="text-xs text-gray-400">{c.birthday ? formatDate(c.birthday) : ""}</span>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => router.push("/clientes")}
            className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-mk-pink hover:underline">
            Ver clientes <ArrowRight size={12} />
          </button>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <SectionCard title="Stock bajo" icon={AlertTriangle} iconBg="bg-amber-50 text-amber-500" loading={activityLoading}>
          {(activity?.lowStock?.length ?? 0) === 0 ? (
            <EmptyState text="Todo el inventario tiene stock suficiente" />
          ) : (
            <ul className="space-y-2">
              {activity?.lowStock.map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 truncate mr-3">{item.product.name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    item.quantity === 0 ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"
                  }`}>
                    {item.quantity} unid.
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => router.push("/inventario")}
            className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-mk-pink hover:underline">
            Ver inventario <ArrowRight size={12} />
          </button>
        </SectionCard>

        {isDirectora ? (
          <SectionCard title="Ranking del mes" icon={Users} iconBg="bg-pink-50 text-mk-pink" loading={activityLoading}>
            {!activity?.consultantRanking || (activity.consultantRanking as any[]).length === 0 ? (
              <EmptyState text="Sin ventas registradas este mes" />
            ) : (
              <ul className="space-y-3">
                {(activity.consultantRanking as any[]).slice(0, 5).map((r: any, i: number) => (
                  <li key={r.consultantId} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      i === 0 ? "bg-mk-gold text-white" : i === 1 ? "bg-gray-200 text-gray-600" : "bg-gray-100 text-gray-400"
                    }`}>{i + 1}</span>
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">{r.user?.name}</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(r.total)}</span>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => router.push("/consultoras")}
              className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-mk-pink hover:underline">
              Ver consultoras <ArrowRight size={12} />
            </button>
          </SectionCard>
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">Módulos</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Inventario",    icon: BoxesIcon,      href: "/inventario" },
                { label: "Seguimientos",  icon: CalendarCheck,  href: "/seguimientos" },
                { label: "Metas",         icon: TrendingUp,     href: "/metas" },
                { label: "Clientes",      icon: Users,          href: "/clientes" },
              ].map((m) => (
                <button key={m.href} onClick={() => router.push(m.href)}
                  className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 text-sm text-gray-600 font-medium hover:border-pink-100 hover:text-mk-pink hover:bg-pink-50/50 transition-all">
                  <m.icon size={15} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
