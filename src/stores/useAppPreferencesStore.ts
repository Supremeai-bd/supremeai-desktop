import { create } from 'zustand';
import type { AppLanguage, UserRole } from '../types';
import { useAuthStore } from './useAuthStore';
import { useCustomerStore } from './useCustomerStore';

export interface AppPreferencesState {
  language: AppLanguage;
  role: UserRole;
  setLanguage: (language: AppLanguage, options?: { silent?: boolean }) => void;
  setRole: (role: UserRole) => void;
}

const normalizeLanguage = (lang?: unknown): AppLanguage => (lang === 'bn' ? 'bn' : 'en');

export const useAppPreferencesStore = create<AppPreferencesState>((set, get) => ({
  language: normalizeLanguage(useCustomerStore.getState().userSettings.language),
  role: useAuthStore.getState().currentRole,

  setLanguage: (language, options) => {
    const normalized = normalizeLanguage(language);
    if (get().language !== normalized) {
      set({ language: normalized });
    }
    if (useCustomerStore.getState().userSettings.language !== normalized) {
      useCustomerStore
        .getState()
        .updateSettings({ language: normalized }, Boolean(options?.silent));
    }
  },

  setRole: (role) => {
    useAuthStore.getState().handleToggleRole(role);
    const resolvedRole = useAuthStore.getState().currentRole;
    if (get().role !== resolvedRole) {
      set({ role: resolvedRole });
    }
  },
}));

// Keep centralized preferences synchronized whenever auth or customer settings hydrate/reset.
useCustomerStore.subscribe((state) => {
  const nextLang = normalizeLanguage(state.userSettings.language);
  if (useAppPreferencesStore.getState().language !== nextLang) {
    useAppPreferencesStore.setState({ language: nextLang });
  }
});

useAuthStore.subscribe((state) => {
  if (useAppPreferencesStore.getState().role !== state.currentRole) {
    useAppPreferencesStore.setState({ role: state.currentRole });
  }
});
