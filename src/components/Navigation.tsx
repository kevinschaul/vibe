"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PenSquare,
  BarChart2,
  Settings,
  Zap,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Compose", icon: PenSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/accounts", label: "Accounts", icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      }`}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-56 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-4">
      <div className="flex items-center gap-2 px-3 mb-6">
        <Zap size={20} className="text-violet-600" />
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">Vibe</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            active={pathname === item.href}
          />
        ))}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Top bar */}
      <header className="md:hidden flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-violet-600" />
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">Vibe</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-zinc-900 px-3 py-4 shadow-xl">
            <div className="flex items-center justify-between px-3 mb-6">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-violet-600" />
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">Vibe</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.href}
                  {...item}
                  active={pathname === item.href}
                  onClick={() => setOpen(false)}
                />
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
