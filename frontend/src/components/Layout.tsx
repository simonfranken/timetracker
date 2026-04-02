import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { TimerWidget } from './TimerWidget';

export function Layout() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <Navbar />
      <main
        className="grow min-h-0 overflow-auto pt-6"
        style={{ paddingBottom: "calc(var(--tt-timer-offset) + 1rem)" }}
      >
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <TimerWidget />
    </div>
  );
}
