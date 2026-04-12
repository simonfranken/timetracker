import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-300/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />

      <div className="relative w-full max-w-md space-y-7 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center">
            <img src="/icon.svg" alt="TimeTracker Logo" className="h-16 w-16" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-slate-900 sm:text-3xl">TimeTracker</h2>
          <p className="mt-2 text-sm text-slate-600">
            Track your time efficiently across multiple projects and clients
          </p>
        </div>

        <div>
          <button onClick={login} className="btn-primary w-full justify-center py-3">
            Sign in with SSO
          </button>
          <p className="mt-4 text-center text-xs text-slate-500">
            Secure authentication via OpenID Connect
          </p>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <div className="grid grid-cols-3 gap-2 text-center sm:gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight text-slate-900 sm:text-2xl">Simple</div>
              <div className="mt-1 text-xs leading-tight text-slate-500">Start/Stop Timer</div>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight text-slate-900 sm:text-2xl">Organized</div>
              <div className="mt-1 text-xs leading-tight text-slate-500">Clients & Projects</div>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight text-slate-900 sm:text-2xl">Detailed</div>
              <div className="mt-1 text-xs leading-tight text-slate-500">Time Reports</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
