"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, BoxesIcon, Users, ShoppingCart,
  CalendarCheck, Target, UserCog, LogOut, ChevronLeft, ChevronRight,
  CircleUserRound, ShieldCheck, Inbox,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard, roles: ["ADMIN","DIRECTORA","CONSULTORA"] },
  { href: "/catalogo",     label: "Catálogo",     icon: Package,         roles: ["ADMIN","DIRECTORA","CONSULTORA"] },
  { href: "/inventario",   label: "Inventario",   icon: BoxesIcon,       roles: ["ADMIN","DIRECTORA","CONSULTORA"] },
  { href: "/clientes",     label: "Clientes",     icon: Users,           roles: ["ADMIN","DIRECTORA","CONSULTORA"] },
  { href: "/ventas",       label: "Ventas",       icon: ShoppingCart,    roles: ["ADMIN","DIRECTORA","CONSULTORA"] },
  { href: "/solicitudes",  label: "Solicitudes",  icon: Inbox,           roles: ["ADMIN","DIRECTORA","CONSULTORA"], badge: true },
  { href: "/seguimientos", label: "Seguimientos", icon: CalendarCheck,   roles: ["ADMIN","DIRECTORA","CONSULTORA"] },
  { href: "/metas",        label: "Metas",        icon: Target,          roles: ["ADMIN","DIRECTORA","CONSULTORA"] },
  { href: "/consultoras",  label: "Consultoras",  icon: UserCog,         roles: ["ADMIN","DIRECTORA"] },
  { href: "/admin",        label: "Administrar",  icon: ShieldCheck,     roles: ["ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { data: user } = trpc.auth.me.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const { data: pendingRequests } = trpc.requests.pendingCount.useQuery(undefined, { staleTime: 60_000 });
  const role = user?.role ?? "CONSULTORA";
  const visible = navItems.filter((item) => item.roles.includes(role));

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className={cn(
      "hidden md:flex flex-col bg-white border-r border-gray-100 h-screen sticky top-0 transition-all duration-300 shadow-sm",
      collapsed ? "w-[68px]" : "w-60"
    )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 border-b border-gray-100 h-16 px-4 flex-shrink-0",
        collapsed && "justify-center px-3"
      )}>
        <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
          <Image src="/logo.png" alt="MiMary" width={36} height={36} className="w-full h-full object-contain" priority />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm leading-tight">
              <span className="text-gray-800">Mi</span><span className="text-mk-pink">Mary</span>
            </p>
            <p className="text-[11px] text-gray-400 capitalize leading-tight">{role.toLowerCase()}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <ul className="space-y-0.5 px-2">
          {visible.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                    active ? "bg-pink-50 text-mk-pink" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
                    collapsed && "justify-center px-0"
                  )}>
                  <div className="relative flex-shrink-0">
                    <item.icon size={18} className={cn("transition-colors", active ? "text-mk-pink" : "text-gray-400")} />
                    {item.badge && (pendingRequests ?? 0) > 0 && collapsed && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-mk-pink rounded-full" />
                    )}
                  </div>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && item.badge && (pendingRequests ?? 0) > 0 && (
                    <span className="ml-auto bg-mk-pink text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0">
                      {pendingRequests}
                    </span>
                  )}
                  {active && !collapsed && !(item.badge && (pendingRequests ?? 0) > 0) && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-mk-pink flex-shrink-0" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 p-3 space-y-1 flex-shrink-0">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
          </div>
        )}
        <Link
          href="/perfil"
          title={collapsed ? "Mi perfil" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors",
            collapsed && "justify-center px-0",
            pathname === "/perfil" && "bg-pink-50 text-mk-pink"
          )}>
          <CircleUserRound size={18} className="flex-shrink-0" />
          {!collapsed && <span>Mi perfil</span>}
        </Link>
        <button
          onClick={handleSignOut}
          title={collapsed ? "Cerrar sesión" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors",
            collapsed && "justify-center px-0"
          )}>
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] bg-white border border-gray-200 rounded-full w-6 h-6 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors z-10">
        {collapsed ? <ChevronRight size={12} className="text-gray-400" /> : <ChevronLeft size={12} className="text-gray-400" />}
      </button>
    </aside>
  );
}
