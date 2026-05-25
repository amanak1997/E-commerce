import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'customer' | 'admin' | 'seller';
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login:    (email: string, password: string) => Promise<void>;
  register: (data: object) => Promise<void>;
  logout:   () => Promise<void>;
  fetchMe:  () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.login({ email, password });
          const { user, accessToken, refreshToken } = data.data;

          Cookies.set('accessToken',  accessToken,  { expires: 1 / 96 }); // 15 min
          Cookies.set('refreshToken', refreshToken, { expires: 7 });

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (formData) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.register(formData);
          const { user, accessToken, refreshToken } = data.data;

          Cookies.set('accessToken',  accessToken,  { expires: 1 / 96 });
          Cookies.set('refreshToken', refreshToken, { expires: 7 });

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        const refreshToken = Cookies.get('refreshToken');
        try {
          if (refreshToken) await authApi.logout(refreshToken);
        } catch {}
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        set({ user: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        if (!Cookies.get('accessToken')) return;
        try {
          const { data } = await authApi.me();
          set({ user: data.data.user, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'ecom-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
