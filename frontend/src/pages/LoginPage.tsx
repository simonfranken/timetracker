import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center drop-shadow-sm">
            <img src="/icon.svg" alt="TimeTracker Logo" className="h-16 w-16" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">TimeTracker</h2>
          <p className="mt-2 text-sm text-gray-600">
            Track your time efficiently across multiple projects and clients
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={login}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Sign in with SSO
          </button>
          <p className="mt-4 text-xs text-center text-gray-500">
            Secure authentication via OpenID Connect
          </p>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">Simple</div>
              <div className="text-xs text-gray-500">Start/Stop Timer</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">Organized</div>
              <div className="text-xs text-gray-500">Clients & Projects</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">Detailed</div>
              <div className="text-xs text-gray-500">Time Reports</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}