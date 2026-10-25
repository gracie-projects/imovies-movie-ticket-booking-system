import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import TicketCard from '../components/TicketCard.jsx';
import { ErrorAlert, Loader } from '../components/common.jsx';

export default function BookingConfirmation() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const isNew = params.get('new') === '1';
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/bookings/${id}`);
      setBooking(data.booking);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load this booking.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loader label="Loading your ticket..." />;

  return (
    <div className="container py-4" style={{ maxWidth: 760 }}>
      <ErrorAlert message={error} onRetry={load} />
      {booking && (
        <>
          {isNew && booking.status === 'confirmed' && (
            <div className="text-center mb-4" role="status">
              <div className="display-5 text-success"><i className="bi bi-check-circle-fill" aria-hidden="true" /></div>
              <h1 className="h3 mt-2" data-testid="confirmation-heading">Booking confirmed!</h1>
              <p className="text-muted mb-0">Your tickets are ready. A copy is saved in My Bookings.</p>
            </div>
          )}
          {!isNew && <h1 className="im-section-title mb-3">Your ticket</h1>}
          <TicketCard booking={booking} />
          <div className="d-flex flex-wrap gap-2 justify-content-center mt-4 d-print-none">
            <button type="button" className="btn btn-outline-light" onClick={() => window.print()}>
              <i className="bi bi-printer me-2" aria-hidden="true" />Print ticket
            </button>
            <Link to="/my-bookings" className="btn btn-accent">
              <i className="bi bi-collection me-2" aria-hidden="true" />Go to My Bookings
            </Link>
            <Link to="/movies" className="btn btn-outline-secondary">Book another movie</Link>
          </div>
        </>
      )}
    </div>
  );
}
