'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  redirectTo?: string;
}

export function OTPForm({ redirectTo = '/' }: Props) {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (!digits.startsWith('225')) return `+225${digits}`;
    return `+${digits}`;
  };

  const sendOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const formattedPhone = formatPhone(phone);
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhone(formattedPhone);
      setStep('code');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(redirectTo);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      {step === 'phone' ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de téléphone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="07 XX XX XX XX"
              className="w-full px-4 py-3 border rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">Format : 07 XX XX XX XX (Côte d'Ivoire)</p>
          </div>
          <button
            onClick={sendOTP}
            disabled={loading || phone.replace(/\D/g, '').length < 8}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {loading ? 'Envoi...' : 'Recevoir le code SMS'}
          </button>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code SMS reçu
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full px-4 py-3 border rounded-xl text-center text-3xl tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">Code envoyé au {phone}</p>
          </div>
          <button
            onClick={verifyOTP}
            disabled={loading || code.length !== 6}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {loading ? 'Vérification...' : 'Se connecter'}
          </button>
          <button
            onClick={() => { setStep('phone'); setCode(''); setError(''); }}
            className="w-full text-sm text-gray-500 underline"
          >
            Changer de numéro
          </button>
        </>
      )}
      {error && (
        <p className="text-red-600 text-sm text-center">{error}</p>
      )}
    </div>
  );
}
