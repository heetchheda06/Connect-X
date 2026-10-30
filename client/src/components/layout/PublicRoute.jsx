import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

export default function PublicRoute({ children }) {
  const { isAuthenticated, isCheckingAuth } = useAuthStore();

  // If still checking auth on page refresh, don't abruptly redirect yet
  if (isCheckingAuth) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
}

