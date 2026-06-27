"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  Settings,
  CreditCard,
  LogOut,
  User,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { authService } from "@/services/auth";
import { User as UserType } from "@/services/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Basic route protection
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    authService.getCurrentUser().then((user) => {
      if (!user) {
        // Create a default session if somehow logged out but token remains
        authService.register("Creator Chris", "chris@example.com", "password123").then((res) => {
          setCurrentUser(res.user);
        });
      } else {
        setCurrentUser(user);
      }
    });
  }, [router]);

  const handleLogout = async () => {
    await authService.logout();
    router.push("/login");
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row relative">
      {/* radial background glows */}
      <div className="absolute inset-0 bg-glow-radial pointer-events-none" />
      <div className="absolute -top-80 -right-80 w-160 h-160 rounded-full bg-indigo-600/5 blur-3xl pointer-events-none" />

      {/* MOBILE HEADER */}
      <header className="md:hidden h-16 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md px-4 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-sm text-white tracking-tighter">
            M
          </div>
          <span className="font-bold tracking-tight text-zinc-100">MotionAI</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-zinc-400 hover:text-zinc-200 focus:outline-none cursor-pointer"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* SIDEBAR FOR DESKTOP & MOBILE TRANSITIONS */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-zinc-900 bg-zinc-950/90 md:bg-zinc-950/40 backdrop-blur-xl flex flex-col transition-transform duration-300 md:translate-x-0 md:relative ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-6 hidden md:flex items-center gap-2 border-b border-zinc-900/60">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-base text-white tracking-tighter shadow-lg shadow-indigo-600/15">
            M
          </div>
          <span className="font-bold tracking-tight text-zinc-100">MotionAI</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-450 uppercase font-bold tracking-wider ml-auto">
            v1.0
          </span>
        </div>

        {/* Sidebar Nav links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  isActive
                    ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                    : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 border border-transparent"
                }`}
              >
                <Icon size={18} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Card info / Log out */}
        <div className="p-4 border-t border-zinc-900/60 space-y-4">
          {currentUser && (
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-zinc-900/40 border border-zinc-900">
              <div className="w-8 h-8 rounded-full bg-zinc-850 flex items-center justify-center overflow-hidden border border-zinc-800">
                {currentUser.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={14} className="text-zinc-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-200 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-zinc-500 truncate">{currentUser.email}</p>
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 text-xs font-medium text-red-400/80 hover:bg-red-500/5 hover:text-red-400 border border-transparent rounded-lg transition-all cursor-pointer"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile menu */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
        />
      )}

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-zinc-900/60 bg-zinc-950/20 backdrop-blur-md px-6 hidden md:flex items-center justify-between z-10 sticky top-0">
          <h2 className="text-sm font-semibold text-zinc-350">
            {pathname === "/dashboard" ? "Dashboard Overview" : pathname.includes("/projects/") ? "Project Workspace" : "Account Settings"}
          </h2>

          {/* User account stats / usage */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/5 border border-indigo-500/20 text-xs font-medium text-indigo-400 shadow-sm shadow-indigo-500/5">
              <Sparkles size={13} className="animate-pulse" />
              <span>95 credits left</span>
            </div>
          </div>
        </header>

        {/* Page Content area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
