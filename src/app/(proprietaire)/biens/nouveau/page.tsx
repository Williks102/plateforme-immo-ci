'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const COMMUNES = [
  'Cocody', 'Plateau', 'Marcory', 'Treichville', 'Adjamé',
  'Yopougon', 'Koumassi', 'Port-Bouët', 'Abobo', 'Attécoubé',
  'Bingerville', 'Songon',
];

interface FormState {
  title: string;
  commune: string;
  quartier: string;
  adresse_indicative: string;
  prix_nuitee: string;
  remise_semaine_pct: number;
  remise_mois_pct: number;
  description: string;
  nb_chambres: number;
  nb_salles_bain: number;
  has_generator: boolean;
  has_water_pump: boolean;
  has_split_ac: boolean;
  has_wifi: boolean;
  has_parking: boolean;
  has_pool: boolean;
  photos: string[];
}

const INITIAL: FormState = {
  title: '', commune: '', quartier: '', adresse_indicative: '',
  prix_nuitee: '',
  remise_semaine_pct: 0,
  remise_mois_pct: 0,
  description: '',
  nb_chambres: 1, nb_salles_bain: 1,
  has_generator: false, has_water_pump: false, has_split_ac: false,
  has_wifi: false, has_parking: false, has_pool: false,
  photos: [],
};

export default function NouveauBienPage() {
  const router = useRouter();
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [uploading, setUploading] = useState(false);

  // Deux inputs distincts : galerie (sans capture) et caméra (avec capture)
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(INITIAL);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));
  const toggle = (k: keyof FormState) =>
    setForm(f => ({ ...f, [k]: !f[k] }));

  const uploadPhoto = async (file: File) => {
    const { default: imageCompression } = await import('browser-image-compression');
    const compressed = await imageCompression(file, {
      maxSizeMB: 1.2,
      maxWidthOrHeight: 1600,
      useWebWorker: false,
    });
    const fd = new FormData();
    fd.append('file', compressed);
    const res  = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    if (!res.ok) throw new Error(data.error ?? 'Upload échoué');
    return data.url as string;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadPhoto(file);
        urls.push(url);
        // Afficher au fur et à mesure
        setForm(f => ({ ...f, photos: [...f.photos, url] }));
      }
      void urls; // utilisées via setForm ci-dessus
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'upload des photos');
    } finally {
      setUploading(false);
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
          prix_nuitee:        Number(form.prix_nuitee),
          remise_semaine_pct: form.remise_semaine_pct,
          remise_mois_pct:    form.remise_mois_pct,
        }),
      });
      if (res.status === 401) { router.push('/connexion?redirect=/biens/nouveau'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push('/dashboard?submitted=1');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const Checkbox = ({ label, field }: { label: string; field: keyof FormState }) => (
    <label className="flex items-center gap-3 cursor-pointer p-3.5 border rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors">
      <input
        type="checkbox"
        checked={!!form[field]}
        onChange={() => toggle(field)}
        className="w-5 h-5 accent-orange-600 flex-shrink-0"
      />
      <span className="text-sm">{label}</span>
    </label>
  );

  const prix = Number(form.prix_nuitee);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Publier un bien</h1>

        {/* Barre de progression */}
        <div className="flex gap-1.5 mb-1.5">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-orange-500' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mb-5">Étape {step} / 3</p>

        {/* ── Étape 1 : Infos + Tarifs ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Titre du bien *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Ex : Bel appartement meublé à Cocody"
                className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Commune *</label>
              <select
                value={form.commune}
                onChange={e => set('commune', e.target.value)}
                className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option value="">Sélectionnez une commune</option>
                {COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Quartier</label>
                <input
                  type="text"
                  value={form.quartier}
                  onChange={e => set('quartier', e.target.value)}
                  placeholder="Ex : Riviera 2"
                  className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Repère</label>
                <input
                  type="text"
                  value={form.adresse_indicative}
                  onChange={e => set('adresse_indicative', e.target.value)}
                  placeholder="Proche du marché"
                  className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Tarification */}
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800">Tarification</p>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Prix / nuitée (FCFA) *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.prix_nuitee}
                  onChange={e => set('prix_nuitee', e.target.value)}
                  placeholder="Ex : 25 000"
                  min="1000"
                  className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                />
              </div>

              <p className="text-xs text-gray-500 pt-1">
                Tarifs dégressifs optionnels — attirez plus de voyageurs pour des longs séjours
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Remise ≥ 7 nuits
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.remise_semaine_pct || ''}
                      onChange={e => set('remise_semaine_pct', Math.min(50, Math.max(0, Number(e.target.value))))}
                      placeholder="0"
                      min="0"
                      max="50"
                      className="w-full px-4 py-3 pr-8 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                  </div>
                  {prix > 0 && form.remise_semaine_pct > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      → {Math.round(prix * (1 - form.remise_semaine_pct / 100)).toLocaleString('fr-CI')} FCFA/nuit
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Remise ≥ 30 nuits
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.remise_mois_pct || ''}
                      onChange={e => set('remise_mois_pct', Math.min(70, Math.max(0, Number(e.target.value))))}
                      placeholder="0"
                      min="0"
                      max="70"
                      className="w-full px-4 py-3 pr-8 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                  </div>
                  {prix > 0 && form.remise_mois_pct > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      → {Math.round(prix * (1 - form.remise_mois_pct / 100)).toLocaleString('fr-CI')} FCFA/nuit
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={4}
                placeholder="Décrivez votre bien, l'environnement, les commodités proches..."
                className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!form.title || !form.commune || !form.prix_nuitee}
              className="w-full bg-orange-600 text-white py-3.5 rounded-xl font-semibold disabled:opacity-50 active:scale-95 transition-transform"
            >
              Continuer →
            </button>
          </div>
        )}

        {/* ── Étape 2 : Équipements ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Chambres</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.nb_chambres}
                  onChange={e => set('nb_chambres', Number(e.target.value))}
                  min="1" max="50"
                  className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Salles de bain</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.nb_salles_bain}
                  onChange={e => set('nb_salles_bain', Number(e.target.value))}
                  min="1" max="20"
                  className="w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <p className="text-sm font-medium text-gray-700">Équipements disponibles</p>
            <div className="space-y-2">
              <Checkbox label="⚡ Groupe électrogène"  field="has_generator"  />
              <Checkbox label="💧 Suppresseur d'eau"   field="has_water_pump" />
              <Checkbox label="❄️ Climatisation split" field="has_split_ac"   />
              <Checkbox label="📶 WiFi"                field="has_wifi"       />
              <Checkbox label="🚗 Parking"             field="has_parking"    />
              <Checkbox label="🏊 Piscine"             field="has_pool"       />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 py-3.5 rounded-xl font-medium text-sm active:scale-95 transition-transform">
                ← Retour
              </button>
              <button onClick={() => setStep(3)} className="flex-1 bg-orange-600 text-white py-3.5 rounded-xl font-semibold text-sm active:scale-95 transition-transform">
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* ── Étape 3 : Photos ── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Ajoutez au moins <strong>3 photos</strong> de votre bien pour qu'il soit accepté.
            </p>

            {/* Boutons upload — séparés pour mobile */}
            <div className="grid grid-cols-2 gap-3">
              {/* Galerie / fichiers — sans capture pour laisser le choix à l'OS */}
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                disabled={uploading}
                className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-orange-300 rounded-2xl py-5 text-orange-600 hover:bg-orange-50 active:bg-orange-100 transition-colors disabled:opacity-50"
              >
                <span className="text-2xl">🖼️</span>
                <span className="text-xs font-medium">Galerie / Fichiers</span>
              </button>

              {/* Caméra directe — capture forcé */}
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                disabled={uploading}
                className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-300 rounded-2xl py-5 text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <span className="text-2xl">📷</span>
                <span className="text-xs font-medium">Appareil photo</span>
              </button>
            </div>

            {/* Input galerie — pas de capture */}
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
            {/* Input caméra — avec capture */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />

            {/* Indicateur d'upload en cours */}
            {uploading && (
              <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 rounded-xl px-4 py-2.5">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Envoi en cours...
              </div>
            )}

            {/* Grille photos */}
            {form.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {form.photos.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="object-cover w-full h-full" />
                    <button
                      onClick={() => set('photos', form.photos.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-sm flex items-center justify-center shadow"
                    >
                      ×
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full">
                        Couverture
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className={`text-sm ${form.photos.length >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
              {form.photos.length >= 3 ? `✓ ${form.photos.length} photos` : `${form.photos.length} / 3+ photos (minimum 3 requis)`}
            </p>

            {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(2)} className="flex-1 border border-gray-300 py-3.5 rounded-xl font-medium text-sm active:scale-95 transition-transform">
                ← Retour
              </button>
              <button
                onClick={submit}
                disabled={loading || uploading || form.photos.length < 3}
                className="flex-1 bg-orange-600 text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 active:scale-95 transition-transform"
              >
                {loading ? 'Envoi...' : 'Soumettre'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
