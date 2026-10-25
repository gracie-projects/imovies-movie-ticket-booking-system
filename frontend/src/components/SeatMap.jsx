import { formatCurrency, seatTypeFor } from '../utils/format.js';

const ROWS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Interactive cinema seat grid. Every seat is a real <button> so it works with
 * keyboard (Tab / Enter / Space) and screen readers (aria-pressed, aria-label).
 */
export default function SeatMap({ screen, bookedSeats, selected, onToggle, prices, maxSeats = 10, disabled = false }) {
  const booked = new Set(bookedSeats);
  const chosen = new Set(selected);
  const aisles = new Set(screen.aisleAfter || []);
  const rows = Array.from({ length: screen.rows }, (_, i) => ROWS[i]);
  const limitReached = selected.length >= maxSeats;

  let lastTier = null;

  return (
    <div className="seat-map">
      <div className="screen-curve" aria-hidden="true">SCREEN THIS WAY</div>
      <div className="seat-grid" role="group" aria-label="Seat selection">
        {rows.map((row) => {
          const tier = seatTypeFor(row, screen.premiumRows);
          const showTier = tier !== lastTier;
          lastTier = tier;
          return (
            <div key={row} className="w-100 d-flex flex-column align-items-center">
              {showTier && (
                <div className="seat-tier">
                  {tier === 'premium' ? 'Premium recliner' : 'Classic'} • {formatCurrency(prices[tier])}
                </div>
              )}
              <div className="seat-row">
                <span className="seat-row-label" aria-hidden="true">{row}</span>
                {Array.from({ length: screen.seatsPerRow }, (_, i) => {
                  const id = `${row}${i + 1}`;
                  const isBooked = booked.has(id);
                  const isSelected = chosen.has(id);
                  const blocked = isBooked || disabled || (!isSelected && limitReached);
                  const state = isBooked ? 'booked' : isSelected ? 'selected' : 'available';
                  return (
                    <span key={id} className="d-inline-flex">
                      <button
                        type="button"
                        className={`seat ${tier} ${isBooked ? 'booked' : ''} ${isSelected ? 'selected' : ''}`}
                        disabled={blocked}
                        aria-pressed={isSelected}
                        aria-label={`Seat ${id}, ${tier}, ${formatCurrency(prices[tier])}, ${state}`}
                        data-seat={id}
                        data-state={state}
                        title={`${id} • ${tier} • ${formatCurrency(prices[tier])}`}
                        onClick={() => onToggle(id)}
                      >
                        {i + 1}
                      </button>
                      {aisles.has(i + 1) && <span className="seat-gap" aria-hidden="true" />}
                    </span>
                  );
                })}
                <span className="seat-row-label" aria-hidden="true">{row}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="seat-legend d-flex flex-wrap justify-content-center gap-4 mt-4 small text-muted">
        <span className="d-flex align-items-center gap-2"><span className="seat standard" /> Available</span>
        <span className="d-flex align-items-center gap-2"><span className="seat premium" /> Premium</span>
        <span className="d-flex align-items-center gap-2"><span className="seat selected" /> Selected</span>
        <span className="d-flex align-items-center gap-2"><span className="seat booked" /> Booked</span>
      </div>
    </div>
  );
}
