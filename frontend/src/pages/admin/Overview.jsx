import { ErrorAlert, Loader, StatusBadge } from '../../components/common.jsx';
import { formatCurrency, formatDate, formatTime } from '../../utils/format.js';
import { useAdminData } from './useAdminData.js';

const CARDS = [
  ['revenue', 'Revenue', 'bi-currency-rupee', '#f5c518', formatCurrency],
  ['confirmedBookings', 'Confirmed bookings', 'bi-ticket-perforated', '#22c55e'],
  ['ticketsSold', 'Tickets sold', 'bi-person-check', '#38bdf8'],
  ['customers', 'Customers', 'bi-people', '#a78bfa'],
  ['movies', 'Active movies', 'bi-film', '#e50914'],
  ['upcomingShows', 'Upcoming shows', 'bi-calendar-event', '#fb923c'],
  ['theaters', 'Theaters', 'bi-building', '#2dd4bf'],
  ['cancelledBookings', 'Cancelled', 'bi-x-circle', '#94a3b8'],
];

export default function Overview() {
  const { data, loading, error, reload } = useAdminData('/admin/stats');
  if (loading) return <Loader />;
  if (error) return <ErrorAlert message={error} onRetry={reload} />;
  const { stats } = data;

  return (
    <>
      <div className="row row-cols-2 row-cols-md-4 g-3 mb-4">
        {CARDS.map(([key, label, icon, color, fmt]) => (
          <div className="col" key={key}>
            <div className="stat-card" data-testid={`stat-${key}`}>
              <div className="d-flex justify-content-between align-items-start">
                <span className="small text-muted">{label}</span>
                <span className="stat-icon" style={{ background: `${color}22`, color }}><i className={`bi ${icon}`} aria-hidden="true" /></span>
              </div>
              <div className="stat-value mt-1">{fmt ? fmt(stats[key]) : stats[key]}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="im-card p-3 h-100">
            <h2 className="h6 mb-3">Recent bookings</h2>
            {stats.recentBookings.length === 0 ? (
              <p className="text-muted small mb-0">No bookings yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead><tr><th>Reference</th><th>Customer</th><th>Movie</th><th>Show</th><th>Total</th><th>Status</th></tr></thead>
                  <tbody>
                    {stats.recentBookings.map((b) => (
                      <tr key={b._id}>
                        <td className="booking-ref small text-nowrap">{b.reference}</td>
                        <td className="small">{b.user?.name}</td>
                        <td className="small">{b.movie?.title}</td>
                        <td className="small">{formatDate(b.showStartTime)} {formatTime(b.showStartTime)}</td>
                        <td className="small">{formatCurrency(b.total)}</td>
                        <td><StatusBadge status={b.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="col-lg-5">
          <div className="im-card p-3 h-100">
            <h2 className="h6 mb-3">Top movies by tickets</h2>
            {stats.topMovies.length === 0 ? (
              <p className="text-muted small mb-0">No ticket sales yet.</p>
            ) : (
              stats.topMovies.map((m) => {
                const max = stats.topMovies[0].tickets;
                return (
                  <div key={m.movieId} className="mb-3">
                    <div className="d-flex justify-content-between small"><span>{m.title}</span><span className="text-muted">{m.tickets} tickets • {formatCurrency(m.revenue)}</span></div>
                    <div className="progress mt-1" style={{ height: 6 }} role="progressbar" aria-label={`${m.title} ticket share`} aria-valuenow={m.tickets} aria-valuemin={0} aria-valuemax={max}>
                      <div className="progress-bar bg-warning" style={{ width: `${(m.tickets / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
