'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function KycPage() {
  const [file, setFile]       = useState<File | null>(null);
  const [status, setStatus]   = useState<'idle'|'uploading'|'done'|'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setStatus('uploading');
    setMessage('');

    try {
      // Upload vers /api/upload
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        setStatus('error');
        setMessage(uploadData.error ?? 'Erreur lors de l\'upload');
        return;
      }

      // Enregistrer l'URL du document KYC
      const kycRes = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_url: uploadData.url }),
      });

      if (!kycRes.ok) {
        const kycData = await kycRes.json();
        setStatus('error');
        setMessage(kycData.error ?? 'Erreur lors de la soumission KYC');
        return;
      }

      setStatus('done');
      setMessage('Document soumis avec succès. Notre équipe le vérifiera sous 24-48h.');
    } catch {
      setStatus('error');
      setMessage('Erreur réseau. Veuillez réessayer.');
    }
  };

  if (status === 'done') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-md">
          <p className="text-5xl mb-4">📄</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Document soumis</h2>
          <p className="text-gray-500 text-sm mb-6">{message}</p>
          <Link href="/dashboard" className="text-orange-600 hover:underline text-sm">
            Retour au tableau de bord →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full">
        <div className="mb-6">
          <Link href="/dashboard" className="text-gray-500 text-sm hover:text-gray-700">← Tableau de bord</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Vérification d'identité (KYC)</h1>
          <p className="text-gray-500 text-sm mt-2">
            Pour publier des biens et recevoir des paiements, nous devons vérifier votre identité.
            Soumettez une pièce d'identité (CNI, passeport ou permis de conduire).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Zone de dépôt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document d'identité
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-orange-400 transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
                id="kyc-file"
              />
              <label htmlFor="kyc-file" className="cursor-pointer">
                <p className="text-3xl mb-2">{file ? '📎' : '📁'}</p>
                {file ? (
                  <p className="text-sm text-gray-700 font-medium">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">Cliquez pour sélectionner un fichier</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max 5 Mo</p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Infos acceptées */}
          <ul className="text-xs text-gray-500 space-y-1 bg-gray-50 rounded-xl p-4">
            <li>✅ Carte nationale d'identité (recto-verso)</li>
            <li>✅ Passeport (page photo)</li>
            <li>✅ Permis de conduire</li>
            <li>⚠️ Le document doit être en cours de validité</li>
          </ul>

          {status === 'error' && (
            <p className="text-red-600 text-sm bg-red-50 rounded-xl p-3">{message}</p>
          )}

          <button
            type="submit"
            disabled={!file || status === 'uploading'}
            className="w-full py-3 bg-orange-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-orange-700"
          >
            {status === 'uploading' ? 'Envoi en cours...' : 'Soumettre mon document'}
          </button>
        </form>
      </div>
    </main>
  );
}
