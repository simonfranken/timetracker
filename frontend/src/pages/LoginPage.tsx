import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-300/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />

      <div className="relative w-full max-w-md space-y-7 rounded-3xl border border-white/60 bg-white/90 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center">
            <img src="/icon.svg" alt="TimeTracker Logo" className="h-16 w-16" />
          </div>
          <h2 className="mt-5 text-3xl font-semibold text-slate-900">TimeTracker</h2>
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
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-semibold text-slate-900">Simple</div>
              <div className="text-xs text-slate-500">Start/Stop Timer</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-slate-900">Organized</div>
              <div className="text-xs text-slate-500">Clients & Projects</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-slate-900">Detailed</div>
              <div className="text-xs text-slate-500">Time Reports</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
