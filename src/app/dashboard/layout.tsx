"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
  LayoutDashboard,
  Gamepad2,
  Users,
  Swords,
  LogOut,
  Sparkles,
  Crown,
  Moon,
  Sun,
  User,
  Menu,
  X,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; role: string; squad?: string } | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const userJson = localStorage.getItem("user");
    if (!userJson) {
      router.push("/");
    } else {
      setUser(JSON.parse(userJson));
    }
    
    // Check dark mode
    if (document.documentElement.classList.contains("dark")) {
      setIsDark(true);
    } else {
      const theme = localStorage.getItem("theme");
      if (theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        setIsDark(true);
        document.documentElement.classList.add("dark");
      }
    }
  }, [router]);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  if (!user) return null;

  const links = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "Game Log", href: "/dashboard/games", icon: <Gamepad2 className="h-4 w-4" /> },
    { label: "Player Stats", href: "/dashboard/players", icon: <Users className="h-4 w-4" /> },
    { label: "Rankings", href: "/dashboard/ranking", icon: <Crown className="text-amber-500 h-4 w-4" /> },
    { label: "Team Comps", href: "/dashboard/comps", icon: <Swords className="h-4 w-4" /> },
    { label: "Draft Simulator", href: "/dashboard/draft", icon: <Sparkles className="h-4 w-4" /> },
    { label: "Meta", href: "/dashboard/meta", icon: <TrendingUp className="h-4 w-4" /> },
  ];

  if (user.role === "admin") {
    links.push({
      label: "Profile",
      href: "/dashboard/profile",
      icon: <User className="h-4 w-4" />,
    });
  }

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push("/");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-black w-full mx-auto overflow-hidden">
      {/* Top Navbar */}
      <header className="flex-none bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 z-40 relative">
        <div className="flex items-center justify-between px-4 lg:px-8 h-16 w-full max-w-[1600px] mx-auto">
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-2xl">⚔️</span>
              {/* User requested black color (or dark mode compatible solid color) */}
              <span className="font-black text-xl text-neutral-900 dark:text-white hidden sm:block tracking-tight">
                SentinelMLBB
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 mx-4">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all",
                    isActive
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-black shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800"
                  )}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2 lg:gap-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors"
              title="Toggle Dark Mode"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block mx-1"></div>
            
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-black font-bold text-sm shrink-0 shadow-sm uppercase">
                {user.name[0]}
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                  {user.name}
                </span>
                <span className="text-[10px] font-semibold text-neutral-500 capitalize leading-tight">
                  {user.squad || user.role}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 ml-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden absolute top-16 left-0 right-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-xl z-30"
          >
            <div className="p-4 flex flex-col gap-1">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                      isActive
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
                        : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800"
                    )}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-black w-full h-full relative">
        <div className="max-w-[1600px] mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
