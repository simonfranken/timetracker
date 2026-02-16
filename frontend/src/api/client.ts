import axios, { AxiosError } from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; details?: unknown }>) => {
    if (error.response?.status === 401) {
      // Redirect to login on 401
      window.location.href = '/login';
      return Promise.reject(error);
    }

    const message = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;