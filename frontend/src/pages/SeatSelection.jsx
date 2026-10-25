import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import SeatMap from '../components/SeatMap.jsx';
import { ErrorAlert, Loader } from '../components/common.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { estimatePrice, formatCurrency, formatDate, formatTime, seatTypeFor, sortSeats } from '../utils/format.js';

const MAX_SEATS = 10;

export default function SeatSelection() {
  const { showtimeId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();

  const [showtime, setShowtime] = useState(null);
  // Seats may be pre-filled when returning from checkout or login
  const [selected, setSelected] = useState(() => (params.get('seats') ? params.get('seats').split(',').filter(Boolean) : []));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get(`/showtimes/${showtimeId}`);
      setShowtime(data.showtime);
      // Drop any pre-selected seats that have been booked in the meantime
      setSelected((current) => current.filter((id) => !data.showtime.bookedSeats.includes(id)));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load the seat layout.'));
    } finally {
      setLoading(false);
    }
  }, [showtimeId]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSeat(id) {
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else if (selected.length >= MAX_SEATS) {
      notify(`You can select up to ${MAX_SEATS} seats per booking.`, 'warning');
    } else {
      setSelected([...selected, id]);
    }
  }

  function proceed() {
    const target = `/checkout?showtime=${showtimeId}&seats=${sortSeats(selected).join(',')}`;
    if (!user) {
      notify('Please log in to complete your booking.', 'info');
      navigate(`/login?redirect=${encodeURIComponent(target)}`);
      return;
    }
    navigate(target);
  }

  if (loading) return <Loader label="Loading seat layout..." />;
  if (error) {
    return (
      <div className="container py-5">
        <ErrorAlert message={error} onRetry={load} />
        <Link to="/movies" className="btn btn-outline-light">Back to movies</Link>
      </div>
    );
  }

  const { movie, theater, screen, prices } = showtime;
  const price = estimatePrice(selected, prices, screen.premiumRows, showtime.convenienceFeePerSeat);
  const sorted = sortSeats(selected);

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
        <Link to={`/movies/${movie.slug}`} className="btn btn-sm btn-outline-secondary" aria-label="Back to showtimes">
          <i className="bi bi-arrow-left" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="h4 mb-0">{movie.title}</h1>
          <div className="small text-muted">
            {theater.name} • {screen.name} • {formatDate(showtime.startTime)}, {formatTime(showtime.startTime)} • {showtime.language} {showtime.format}
          </div>
        </div>
        <button type="button" className="btn btn-sm btn-outline-secondary ms-auto" onClick={load}>
          <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />Refresh availability
        </button>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="im-card p-3 p-md-4">
            {!showtime.bookingOpen && <ErrorAlert message="Bookings are closed for this show." />}
            <SeatMap
              screen={screen}
              bookedSeats={showtime.bookedSeats}
              selected={selected}
              onToggle={toggleSeat}
              prices={prices}
              maxSeats={MAX_SEATS}
              disabled={!showtime.bookingOpen}
            />
          </div>
        </div>

        <div className="col-lg-4">
          <aside className="im-card p-4 summary-sticky" aria-label="Booking summary">
            <h2 className="h5 mb-3">Your selection</h2>
            {selected.length === 0 ? (
              <p className="text-muted small mb-3">Tap on available seats to select them. You can choose up to {MAX_SEATS} seats.</p>
            ) : (
              <ul className="list-unstyled small mb-3" data-testid="selected-seats">
                {sorted.map((id) => {
                  const type = seatTypeFor(id, screen.premiumRows);
                  return (
                    <li key={id} className="d-flex justify-content-between py-1 border-bottom border-secondary-subtle">
                      <span>
                        <strong>{id}</strong> <span className="text-muted text-capitalize">{type}</span>
                      </span>
                      <span>{formatCurrency(prices[type])}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="small d-flex justify-content-between"><span className="text-muted">Tickets ({selected.length})</span><span>{formatCurrency(price.subtotal)}</span></div>
            <div className="small d-flex justify-content-between"><span className="text-muted">Convenience fee</span><span>{formatCurrency(price.convenienceFee)}</span></div>
            <div className="d-flex justify-content-between fs-5 fw-bold mt-2" aria-live="polite">
              <span>Total</span>
              <span className="text-accent" data-testid="live-total">{formatCurrency(price.total)}</span>
            </div>
            <button
              type="button"
              className="btn btn-cinema w-100 mt-3 py-2"
              disabled={selected.length === 0 || !showtime.bookingOpen}
              onClick={proceed}
            >
              {selected.length === 0 ? 'Select seats to continue' : `Proceed to checkout • ${formatCurrency(price.total)}`}
            </button>
            <p className="small text-muted mt-2 mb-0">
              <i className="bi bi-shield-check me-1" aria-hidden="true" />Final price is confirmed by the server at checkout.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
