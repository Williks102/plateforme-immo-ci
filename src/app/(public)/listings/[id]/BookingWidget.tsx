'use client';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { differenceInDays, format } from 'date-fns';
import { AvailabilityCalendar } from '@/components/AvailabilityCalendar';

interface Props {
  listingId: string;
  prixNuitee: number;
  remiseSemainePct: number;
  remiseMoisPct: number;
}

function computePrice(prixNuitee: number, nbNuits: number, remiseSemainePct: number, remiseMoisPct: number) {
  let remisePct = 0;
  if (nbNuits >= 30 && remiseMoisPct > 0)    remisePct = remiseMoisPct;
  else if (nbNuits >= 7 && remiseSemainePct > 0) remisePct = remiseSemainePct;

  const prixEffectif = remisePct > 0 ? prixNuitee * (1 - remisePct / 100) : prixNuitee;
  const total        = Math.round(prixEffectif * nbNuits);
  const remiseMontant = Math.round(prixNuitee * nbNuits) - total;
  return { prixEffectif, total, remisePct, remiseMontant };
}

export function BookingWidget({ listingId, prixNuitee, remiseSemainePct, remiseMoisPct }: Props) {
  const [range, setRange]   = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const nbNuits = range?.from && range?.to ? differenceInDays(range.to, range.from) : 0;
  const { prixEffectif, total, remisePct, remiseMontant } = computePrice(
    prixNuitee, nbNuits, remiseSemainePct, remiseMoisPct
  );

  const handleBook = async () => {
    if (!range?.from || !range?.to) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          check_in:   format(range.from, 'yyyy-MM-dd'),
          check_out:  format(range.to, 'yyyy-MM-dd'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.paymentUrl;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="booking-widget" className="bg-white rounded-2xl shadow-md border p-5 md:sticky md:top-24">
      {/* Prix affiché */}
      <div className="mb-4">
        <p className="text-2xl font-bold text-orange-600">
          {prixNuitee.toLocaleString('fr-CI')}
          <span className="text-sm font-normal text-gray-500"> FCFA / nuit</span>
        </p>
        {/* Badges remises disponibles */}
        {(remiseSemainePct > 0 || remiseMoisPct > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {remiseSemainePct > 0 && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                -{remiseSemainePct}% à partir de 7 nuits
              </span>
            )}
            {remiseMoisPct > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                -{remiseMoisPct}% à partir de 30 nuits
              </span>
            )}
          </div>
        )}
      </div>

      {/* Calendrier */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Choisissez vos dates</p>
        <div className="overflow-x-auto -mx-1">
          <AvailabilityCalendar listingId={listingId} onSelect={setRange} />
        </div>
      </div>

      {/* Résumé du prix */}
      {nbNuits > 0 && (
        <div className="border-t pt-3 space-y-1.5 text-sm text-gray-700">
          <div className="flex justify-between">
            <span>{prixNuitee.toLocaleString('fr-CI')} FCFA × {nbNuits} nuit{nbNuits > 1 ? 's' : ''}</span>
            <span>{(prixNuitee * nbNuits).toLocaleString('fr-CI')} FCFA</span>
          </div>
          {remisePct > 0 && (
            <div className="flex justify-between text-green-600 font-medium">
              <span>Remise séjour ({remisePct}%)</span>
              <span>-{remiseMontant.toLocaleString('fr-CI')} FCFA</span>
            </div>
          )}
          {remisePct > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Soit {Math.round(prixEffectif).toLocaleString('fr-CI')} FCFA/nuit</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t">
            <span>Total</span>
            <span>{total.toLocaleString('fr-CI')} FCFA</span>
          </div>
        </div>
      )}

      {error && <p className="text-red-600 text-sm mt-2 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <button
        onClick={handleBook}
        disabled={nbNuits === 0 || loading}
        className="w-full mt-4 bg-orange-600 text-white font-semibold py-3.5 rounded-xl disabled:opacity-50 hover:bg-orange-700 active:scale-95 transition-all"
      >
        {loading ? 'Redirection...' : nbNuits === 0 ? 'Sélectionnez des dates' : 'Réserver et payer'}
      </button>

      <p className="text-xs text-gray-400 text-center mt-2">
        Paiement sécurisé — Wave · Orange Money · MTN MoMo
      </p>
    </div>
  );
}
