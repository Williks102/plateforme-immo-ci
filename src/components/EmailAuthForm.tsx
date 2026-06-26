'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'login' | 'register';
type Role = 'client' | 'proprietaire';

interface Props {
  redirectTo?: string;
}

export function EmailAuthForm({ redirectTo = '/' }: Props) {
  const router = useRouter();
  const [tab, setTab]         = useState<Tab>('login');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]       = useState<Role>('client');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = tab === 'login'
        ? { email, password }
        : { email, password, role };

      const res  = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push(data.role === 'admin' ? '/admin' : redirectTo);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-5">
      {/* Onglets */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        {(['login', 'register'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t === 'login' ? 'Connexion' : 'Créer un compte'}
          </button>
        ))}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Adresse email
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="vous@example.com"
          autoComplete="email"
          className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Mot de passe */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mot de passe
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={tab === 'register' ? '8 caractères minimum' : '••••••••'}
          autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
          className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Rôle (inscription seulement) */}
      {tab === 'register' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Je suis
          </label>
          <div className="flex gap-3">
            {(['client', 'proprietaire'] as Role[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  role === r
                    ? 'bg-orange-50 border-orange-500 text-orange-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {r === 'client' ? 'Locataire' : 'Propriétaire'}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm text-center">{error}</p>
      )}

      <button
        onClick={submit}
        disabled={loading || !email || password.length < (tab === 'register' ? 8 : 1)}
        className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 hover:bg-orange-700 transition-colors"
      >
        {loading
          ? '...'
          : tab === 'login'
            ? 'Se connecter'
            : 'Créer mon compte'}
      </button>
    </div>
  );
}
