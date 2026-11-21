import { Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md space-y-7 p-6 sm:p-8">
        <div className="text-center">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600">
            <Clock className="h-8 w-8 text-white" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <h1 className="m-0 mt-5 text-2xl font-bold sm:text-3xl">Timetracker</h1>
          <p className="mt-2 text-[15px] text-ink-muted">
            Track your time across clients and projects, and keep an eye on your hourly targets.
          </p>
        </div>

        <div>
          <button type="button" onClick={login} className="btn-primary min-h-12 w-full">
            Sign in with SSO
          </button>
          <p className="mt-4 text-center text-xs text-ink-muted">
            Secure authentication via OpenID Connect
          </p>
        </div>

        <div className="border-t border-paper-line pt-6">
          <div className="grid grid-cols-3 gap-2 text-center sm:gap-4">
            {[
              ["Simple", "Start/Stop timer"],
              ["Organized", "Clients & projects"],
              ["On target", "Balances & insights"],
            ].map(([title, text]) => (
              <div key={title} className="min-w-0">
                <div className="text-sm font-semibold leading-tight sm:text-lg">{title}</div>
                <div className="mt-1 text-xs leading-tight text-ink-muted">{text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
