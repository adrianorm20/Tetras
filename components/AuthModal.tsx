'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { X, Lock, User, Mail, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    if (tab === 'login') {
      const res = await login(username, password);
      if (!res.success) {
        setError(res.error || 'Erro no login.');
      } else {
        setSuccessMsg('Login realizado!');
      }
    } else {
      const res = await register(username, password, email);
      if (!res.success) {
        setError(res.error || 'Erro no cadastro.');
      } else {
        setSuccessMsg('Conta criada com sucesso!');
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,242,254,0.15)]">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-fuchsia-500 p-[2px] shadow-[0_0_15px_rgba(0,242,254,0.4)]">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Sparkles size={18} className="text-cyan-300" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-wide">
              {tab === 'login' ? 'ENTRAR NA CONTA' : 'CRIAR NOVA CONTA'}
            </h3>
            <p className="text-xs font-mono text-slate-400">
              Sincronização instantânea de progresso
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl mb-5 border border-slate-800">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              tab === 'login'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Fazer Login
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              tab === 'register'
                ? 'bg-gradient-to-r from-fuchsia-500 to-pink-600 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
              Nome de Usuário (Nick)
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: Adriano_Master"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono transition"
              />
            </div>
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                E-mail (Opcional)
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-fuchsia-400 font-mono transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 mt-2 rounded-xl text-slate-950 font-black text-sm tracking-wider uppercase transition shadow-lg disabled:opacity-50 ${
              tab === 'login'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 shadow-[0_0_20px_rgba(0,242,254,0.3)]'
                : 'bg-gradient-to-r from-fuchsia-400 to-pink-500 hover:brightness-110 shadow-[0_0_20px_rgba(217,70,239,0.3)]'
            }`}
          >
            {loading ? 'Processando...' : tab === 'login' ? 'Entrar Agora' : 'Criar Conta Gratuita'}
          </button>
        </form>
      </div>
    </div>
  );
}
