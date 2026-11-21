import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Clock,
  MoreHorizontal,
  Key,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTimer } from "@/contexts/TimerContext";
import { formatDuration } from "@/utils/dateUtils";

interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

const MAIN_NAV: NavItem[] = [
  { to: "/dashboard", label: "Today", shortLabel: "Today", icon: Clock },
  { to: "/time-entries", label: "Timesheet", shortLabel: "Timesheet", icon: CalendarDays },
  { to: "/statistics", label: "Insights & targets", shortLabel: "Insights", icon: BarChart3 },
  { to: "/clients", label: "Clients & projects", shortLabel: "Library", icon: Briefcase },
];

const API_KEYS_NAV: NavItem = {
  to: "/api-keys",
  label: "API keys",
  shortLabel: "API keys",
  icon: Key,
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function RunningTimerLink({ compact = false }: { compact?: boolean }) {
  const { ongoingTimer, elapsedSeconds } = useTimer();
  if (!ongoingTimer) return null;

  return (
    <Link
      to="/dashboard"
      className={
        compact
          ? "mx-3 mb-2 flex items-center gap-2 rounded-xl border border-danger-line bg-danger-wash px-3 py-2 text-sm font-semibold text-danger"
          : "mb-2 flex items-center gap-2 rounded-xl border border-danger-line bg-danger-wash px-3 py-2.5 text-sm font-semibold text-danger"
      }
      aria-label="Timer running, open Today"
    >
      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-danger" aria-hidden="true" />
      <span className="tabular min-w-0 flex-1 truncate">
        {ongoingTimer.project?.name ?? "Tracking now"}
      </span>
      <span className="tabular">{formatDuration(elapsedSeconds)}</span>
    </Link>
  );
}

function SidebarUser() {
  const { user, logout } = useAuth();
  const name = user?.fullName || user?.username || "";

  return (
    <div className="mt-2 flex items-center gap-2.5 border-t border-paper-line p-3">
      <span
        className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-primary-100 text-[13px] font-bold text-primary-800"
        aria-hidden="true"
      >
        {initialsOf(name)}
      </span>
      <div className="min-w-0 flex-1 text-sm font-semibold">
        <div className="truncate">{name}</div>
        <button
          type="button"
          onClick={logout}
          className="text-xs font-normal text-ink-muted hover:text-ink hover:underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] font-medium transition-colors ${
    isActive
      ? "bg-white text-primary-800 shadow-sm"
      : "text-ink-soft hover:bg-paper-hover"
  }`;

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 border-r border-paper-line px-4 py-6 md:flex">
      <div className="flex items-center gap-2.5 px-3 pb-6 text-lg font-bold">
        <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-primary-600">
          <Clock className="h-[18px] w-[18px] text-white" strokeWidth={2.2} aria-hidden="true" />
        </span>
        Timetracker
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1">
        {MAIN_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={navLinkClass}>
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />

      <RunningTimerLink />
      <NavLink to={API_KEYS_NAV.to} className={navLinkClass}>
        <API_KEYS_NAV.icon className="h-5 w-5" aria-hidden="true" />
        {API_KEYS_NAV.label}
      </NavLink>
      <SidebarUser />
    </aside>
  );
}

export function MobileTabBar() {
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
      isActive ? "text-primary-800" : "text-ink-muted"
    }`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 md:hidden" ref={moreRef}>
      <RunningTimerLink compact />
      {moreOpen && (
        <div className="absolute bottom-full right-3 mb-2 w-56 rounded-2xl border border-paper-line bg-white p-1.5 shadow-xl">
          <div className="truncate px-3 py-2 text-xs font-semibold text-ink-muted">
            {user?.fullName || user?.username}
          </div>
          <NavLink
            to={API_KEYS_NAV.to}
            onClick={() => setMoreOpen(false)}
            className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink-soft hover:bg-paper-hover"
          >
            <Key className="h-4 w-4" aria-hidden="true" /> API keys
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink-soft hover:bg-paper-hover"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
      <nav
        aria-label="Main"
        className="flex border-t border-paper-line bg-white px-1 pb-3 pt-1"
      >
        {MAIN_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={tabClass}>
            <item.icon className="h-[22px] w-[22px]" aria-hidden="true" />
            {item.shortLabel}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-ink-muted"
        >
          <MoreHorizontal className="h-[22px] w-[22px]" aria-hidden="true" />
          More
        </button>
      </nav>
    </div>
  );
}
