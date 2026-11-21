import { Outlet } from "react-router-dom";
import { MobileTabBar, Sidebar } from "./Sidebar";

export function Layout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 pb-32 pt-6 sm:px-6 md:px-10 md:pb-10 md:pt-8">
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  );
}
