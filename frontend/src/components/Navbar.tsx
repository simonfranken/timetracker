import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  List,
  Briefcase,
  FolderOpen,
  BarChart3,
  LogOut,
  ChevronDown,
  Settings,
  Key,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useRef, useEffect } from "react";

export function Navbar() {
  const { user, logout } = useAuth();
  const [managementOpen, setManagementOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setManagementOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const mainNavItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/time-entries", label: "Time Entries", icon: List },
    { to: "/statistics", label: "Statistics", icon: BarChart3 },
  ];

  const managementItems = [
    { to: "/clients", label: "Clients", icon: Briefcase },
    { to: "/projects", label: "Projects", icon: FolderOpen },
    { to: "/api-keys", label: "API Keys", icon: Key },
  ];

  return (
    <nav className="relative z-50 border-b border-white/50 bg-slate-50/70 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex min-w-0 items-center">
            <NavLink
              className="flex shrink-0 items-center"
              to={"/dashboard"}
            >
              <img
                src="/icon.svg"
                alt="TimeTracker Logo"
                className="h-8 w-8"
              />
              <span className="ml-2 text-xl font-semibold text-slate-900">
                TimeTracker
              </span>
            </NavLink>
            <div className="hidden items-center sm:ml-8 sm:flex sm:space-x-2">
              {/* Main Navigation Items */}
              {mainNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `inline-flex h-min items-center rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-indigo-100/80 text-indigo-700"
                        : "text-slate-600 hover:bg-white hover:text-slate-900"
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </NavLink>
              ))}

              {/* Management Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setManagementOpen(!managementOpen)}
                  className={`inline-flex h-full items-center rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                    managementOpen
                      ? "bg-indigo-100/80 text-indigo-700"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  <span>Management</span>
                  <ChevronDown
                    className={`h-4 w-4 ml-1 transition-transform ${managementOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {managementOpen && (
                  <div className="absolute left-0 top-full z-[70] mt-2 w-52 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl">
                    {managementItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setManagementOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center rounded-xl px-3 py-2 text-sm font-medium transition ${
                            isActive
                              ? "bg-indigo-100 text-indigo-700"
                              : "text-slate-700 hover:bg-slate-100"
                          }`
                        }
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <span className="hidden text-sm font-medium text-slate-600 sm:block">
              {user?.fullName || user?.username}
            </span>
            <button
              onClick={logout}
              className="inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="border-t border-white/60 sm:hidden">
        <div className="grid grid-cols-3 gap-1 px-2 py-2">
          {/* Mobile: Show all nav items directly (no dropdown) */}
          {[...mainNavItems, ...managementItems].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-w-[80px] flex-col items-center rounded-xl p-2 text-xs font-semibold ${
                  isActive
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-slate-600 hover:bg-white"
                }`
              }
            >
              <item.icon className="h-5 w-5 mb-1" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
