'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PlayerProfile, getLevelFromXp } from '@/lib/db';

interface AuthContextType {
  player: PlayerProfile | null;
  progress: ReturnType<typeof getLevelFromXp> | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (username: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password?: string, email?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLocalPlayer: (updated: PlayerProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [progress, setProgress] = useState<ReturnType<typeof getLevelFromXp> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const refreshProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.authenticated && data.player) {
        setPlayer(data.player);
        setProgress(data.progress);
      } else {
        // Se não estiver logado, permanece como Visitante (Guest)
        setPlayer(null);
        setProgress(null);
      }
    } catch (err) {
      console.error('Falha ao autenticar sessão:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (username: string, password = '') => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setPlayer(data.player);
        setProgress(data.progress);
        setIsAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: data.error || 'Erro ao realizar login.' };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Falha na conexão.' };
    }
  };

  const register = async (username: string, password = '', email = '') => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', username, password, email }),
      });
      const data = await res.json();
      if (data.success) {
        setPlayer(data.player);
        setProgress(data.progress);
        setIsAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: data.error || 'Erro ao criar conta.' };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Falha na conexão.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/me', { method: 'POST' });
      await refreshProfile();
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  const updateLocalPlayer = (updated: PlayerProfile) => {
    setPlayer(updated);
    setProgress(getLevelFromXp(updated.xp));
  };

  return (
    <AuthContext.Provider
      value={{
        player,
        progress,
        loading,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        login,
        register,
        logout,
        refreshProfile,
        updateLocalPlayer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
