import { QRCodeSVG } from 'qrcode.react';
import { formatCurrency, formatDate, formatTime, sortSeats } from '../utils/format.js';
import { StatusBadge } from './common.jsx';

const PAYMENT_LABELS = { card: 'Card (simulated)', upi: 'UPI (simulated)', wallet: 'Wallet (simulated)' };

/** Digital ticket shown on the confirmation page */
export default function TicketCard({ booking }) {
  const { movie, theater, screen, showtime } = booking;
  const seats = sortSeats(booking.seats.map((s) => s.id));
  const cancelled = booking.status === 'cancelled';

  return (
    <article className="ticket" data-testid="digital-ticket" aria-label={`Ticket ${booking.reference}`}>
      <div className="ticket-header d-flex justify-content-between align-items-center">
        <span className="brand-text fs-3">IMovies</span>
        <span className="text-end">
          <span className="d-block small text-white-50">Booking reference</span>
          <span className="booking-ref fs-5" data-testid="booking-reference">{booking.reference}</span>
        </span>
      </div>

      <div className="p-4 d-flex gap-3 align-items-start">
        <img src={movie.posterUrl} alt="" className="booking-row-poster d-none d-sm-block" />
        <div className="flex-grow-1">
          <h2 className="h4 mb-1">{movie.title}</h2>
          <div className="text-muted small mb-2">
            {movie.certificate} • {showtime.language} • {showtime.format}
          </div>
          <StatusBadge status={booking.status} />
        </div>
      </div>

      <div className="px-4 pb-4 row g-3">
        <div className="col-6 col-md-4">
          <div className="ticket-label">Date</div>
          <div className="fw-semibold">{formatDate(showtime.startTime)}</div>
        </div>
        <div className="col-6 col-md-4">
          <div className="ticket-label">Show time</div>
          <div className="fw-semibold">{formatTime(showtime.startTime)}</div>
        </div>
        <div className="col-6 col-md-4">
          <div className="ticket-label">Screen</div>
          <div className="fw-semibold">{screen.name}</div>
        </div>
        <div className="col-12 col-md-8">
          <div className="ticket-label">Theater</div>
          <div className="fw-semibold">{theater.name}</div>
          <div className="small text-muted">{theater.address}</div>
        </div>
        <div className="col-6 col-md-4">
          <div className="ticket-label">Seats ({seats.length})</div>
          <div className="fw-semibold" data-testid="ticket-seats">{seats.join(', ')}</div>
        </div>
      </div>

      <div className="ticket-divider" />

      <div className="p-4 d-flex flex-column flex-sm-row gap-4 align-items-sm-center justify-content-between">
        <div className="small">
          <div className="d-flex justify-content-between gap-4"><span className="text-muted">Tickets</span><span>{formatCurrency(booking.subtotal)}</span></div>
          <div className="d-flex justify-content-between gap-4"><span className="text-muted">Convenience fee</span><span>{formatCurrency(booking.convenienceFee)}</span></div>
          <div className="d-flex justify-content-between gap-4 fs-5 fw-bold mt-1">
            <span>Total paid</span><span className="text-accent" data-testid="ticket-total">{formatCurrency(booking.total)}</span>
          </div>
          <div className="text-muted mt-2">Paid via {PAYMENT_LABELS[booking.paymentMethod]}</div>
        </div>
        {!cancelled && (
          <div className="text-center">
            <div className="ticket-qr">
              <QRCodeSVG value={`IMOVIES:${booking.reference}:${seats.join(',')}`} size={112} aria-label="Ticket QR code" />
            </div>
            <div className="small text-muted mt-1">Show this at the entrance</div>
          </div>
        )}
      </div>
    </article>
  );
}
