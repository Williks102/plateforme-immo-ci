'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface TotpData {
  qrCode: string;
  secret: string;
}

export default function AdminTotpSetupPage() {
  const router = useRouter();
  const [data, setData]         = useState<TotpData | null>(null);
  const [token, setToken]       = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    fetch('/api/auth/totp-setup')
      .then(r => r.json())
      .then(d => {
        if (d.enabled) {
          setSuccess(true);
        } else {
          setData(d);
        }
      })
      .catch(() => setError('Impossible de charger la configuration TOTP'));
  }, []);

  const activate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/totp-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.replace(/\s/g, '') }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error ?? 'Code incorrect');
      } else {
        setSuccess(true);
        setTimeout(() => router.push('/admin'), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[80vh]">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm">
          <p className="text-5xl mb-4">✅</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">2FA Activée</h2>
          <p className="text-gray-500 text-sm">L'authentification à deux facteurs est active sur votre compte admin.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[80vh]">
        <p className="text-gray-400">{error || 'Chargement...'}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuration 2FA</h1>
        <p className="text-gray-500 text-sm mb-6">
          Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy…)
        </p>

        {/* QR Code */}
        <div className="flex justify-center mb-6">
          <Image
            src={data.qrCode}
            alt="QR Code TOTP"
            width={200}
            height={200}
            className="rounded-xl border"
            unoptimized
          />
        </div>

        {/* Clé secrète manuelle */}
        <details className="mb-6">
          <summary className="text-sm text-gray-500 cursor-pointer">Entrer la clé manuellement</summary>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
            <code className="text-xs break-all font-mono text-gray-700">{data.secret}</code>
          </div>
        </details>

        {/* Formulaire de vérification */}
        <form onSubmit={activate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code de vérification (6 chiffres)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={token}
              onChange={e => setToken(e.target.value)}
              maxLength={6}
              placeholder="123456"
              className="w-full px-4 py-3 border rounded-xl text-center text-2xl font-mono tracking-widest"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || token.length < 6}
            className="w-full py-3 bg-orange-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-orange-700"
          >
            {loading ? 'Vérification...' : 'Activer la 2FA'}
          </button>
        </form>
      </div>
    </main>
  );
}
