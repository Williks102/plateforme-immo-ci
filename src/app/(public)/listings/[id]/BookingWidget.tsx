'use client';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { differenceInDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AvailabilityCalendar } from '@/components/AvailabilityCalendar';

interface Props {
  listingId: string;
  prixNuitee: number;
}

export function BookingWidget({ listingId, prixNuitee }: Props) {
  const [range, setRange] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nbNuits = range?.from && range?.to
    ? differenceInDays(range.to, range.from)
    : 0;
  const total = nbNuits * prixNuitee;

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
      // Rediriger vers la page de paiement PaiementPro
      window.location.href = data.paymentUrl;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow border p-5 sticky top-24">
      <p className="text-xl font-bold text-orange-600 mb-1">
        {prixNuitee.toLocaleString('fr-CI')} FCFA
        <span className="text-sm font-normal text-gray-500"> / nuit</span>
      </p>

      <div className="my-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Choisissez vos dates</p>
        <div className="overflow-x-auto -mx-2">
          <AvailabilityCalendar listingId={listingId} onSelect={setRange} />
        </div>
      </div>

      {nbNuits > 0 && (
        <div className="border-t pt-3 space-y-1 text-sm text-gray-700">
          <div className="flex justify-between">
            <span>{prixNuitee.toLocaleString('fr-CI')} FCFA × {nbNuits} nuit{nbNuits > 1 ? 's' : ''}</span>
            <span>{total.toLocaleString('fr-CI')} FCFA</span>
          </div>
          <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t">
            <span>Total</span>
            <span>{total.toLocaleString('fr-CI')} FCFA</span>
          </div>
        </div>
      )}

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

      <button
        onClick={handleBook}
        disabled={nbNuits === 0 || loading}
        className="w-full mt-4 bg-orange-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
      >
        {loading ? 'Redirection...' : nbNuits === 0 ? 'Sélectionnez des dates' : 'Réserver et payer'}
      </button>

      <p className="text-xs text-gray-400 text-center mt-2">
        Paiement sécurisé — Wave, Orange Money, MTN MoMo
      </p>
    </div>
  );
}
