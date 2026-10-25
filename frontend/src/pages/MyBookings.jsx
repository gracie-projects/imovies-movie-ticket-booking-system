import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal, Nav } from 'react-bootstrap';
import api, { getErrorMessage } from '../api/client.js';
import { EmptyState, ErrorAlert, Loader, StatusBadge } from '../components/common.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, formatDate, formatTime, sortSeats } from '../utils/format.js';

function BookingRow({ booking, onCancel }) {
  const { movie, theater, screen, showtime } = booking;
  return (
    <article className="im-card p-3 d-flex gap-3 align-items-start" data-testid="booking-row">
      <img src={movie.posterUrl} alt="" className="booking-row-poster" />
      <div className="flex-grow-1 min-w-0">
        <div className="d-flex flex-wrap justify-content-between gap-2">
          <h3 className="h6 mb-1">{movie.title}</h3>
          <StatusBadge status={booking.status} />
        </div>
        <div className="small text-muted">{theater.name} • {screen.name}</div>
        <div className="small mt-1">
          <i className="bi bi-calendar3 me-1" aria-hidden="true" />{formatDate(showtime.startTime)} • {formatTime(showtime.startTime)}
        </div>
        <div className="small mt-1">
          Seats: <strong>{sortSeats(booking.seats.map((s) => s.id)).join(', ')}</strong> • {formatCurrency(booking.total)}
        </div>
        <div className="small text-muted mt-1">Ref <span className="booking-ref">{booking.reference}</span></div>
        <div className="d-flex gap-2 mt-2">
          <Link to={`/bookings/${booking._id}`} className="btn btn-sm btn-accent">View ticket</Link>
          {onCancel && (
            <Button size="sm" variant="outline-danger" onClick={() => onCancel(booking)}>Cancel booking</Button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function MyBookings() {
  const [data, setData] = useState({ upcoming: [], past: [] });
  const [tab, setTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toCancel, setToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const { notify } = useToast();

  const load = useCallback(async () => {
    setError('');
    try {
      const { data: res } = await api.get('/bookings/me');
      setData(res);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your bookings.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmCancel() {
    setCancelling(true);
    try {
      await api.patch(`/bookings/${toCancel._id}/cancel`);
      notify(`Booking ${toCancel.reference} cancelled. Seats have been released.`, 'info');
      setToCancel(null);
      await load();
    } catch (err) {
      notify(getErrorMessage(err, 'Could not cancel this booking.'), 'danger');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <Loader label="Loading your bookings..." />;
  const list = data[tab];

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <h1 className="im-section-title mb-3">My Bookings</h1>
      <ErrorAlert message={error} onRetry={load} />
      <Nav variant="pills" className="mb-3 gap-1" role="tablist">
        <Nav.Item>
          <Nav.Link as="button" role="tab" aria-selected={tab === 'upcoming'} active={tab === 'upcoming'} onClick={() => setTab('upcoming')}>
            Upcoming ({data.upcoming.length})
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link as="button" role="tab" aria-selected={tab === 'past'} active={tab === 'past'} onClick={() => setTab('past')}>
            Past &amp; cancelled ({data.past.length})
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {list.length === 0 ? (
        <EmptyState icon="bi-ticket-perforated" title={tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}>
          <Link to="/movies" className="btn btn-accent mt-2">Book a movie</Link>
        </EmptyState>
      ) : (
        <div className="d-flex flex-column gap-3">
          {list.map((b) => (
            <BookingRow key={b._id} booking={b} onCancel={tab === 'upcoming' ? setToCancel : null} />
          ))}
        </div>
      )}

      <Modal show={!!toCancel} onHide={() => !cancelling && setToCancel(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title as="h2" className="h5">Cancel booking?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Cancel booking <strong>{toCancel?.reference}</strong> for <strong>{toCancel?.movie.title}</strong>? The seats will be released for other customers. (Refunds are simulated.)
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setToCancel(null)} disabled={cancelling}>Keep booking</Button>
          <Button variant="danger" onClick={confirmCancel} disabled={cancelling}>
            {cancelling ? 'Cancelling...' : 'Yes, cancel'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
