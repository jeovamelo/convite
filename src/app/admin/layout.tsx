"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, QrCode, Ticket, Globe, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // If we are on the login page, don't render the sidebar
  if (pathname === "/admin/login") {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  const navItems = [
    { name: "Visão Geral", path: "/admin/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "Exibíveis", path: "/admin/gerador", icon: <Ticket size={20} /> },
    { name: "Recepção", path: "/admin/recepcao", icon: <QrCode size={20} /> },
    { name: "Site do Aniversário", path: "/", icon: <Globe size={20} />, external: true },
  ];

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-white/10">
        <h2 className="font-montserrat font-black italic text-sonicYellow text-xl uppercase leading-tight">
          LUIZ MAURÍCIO
        </h2>
        <div className="bg-sonicRed text-white text-[10px] font-bold px-2 py-0.5 rounded inline-block mt-1">
          4 ANOS
        </div>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.name}
              href={item.path}
              target={item.external ? "_blank" : "_self"}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-inter font-bold transition-all ${
                isActive 
                  ? "bg-sonicBlueMain text-white shadow-lg shadow-sonicBlueMain/30" 
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/admin/login");
            router.refresh();
          }}
          className="flex items-center justify-center gap-2 w-full p-3 rounded-xl text-white/50 hover:bg-white/10 hover:text-red-400 transition-colors font-bold text-sm"
        >
          <LogOut size={18} />
          SAIR
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-sonicBlueNavy text-white h-screen sticky top-0 shadow-2xl">
        <SidebarContent />
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
          <SidebarContent />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-0 pt-16 lg:pt-0 min-w-0">
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
