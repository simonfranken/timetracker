import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { TimerWidget } from './TimerWidget';

export function Layout() {
  return (
    <div className="h-[100vh] w-[100vw] flex flex-col bg-gray-50">
      <Navbar />
      <main className="grow min-h-0 overflow-auto pt-4 pb-8">
        <div className="mx-auto h-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <TimerWidget />
    </div>
  );
}
