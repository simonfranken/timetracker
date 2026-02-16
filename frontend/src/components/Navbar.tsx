import { NavLink } from 'react-router-dom';
import { Clock, List, Briefcase, FolderOpen, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: Clock },
    { to: '/time-entries', label: 'Time Entries', icon: List },
    { to: '/clients', label: 'Clients', icon: Briefcase },
    { to: '/projects', label: 'Projects', icon: FolderOpen },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Clock className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">TimeTracker</span>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </NavLink>
              ))}
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
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center p-2 text-xs font-medium rounded-md ${
                  isActive ? 'text-primary-600' : 'text-gray-600'
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