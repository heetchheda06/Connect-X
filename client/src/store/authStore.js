import { create } from 'zustand';
import { loginApi, registerApi, getMeApi, logoutApi } from '../api/auth.api.js';

const getInitialUser = () => {
  try {
    const stored = localStorage.getItem('connectx_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const getInitialToken = () => {
  return localStorage.getItem('connectx_token') || null;
};

export const useAuthStore = create((set, get) => ({
  user: getInitialUser(),
  token: getInitialToken(),
  isAuthenticated: Boolean(getInitialToken()),
  isLoading: false,
  isCheckingAuth: true,
  error: null,

  // Verify stored token on app load or refresh
  checkAuth: async () => {
    const token = localStorage.getItem('connectx_token');
    if (!token) {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isCheckingAuth: false,
      });
      return false;
    }

    try {
      set({ isCheckingAuth: true });
      const res = await getMeApi();
      if (res.success && res.data?.user) {
        localStorage.setItem('connectx_user', JSON.stringify(res.data.user));
        set({
          user: res.data.user,
          isAuthenticated: true,
          isCheckingAuth: false,
          error: null,
        });
        return true;
      }
      throw new Error('Failed to validate session');
    } catch (err) {
      localStorage.removeItem('connectx_token');
      localStorage.removeItem('connectx_user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isCheckingAuth: false,
      });
      return false;
    }
  },

  login: async (credentials) => {
    try {
      set({ isLoading: true, error: null });
      const res = await loginApi(credentials);

      if (res.success && res.data) {
        const { user, token } = res.data;
        localStorage.setItem('connectx_token', token);
        localStorage.setItem('connectx_user', JSON.stringify(user));

        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return { success: true, user };
      }
      throw new Error(res.message || 'Login failed');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  register: async (userData) => {
    try {
      set({ isLoading: true, error: null });
      const res = await registerApi(userData);

      if (res.success && res.data) {
        const { user, token } = res.data;
        localStorage.setItem('connectx_token', token);
        localStorage.setItem('connectx_user', JSON.stringify(user));

        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return { success: true, user };
      }
      throw new Error(res.message || 'Registration failed');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  logout: async () => {
    try {
      await logoutApi().catch(() => {});
    } finally {
      localStorage.removeItem('connectx_token');
      localStorage.removeItem('connectx_user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  updateUser: (updatedFields) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updated = { ...currentUser, ...updatedFields };
    localStorage.setItem('connectx_user', JSON.stringify(updated));
    set({ user: updated });
  },

  clearError: () => set({ error: null }),
}));

