import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore.js';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import PublicRoute from './components/layout/PublicRoute.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ChatPage from './pages/ChatPage.jsx';

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // Validate session on app initialization
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      {/* Toast notifications container with ocean-friendly styling */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#FFFFFF',
            color: '#0B2A3C',
            border: '1px solid #D5EBF0',
            boxShadow: '0 8px 30px rgba(14, 165, 198, 0.14)',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 500,
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#0EA5C6',
              secondary: '#FFFFFF',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#FFFFFF',
            },
          },
        }}
      />

      <Routes>
        {/* Public Guest Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthPage initialMode="login" />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <AuthPage initialMode="register" />
            </PublicRoute>
          }
        />

        {/* Protected Authenticated Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
