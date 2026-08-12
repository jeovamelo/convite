"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, QrCode, Ticket, Globe, LogOut, Menu, X, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [eventComplete, setEventComplete] = useState(false);

  // Check if event configuration is complete
  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => r.json())
      .then((data) => {
        const requiredFields = ["day", "time", "place_name", "address_line1", "address_line2"];
        const allFilled = requiredFields.every(
          (f) => data[f] && String(data[f]).trim().length > 0
        );
        setEventComplete(allFilled && data.configured !== false);
      })
      .catch(() => setEventComplete(false));
  }, [pathname]); // re-check when navigating

  // If we are on the login page, don't render the sidebar
  if (pathname === "/admin/login") {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  const navItems: { name: string; path: string; icon: React.ReactNode; badge?: React.ReactNode }[] = [
    { name: "Visão Geral", path: "/admin/dashboard", icon: <LayoutDashboard size={20} /> },
    {
      name: "Evento",
      path: "/admin/evento",
      icon: <CalendarDays size={20} />,
      badge: eventComplete ? <CheckCircle2 size={16} className="text-green-400 ml-auto shrink-0" /> : null,
    },
    { name: "Exibíveis", path: "/admin/gerador", icon: <Ticket size={20} /> },
    { name: "Recepção", path: "/admin/recepcao", icon: <QrCode size={20} /> },
    { name: "Site do Aniversário", path: "/admin/site-config", icon: <Globe size={20} /> },
  ];

  const SidebarContent = ({ collapsed }: { collapsed: boolean }) => (
    <>
      <div className={`p-4 border-b border-white/10 flex items-center justify-between min-h-[73px] ${collapsed ? "flex-col gap-2 justify-center py-4" : ""}`}>
        {!collapsed ? (
          <div>
            <h2 className="font-montserrat font-black italic text-sonicYellow text-lg uppercase leading-tight">
              LUIZ MAURÍCIO
            </h2>
            <div className="bg-sonicRed text-white text-[10px] font-bold px-2 py-0.5 rounded inline-block mt-0.5">
              4 ANOS
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span className="font-montserrat font-black italic text-sonicYellow text-sm">LM</span>
            <span className="bg-sonicRed text-white text-[9px] font-bold px-1 rounded">4A</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex items-center justify-center p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
          title={collapsed ? "Expandir Menu" : "Recolher Menu"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.name}
              href={item.path}
              title={collapsed ? item.name : undefined}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl font-inter font-bold transition-all relative ${
                collapsed ? "justify-center" : ""
              } ${
                isActive 
                  ? "bg-sonicBlueMain text-white shadow-lg shadow-sonicBlueMain/30" 
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="shrink-0">{item.icon}</div>
              {!collapsed && (
                <>
                  <span className="truncate text-sm">{item.name}</span>
                  {item.badge}
                </>
              )}
              {collapsed && eventComplete && item.name === "Evento" && (
                <div className="w-2 h-2 rounded-full bg-green-400 absolute top-2 right-2" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-white/10">
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/admin/login");
            router.refresh();
          }}
          title={collapsed ? "Sair" : undefined}
          className={`flex items-center justify-center gap-2 w-full p-3 rounded-xl text-white/50 hover:bg-white/10 hover:text-red-400 transition-colors font-bold text-sm ${
            collapsed ? "px-0" : ""
          }`}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>SAIR</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Desktop */}
      <aside className={`hidden lg:flex flex-col bg-sonicBlueNavy text-white h-screen sticky top-0 shadow-2xl transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-72"
      }`}>
        <SidebarContent collapsed={isCollapsed} />
      </aside>

      {/* Header Mobile */}
      <div className="lg:hidden fixed top-0 left-0 w-full h-16 bg-sonicBlueNavy text-white flex items-center justify-between px-4 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <h2 className="font-montserrat font-black italic text-sonicYellow text-lg uppercase">
            LUIZ MAURÍCIO
          </h2>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-white/10 rounded-lg">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Menu Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-sonicBlueNavy z-40 flex flex-col">
          <SidebarContent collapsed={false} />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-0 pt-16 lg:pt-0 min-w-0">
        <div className="p-4 lg:p-8 w-full max-w-[1700px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

