"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Gamepad2,
  Users,
  Trophy,
  Swords,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Navbar,
  NavBody,
  NavbarLogo,
  MobileNav,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    const userJson = localStorage.getItem("user");
    if (!userJson) {
      router.push("/");
    } else {
      setUser(JSON.parse(userJson));
    }
  }, [router]);

  if (!user) return null;

  const links = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />,
    },
    {
      label: "Game Log",
      href: "/dashboard/games",
      icon: <Gamepad2 className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />,
    },
    {
      label: "Player Stats",
      href: "/dashboard/players",
      icon: <Users className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />,
    },
    {
      label: "Hero Pool",
      href: "/dashboard/heroes",
      icon: <Trophy className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />,
    },
    {
      label: "Team Comps",
      href: "/dashboard/comps",
      icon: <Swords className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />,
    },
  ];

  if (user.role === "admin") {
    links.push({
      label: "Admin Panel",
      href: "/dashboard/admin",
      icon: <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 shrink-0" />,
    });
  }

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push("/");
  };

  return (
    <div
      className={cn(
        "rounded-md flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-900 w-full flex-1 max-w-full mx-auto border border-neutral-200 dark:border-neutral-700 overflow-hidden",
        "h-screen"
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <div className="flex items-center gap-2 px-2 py-4">
              <motion.div
                animate={{ rotate: open ? 360 : 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="text-2xl"
              >
                ⚔️
              </motion.div>
              {open && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500 whitespace-pre"
                >
                  SentinelMLBB
                </motion.span>
              )}
            </div>
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
              <div
                onClick={handleLogout}
                className="flex items-center justify-start gap-2 group/sidebar py-2 px-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-red-500 hover:text-red-600"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                {open && <span className="font-medium whitespace-pre">Logout</span>}
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-start gap-2 group/sidebar py-2 px-2">
              <motion.div
                whileHover={{ scale: 1.15, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center text-white font-bold text-xs shrink-0 cursor-pointer shadow-lg shadow-indigo-500/30"
              >
                {user.name[0]?.toUpperCase()}
              </motion.div>
              {open && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col whitespace-pre"
                >
                  <span className="text-sm text-neutral-700 dark:text-neutral-200 font-medium">
                    {user.name}
                  </span>
                  <span className="text-xs text-neutral-500 capitalize">
                    {user.role}
                  </span>
                </motion.div>
              )}
            </div>
          </div>
        </SidebarBody>
      </Sidebar>
      <main className="flex flex-col flex-1 overflow-hidden bg-white dark:bg-black rounded-tl-2xl border border-neutral-200 dark:border-neutral-700">
        <div className="relative w-full border-b border-neutral-200 dark:border-neutral-800">
          <Navbar>
            <NavBody>
              <div className="flex items-center w-full justify-between px-4">
                <span className="font-bold text-lg hidden md:block bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500">SentinelMLBB</span>
              </div>
            </NavBody>
            <MobileNav>
              <MobileNavHeader>
                <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500">SentinelMLBB</span>
                <MobileNavToggle isOpen={false} onClick={() => {}} />
              </MobileNavHeader>
            </MobileNav>
          </Navbar>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-10 w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
