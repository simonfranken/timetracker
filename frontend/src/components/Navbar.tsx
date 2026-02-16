import { NavLink } from "react-router-dom";
import {
  Clock,
  List,
  Briefcase,
  FolderOpen,
  BarChart3,
  LogOut,
  ChevronDown,
  Settings,
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
    { to: "/dashboard", label: "Dashboard", icon: Clock },
    { to: "/time-entries", label: "Time Entries", icon: List },
    { to: "/statistics", label: "Statistics", icon: BarChart3 },
  ];

  const managementItems = [
    { to: "/clients", label: "Clients", icon: Briefcase },
    { to: "/projects", label: "Projects", icon: FolderOpen },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Clock className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                TimeTracker
              </span>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
              {/* Main Navigation Items */}
              {mainNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? "text-primary-600 bg-primary-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
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
                  className={`inline-flex h-full items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    managementOpen
                      ? "text-primary-600 bg-primary-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  <span>Management</span>
                  <ChevronDown
                    className={`h-4 w-4 ml-1 transition-transform ${managementOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {managementOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    {managementItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setManagementOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center px-4 py-2 text-sm transition-colors ${
                            isActive
                              ? "bg-primary-50 text-primary-600"
                              : "text-gray-700 hover:bg-gray-50"
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
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 hidden sm:block">
              {user?.username}
            </span>
            <button
              onClick={logout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="sm:hidden border-t border-gray-200">
        <div className="flex flex-wrap">
          {/* Mobile: Show all nav items directly (no dropdown) */}
          {[...mainNavItems, ...managementItems].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 min-w-[80px] flex flex-col items-center p-2 text-xs font-medium ${
                  isActive ? "text-primary-600" : "text-gray-600"
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
