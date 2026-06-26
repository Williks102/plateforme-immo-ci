'use client';
import { useState, useEffect } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { fr } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';

interface Props {
  listingId: string;
  onSelect: (range: DateRange | undefined) => void;
}

export function AvailabilityCalendar({ listingId, onSelect }: Props) {
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [selected, setSelected] = useState<DateRange | undefined>();

  useEffect(() => {
    fetch(`/api/listings/${listingId}/availability`)
      .then(r => r.json())
      .then(data => {
        setBlockedDates((data.blockedDates ?? []).map((d: string) => new Date(d)));
      })
      .catch(() => {});
  }, [listingId]);

  const handleSelect = (range: DateRange | undefined) => {
    setSelected(range);
    onSelect(range);
  };

  return (
    <DayPicker
      mode="range"
      selected={selected}
      onSelect={handleSelect}
      disabled={[{ before: new Date() }, ...blockedDates]}
      numberOfMonths={2}
      locale={fr}
      className="rdp-custom"
    />
  );
}
