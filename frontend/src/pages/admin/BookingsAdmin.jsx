import { useState } from 'react';
import { Form } from 'react-bootstrap';
import { EmptyState, ErrorAlert, Loader, PaginationBar, StatusBadge } from '../../components/common.jsx';
import { formatCurrency, formatDate, formatTime, sortSeats } from '../../utils/format.js';
import { useAdminData } from './useAdminData.js';

export default function BookingsAdmin() {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAdminData('/admin/bookings', { status, search: search || undefined, page });

  return (
    <>
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-end mb-3">
        <h2 className="h5 mb-0">Bookings {data && `(${data.pagination.total})`}</h2>
        <div className="d-flex gap-2">
          <Form.Control size="sm" placeholder="Search reference (IMV-...)" aria-label="Search by booking reference" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <Form.Select size="sm" aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </Form.Select>
        </div>
      </div>
      <ErrorAlert message={error} onRetry={reload} />
      {loading ? (
        <Loader />
      ) : data?.bookings.length === 0 ? (
        <EmptyState icon="bi-ticket-perforated" title="No bookings found" />
      ) : (
        <>
          <div className="im-card table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead><tr><th>Reference</th><th>Customer</th><th>Movie</th><th>Show</th><th>Seats</th><th>Total</th><th>Status</th><th>Booked on</th></tr></thead>
              <tbody>
                {data?.bookings.map((b) => (
                  <tr key={b._id}>
                    <td className="booking-ref small text-nowrap">{b.reference}</td>
                    <td className="small">{b.user?.name}<div className="text-muted">{b.user?.email}</div></td>
                    <td className="small">{b.movie?.title}<div className="text-muted">{b.theater?.name}</div></td>
                    <td className="small">{formatDate(b.showStartTime)}<div className="text-muted">{formatTime(b.showStartTime)}</div></td>
                    <td className="small">{sortSeats(b.seats.map((s) => s.id)).join(', ')}</td>
                    <td className="small">{formatCurrency(b.total)}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td className="small">{formatDate(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar page={data.pagination.page} pages={data.pagination.pages} onChange={setPage} />
        </>
      )}
    </>
  );
}
