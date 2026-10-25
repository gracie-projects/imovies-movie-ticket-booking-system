import { Alert, Button, Pagination, Spinner } from 'react-bootstrap';

export function Loader({ label = 'Loading...' }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 gap-3" role="status" aria-live="polite">
      <Spinner animation="border" variant="warning" aria-hidden="true" />
      <span className="text-muted">{label}</span>
    </div>
  );
}

export function ErrorAlert({ message, onRetry }) {
  if (!message) return null;
  return (
    <Alert variant="danger" className="d-flex align-items-center justify-content-between gap-3" role="alert">
      <span>
        <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
        {message}
      </span>
      {onRetry && (
        <Button size="sm" variant="outline-light" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Alert>
  );
}

export function EmptyState({ icon = 'bi-film', title, children }) {
  return (
    <div className="empty-state im-card">
      <i className={`bi ${icon}`} aria-hidden="true" />
      <h3 className="h5 mt-3 text-light">{title}</h3>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function PaginationBar({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="d-flex justify-content-center mt-4">
      <Pagination className="mb-0">
        <Pagination.Prev disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page" />
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <Pagination.Item key={p} active={p === page} onClick={() => onChange(p)} aria-label={`Page ${p}`}>
            {p}
          </Pagination.Item>
        ))}
        <Pagination.Next disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page" />
      </Pagination>
    </nav>
  );
}

export function StatusBadge({ status }) {
  const map = {
    confirmed: ['success', 'Confirmed'],
    cancelled: ['secondary', 'Cancelled'],
    now_showing: ['danger', 'Now Showing'],
    coming_soon: ['info', 'Coming Soon'],
    archived: ['secondary', 'Archived'],
    scheduled: ['success', 'Scheduled'],
  };
  const [bg, label] = map[status] || ['secondary', status];
  return <span className={`badge text-bg-${bg}`}>{label}</span>;
}
