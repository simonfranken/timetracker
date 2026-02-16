import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refetchUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const success = searchParams.get('success');
      const error = searchParams.get('error');

      if (error) {
        navigate('/login', { replace: true });
        return;
      }

      if (success === 'true') {
        await refetchUser();
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [searchParams, navigate, refetchUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}