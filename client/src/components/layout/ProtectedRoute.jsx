import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { Waves } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isCheckingAuth } = useAuthStore();
  const location = useLocation();

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-app flex flex-col items-center justify-center p-4">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center text-white shadow-brand-lg animate-pulse mb-4">
            <Waves className="w-8 h-8 animate-bounce" />
          </div>
          <div className="flex items-center gap-2 text-brand-600 font-heading font-semibold text-sm">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
            Connecting to your session...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ? children : <Outlet />;
}

