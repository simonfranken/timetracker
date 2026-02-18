import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { TimerWidget } from './TimerWidget';

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-4 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <TimerWidget />
    </div>
  );
}