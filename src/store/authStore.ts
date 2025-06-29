import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  _id: string;
  employeeId: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    position: string;
    department: string;
    location: string;
    phone: string;
  };
  permissions: {
    role: 'technical_field' | 'supervisor_maintenance' | 'maintenance_manager' | 
          'operations_superintendent' | 'procurement_manager' | 'financial_manager' | 
          'general_manager';
    approvalLimits: {
      maxAmount: number;
      currency: string;
      categories: string[];
    };
    areas: string[];
    specialPermissions: string[];
  };
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshToken: () => Promise<boolean>;
}

const API_BASE_URL = 'http://localhost:3001/api';

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      loading: false,
      
      login: async (email: string, password: string) => {
        set({ loading: true });
        try {
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (response.ok) {
            set({
              user: data.user,
              isAuthenticated: true,
              token: data.token,
              loading: false
            });
            return true;
          } else {
            set({ loading: false });
            console.error('Login failed:', data.message);
            return false;
          }
        } catch (error) {
          set({ loading: false });
          console.error('Login error:', error);
          return false;
        }
      },
      
      logout: async () => {
        const { token } = get();
        
        try {
          if (token) {
            await fetch(`${API_BASE_URL}/auth/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            token: null
          });
        }
      },
      
      updateUser: (user: User) => {
        set({ user });
      },

      refreshToken: async () => {
        const { token } = get();
        if (!token) return false;

        try {
          const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();

          if (response.ok) {
            set({ token: data.token });
            return true;
          } else {
            // Token refresh failed, logout user
            get().logout();
            return false;
          }
        } catch (error) {
          console.error('Token refresh error:', error);
          get().logout();
          return false;
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        token: state.token
      })
    }
  )
);