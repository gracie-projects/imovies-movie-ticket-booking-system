import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Form, Spinner } from 'react-bootstrap';
import api, { getErrorMessage } from '../api/client.js';
import { ErrorAlert, Loader } from '../components/common.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate, formatTime, newIdempotencyKey } from '../utils/format.js';

const PAYMENT_OPTIONS = [
  { value: 'upi', icon: 'bi-phone', label: 'UPI', hint: 'Simulated UPI approval' },
  { value: 'card', icon: 'bi-credit-card', label: 'Credit / Debit card', hint: 'Simulated - no card details needed' },
  { value: 'wallet', icon: 'bi-wallet2', label: 'Wallet', hint: 'Simulated wallet payment' },
];

export default function Checkout() {
  const [params] = useSearchParams();
  const showtimeId = params.get('showtime');
  const seats = (params.get('seats') || '').split(',').filter(Boolean);
  const navigate = useNavigate();
  const { notify } = useToast();

  const [showtime, setShowtime] = useState(null);
  const [quote, setQuote] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(null);
  // One key per checkout attempt: retries and double clicks can never create two bookings
  const idempotencyKey = useRef(newIdempotencyKey());

  const seatParam = seats.join(',');
  useEffect(() => {
    if (!showtimeId || !seatParam) {
      setLoading(false);
      return;
    }
    let active = true;
    Promise.all([
      api.get(`/showtimes/${showtimeId}`),
      api.post('/bookings/quote', { showtimeId, seats: seatParam.split(',') }),
    ])
      .then(([s, q]) => {
        if (!active) return;
        setShowtime(s.data.showtime);
        setQuote(q.data.quote);
        if (q.data.quote.unavailable.length) setConflict(q.data.quote.unavailable);
      })
      .catch((err) => active && setError(getErrorMessage(err, 'Could not prepare your checkout.')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [showtimeId, seatParam]);

  async function pay(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/bookings', {
        showtimeId,
        seats,
        paymentMethod,
        idempotencyKey: idempotencyKey.current,
      });
      notify('Payment successful! Your tickets are confirmed.', 'success');
      navigate(`/bookings/${data.booking._id}?new=1`, { replace: true });
    } catch (err) {
      if (err.response?.status === 409) {
        setConflict(err.response.data.details?.conflictingSeats || []);
      } else {
        setError(getErrorMessage(err, 'Payment failed. You have not been charged - please try again.'));
      }
      setSubmitting(false);
    }
  }

  if (loading) return <Loader label="Preparing checkout..." />;
  if (!showtimeId || seats.length === 0) {
    return (
      <div className="container py-5 text-center">
        <h1 className="h4">No seats selected</h1>
        <p className="text-muted">Choose a movie and showtime to start a booking.</p>
        <Link to="/movies" className="btn btn-accent">Browse movies</Link>
      </div>
    );
  }
  if (!quote) {
    return (
      <div className="container py-5">
        <ErrorAlert message={error || 'Could not prepare your checkout.'} />
        <Link to={`/booking/${showtimeId}`} className="btn btn-outline-light">Back to seat selection</Link>
      </div>
    );
  }

  const backToSeats = `/booking/${showtimeId}?seats=${seats.filter((s) => !conflict?.includes(s)).join(',')}`;

  return (
    <div className="container py-4">
      <h1 className="im-section-title mb-4">Checkout</h1>
      <div className="row g-4">
        <div className="col-lg-7">
          {conflict?.length > 0 && (
            <Alert variant="warning" data-testid="seat-conflict">
              <Alert.Heading as="h2" className="h6"><i className="bi bi-exclamation-triangle me-2" aria-hidden="true" />Seats no longer available</Alert.Heading>
              <p className="mb-2">
                Seat{conflict.length > 1 ? 's' : ''} <strong>{conflict.join(', ')}</strong> {conflict.length > 1 ? 'were' : 'was'} just booked by another customer.
              </p>
              <Link to={backToSeats} className="btn btn-sm btn-dark">Choose different seats</Link>
            </Alert>
          )}
          <ErrorAlert message={error} />

          <form onSubmit={pay} className="im-card p-4" aria-label="Payment">
            <h2 className="h5 mb-3">Payment method</h2>
            <Alert variant="info" className="small py-2">
              <i className="bi bi-info-circle me-2" aria-hidden="true" />
              This is a <strong>simulated checkout</strong> for demonstration. No real payment details are collected or charged.
            </Alert>
            <fieldset disabled={submitting}>
              <legend className="visually-hidden">Choose a payment method</legend>
              <div className="d-flex flex-column gap-2">
                {PAYMENT_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`im-card p-3 d-flex align-items-center gap-3 ${paymentMethod === opt.value ? 'border-warning' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <Form.Check
                      type="radio"
                      name="payment"
                      value={opt.value}
                      checked={paymentMethod === opt.value}
                      onChange={() => setPaymentMethod(opt.value)}
                      aria-label={opt.label}
                    />
                    <i className={`bi ${opt.icon} fs-4 text-accent`} aria-hidden="true" />
                    <span>
                      <span className="d-block fw-semibold">{opt.label}</span>
                      <span className="small text-muted">{opt.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="submit" className="btn btn-cinema btn-lg w-100 mt-4" disabled={submitting || conflict?.length > 0} data-testid="pay-button">
              {submitting ? (
                <><Spinner size="sm" className="me-2" aria-hidden="true" />Processing payment...</>
              ) : (
                <><i className="bi bi-lock-fill me-2" aria-hidden="true" />Pay {formatCurrency(quote.total)}</>
              )}
            </button>
          </form>
        </div>

        <div className="col-lg-5">
          <aside className="im-card p-4 summary-sticky" aria-label="Order summary">
            <div className="d-flex gap-3 mb-3">
              <img src={showtime.movie.posterUrl} alt="" className="booking-row-poster" />
              <div>
                <h2 className="h5 mb-1">{showtime.movie.title}</h2>
                <div className="small text-muted">{showtime.language} • {showtime.format}</div>
                <div className="small mt-2">{showtime.theater.name}</div>
                <div className="small text-muted">{showtime.screen.name}</div>
                <div className="small mt-1 fw-semibold">{formatDate(showtime.startTime)} • {formatTime(showtime.startTime)}</div>
              </div>
            </div>
            <h3 className="ticket-label mb-2">Booking summary</h3>
            <ul className="list-unstyled small mb-2" data-testid="checkout-seats">
              {quote.seats.map((seat) => (
                <li key={seat.id} className="d-flex justify-content-between py-1 border-bottom border-secondary-subtle">
                  <span><strong>{seat.id}</strong> <span className="text-muted text-capitalize">{seat.type}</span></span>
                  <span>{formatCurrency(seat.price)}</span>
                </li>
              ))}
            </ul>
            <div className="small d-flex justify-content-between"><span className="text-muted">Subtotal ({quote.seats.length} tickets)</span><span>{formatCurrency(quote.subtotal)}</span></div>
            <div className="small d-flex justify-content-between"><span className="text-muted">Convenience fee</span><span>{formatCurrency(quote.convenienceFee)}</span></div>
            <div className="d-flex justify-content-between fs-4 fw-bold mt-2">
              <span>Total</span><span className="text-accent" data-testid="checkout-total">{formatCurrency(quote.total)}</span>
            </div>
            <Link to={backToSeats} className="btn btn-link px-0 mt-2 small">
              <i className="bi bi-pencil me-1" aria-hidden="true" />Change seats
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
