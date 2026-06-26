'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const COMMUNES = [
  'Cocody', 'Plateau', 'Marcory', 'Treichville', 'Adjamé',
  'Yopougon', 'Koumassi', 'Port-Bouët', 'Abobo', 'Attécoubé',
  'Bingerville', 'Songon',
];

export default function NouveauBienPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '', commune: '', quartier: '', adresse_indicative: '',
    prix_nuitee: '', description: '',
    nb_chambres: 1, nb_salles_bain: 1,
    has_generator: false, has_water_pump: false, has_split_ac: false,
    has_wifi: false, has_parking: false, has_pool: false,
    photos: [] as string[],
  });

  type FormState = typeof form;
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v } as FormState));
  const toggle = (k: string) => setForm(f => ({ ...f, [k]: !f[k as keyof FormState] } as FormState));

  const uploadPhoto = async (file: File) => {
    // Compression côté client avant upload
    const { default: imageCompression } = await import('browser-image-compression');
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
    });

    const fd = new FormData();
    fd.append('file', compressed);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload échoué');
    const { url } = await res.json();
    return url as string;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setLoading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadPhoto(file);
        urls.push(url);
      }
      set('photos', [...form.photos, ...urls]);
    } catch {
      setError('Erreur lors de l\'upload des photos');
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (form.photos.length < 3) {
      setError('Veuillez ajouter au moins 3 photos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          prix_nuitee: Number(form.prix_nuitee),
        }),
      });
      if (res.status === 401) {
        router.push('/connexion?redirect=/biens/nouveau');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push('/dashboard?submitted=1');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const Checkbox = ({ label, field }: { label: string; field: string }) => (
    <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-xl hover:bg-gray-50">
      <input
        type="checkbox"
        checked={!!form[field as keyof typeof form]}
        onChange={() => toggle(field)}
        className="w-5 h-5 accent-orange-600"
      />
      <span className="text-sm">{label}</span>
    </label>
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Publier un bien</h1>

        {/* Indicateur étapes */}
        <div className="flex gap-1 mb-6">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-orange-500' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <p className="text-sm text-gray-500 mb-6">Étape {step} / 3</p>

        {/* Étape 1 : Informations de base */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Titre du bien *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Ex: Bel appartement meublé à Cocody"
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Commune *</label>
              <select
                value={form.commune}
                onChange={e => set('commune', e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Sélectionnez une commune</option>
                {COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quartier</label>
              <input
                type="text"
                value={form.quartier}
                onChange={e => set('quartier', e.target.value)}
                placeholder="Ex: Riviera 2"
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Emplacement indicatif</label>
              <input
                type="text"
                value={form.adresse_indicative}
                onChange={e => set('adresse_indicative', e.target.value)}
                placeholder="Ex: Proche du centre commercial"
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prix par nuitée (FCFA) *</label>
              <input
                type="number"
                value={form.prix_nuitee}
                onChange={e => set('prix_nuitee', e.target.value)}
                placeholder="Ex: 25000"
                min="1000"
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={4}
                placeholder="Décrivez votre bien..."
                className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!form.title || !form.commune || !form.prix_nuitee}
              className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              Continuer
            </button>
          </div>
        )}

        {/* Étape 2 : Équipements */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Chambres</label>
                <input
                  type="number"
                  value={form.nb_chambres}
                  onChange={e => set('nb_chambres', Number(e.target.value))}
                  min="1" max="50"
                  className="w-full px-4 py-3 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Salles de bain</label>
                <input
                  type="number"
                  value={form.nb_salles_bain}
                  onChange={e => set('nb_salles_bain', Number(e.target.value))}
                  min="1" max="20"
                  className="w-full px-4 py-3 border rounded-xl"
                />
              </div>
            </div>

            <p className="text-sm font-medium">Équipements disponibles</p>
            <div className="grid grid-cols-1 gap-2">
              <Checkbox label="⚡ Groupe électrogène" field="has_generator" />
              <Checkbox label="💧 Suppresseur d'eau" field="has_water_pump" />
              <Checkbox label="❄️ Climatisation split" field="has_split_ac" />
              <Checkbox label="📶 WiFi" field="has_wifi" />
              <Checkbox label="🚗 Parking" field="has_parking" />
              <Checkbox label="🏊 Piscine" field="has_pool" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 border py-3 rounded-xl font-medium">
                Retour
              </button>
              <button onClick={() => setStep(3)} className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-semibold">
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* Étape 3 : Photos */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Ajoutez au moins <strong>3 photos</strong> de votre bien.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-orange-300 rounded-2xl p-8 text-center cursor-pointer hover:bg-orange-50"
            >
              <p className="text-4xl mb-2">📷</p>
              <p className="font-medium text-gray-700">Ajouter des photos</p>
              <p className="text-sm text-gray-500">Depuis votre caméra ou galerie</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />

            {form.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {form.photos.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="object-cover w-full h-full" />
                    <button
                      onClick={() => set('photos', form.photos.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-sm text-gray-500">
              {form.photos.length} / 3+ photos ajoutées
              {form.photos.length < 3 && ' — minimum 3 requis'}
            </p>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 border py-3 rounded-xl font-medium">
                Retour
              </button>
              <button
                onClick={submit}
                disabled={loading || form.photos.length < 3}
                className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                {loading ? 'Envoi...' : 'Soumettre pour validation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
