import { useMemo, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import api, { getErrorMessage } from '../../api/client.js';
import { EmptyState, ErrorAlert, Loader } from '../../components/common.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatCurrency, formatDate, formatTime } from '../../utils/format.js';
import { toLocalInput, useAdminData } from './useAdminData.js';

function defaultStart() {
  const d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  d.setHours(23, 30, 0, 0);
  return toLocalInput(d);
}

export default function ShowtimesAdmin() {
  const shows = useAdminData('/admin/showtimes');
  const movies = useAdminData('/admin/movies');
  const theaters = useAdminData('/admin/theaters');
  const { notify } = useToast();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [movieFilter, setMovieFilter] = useState('');

  const schedulable = useMemo(() => (movies.data?.movies || []).filter((m) => m.status !== 'archived'), [movies.data]);
  const selectedMovie = schedulable.find((m) => m._id === form.movie);

  function open(show) {
    setEditing(show || {});
    setFormError('');
    if (show) {
      setForm({
        movie: show.movie._id, screen: show.screen._id, startTime: toLocalInput(show.startTime), language: show.language,
        format: show.format, standard: show.prices.standard, premium: show.prices.premium,
      });
    } else {
      const firstMovie = schedulable[0];
      setForm({
        movie: firstMovie?._id || '', screen: theaters.data?.theaters[0]?.screens[0]?._id || '', startTime: defaultStart(),
        language: firstMovie?.languages[0] || '', format: '2D', standard: 200, premium: 300,
      });
    }
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = {
      movie: form.movie, screen: form.screen, startTime: new Date(form.startTime).toISOString(), language: form.language,
      format: form.format, prices: { standard: Number(form.standard), premium: Number(form.premium) },
    };
    try {
      if (editing._id) await api.put(`/admin/showtimes/${editing._id}`, payload);
      else await api.post('/admin/showtimes', payload);
      notify('Showtime saved.');
      setEditing(null);
      shows.reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(show) {
    if (!window.confirm(`Delete the ${formatTime(show.startTime)} show of "${show.movie.title}"?`)) return;
    try {
      await api.delete(`/admin/showtimes/${show._id}`);
      notify('Showtime deleted.', 'info');
      shows.reload();
    } catch (err) {
      notify(getErrorMessage(err), 'danger');
    }
  }

  const set = (key) => (e) => {
    const next = { ...form, [key]: e.target.value };
    if (key === 'movie') next.language = schedulable.find((m) => m._id === e.target.value)?.languages[0] || '';
    setForm(next);
  };

  if (shows.loading || movies.loading || theaters.loading) return <Loader />;
  const list = (shows.data?.showtimes || []).filter((s) => !movieFilter || s.movie?._id === movieFilter);

  return (
    <>
      <ErrorAlert message={shows.error || movies.error || theaters.error} onRetry={shows.reload} />
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <h2 className="h5 mb-0">Upcoming showtimes ({list.length})</h2>
        <div className="d-flex gap-2">
          <Form.Select size="sm" aria-label="Filter by movie" value={movieFilter} onChange={(e) => setMovieFilter(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">All movies</option>
            {schedulable.map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}
          </Form.Select>
          <Button className="btn-accent text-nowrap" onClick={() => open(null)}><i className="bi bi-plus-lg me-1" aria-hidden="true" />Add showtime</Button>
        </div>
      </div>
      {list.length === 0 ? (
        <EmptyState icon="bi-calendar-x" title="No showtimes scheduled" />
      ) : (
        <div className="im-card table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead><tr><th>Date</th><th>Time</th><th>Movie</th><th>Theater / Screen</th><th>Lang / Format</th><th>Prices</th><th>Booked</th><th className="text-end">Actions</th></tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s._id}>
                  <td className="small">{formatDate(s.startTime)}</td>
                  <td className="small">{formatTime(s.startTime)}</td>
                  <td className="small fw-semibold">{s.movie?.title}</td>
                  <td className="small">{s.theater?.name}<div className="text-muted">{s.screen?.name}</div></td>
                  <td className="small">{s.language} • {s.format}</td>
                  <td className="small">{formatCurrency(s.prices.standard)} / {formatCurrency(s.prices.premium)}</td>
                  <td className="small">{s.bookedSeats.length}/{s.screen ? s.screen.rows * s.screen.seatsPerRow : '?'}</td>
                  <td className="text-end text-nowrap">
                    <Button size="sm" variant="outline-light" className="me-1" onClick={() => open(s)} aria-label="Edit showtime"><i className="bi bi-pencil" aria-hidden="true" /></Button>
                    <Button size="sm" variant="outline-danger" onClick={() => remove(s)} aria-label="Delete showtime"><i className="bi bi-trash" aria-hidden="true" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal show={!!editing} onHide={() => setEditing(null)} centered>
        <Form onSubmit={save}>
          <Modal.Header closeButton><Modal.Title as="h2" className="h5">{editing?._id ? 'Edit showtime' : 'Add showtime'}</Modal.Title></Modal.Header>
          <Modal.Body>
            <ErrorAlert message={formError} />
            <div className="row g-3">
              <Form.Group className="col-12" controlId="st-movie">
                <Form.Label>Movie</Form.Label>
                <Form.Select value={form.movie} onChange={set('movie')} required>
                  {schedulable.map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}
                </Form.Select>
              </Form.Group>
              <Form.Group className="col-12" controlId="st-screen">
                <Form.Label>Theater / screen</Form.Label>
                <Form.Select value={form.screen} onChange={set('screen')} required>
                  {theaters.data?.theaters.map((t) => (
                    <optgroup key={t._id} label={t.name}>
                      {t.screens.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </optgroup>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="col-md-7" controlId="st-start"><Form.Label>Start time</Form.Label><Form.Control type="datetime-local" value={form.startTime} onChange={set('startTime')} required /></Form.Group>
              <Form.Group className="col-md-5" controlId="st-format">
                <Form.Label>Format</Form.Label>
                <Form.Select value={form.format} onChange={set('format')}>{['2D', '3D', 'IMAX', '4DX'].map((f) => <option key={f}>{f}</option>)}</Form.Select>
              </Form.Group>
              <Form.Group className="col-12" controlId="st-language">
                <Form.Label>Language</Form.Label>
                <Form.Select value={form.language} onChange={set('language')} required>
                  {selectedMovie?.languages.map((l) => <option key={l}>{l}</option>)}
                </Form.Select>
              </Form.Group>
              <Form.Group className="col-6" controlId="st-standard"><Form.Label>Standard price (₹)</Form.Label><Form.Control type="number" min={0} value={form.standard} onChange={set('standard')} required /></Form.Group>
              <Form.Group className="col-6" controlId="st-premium"><Form.Label>Premium price (₹)</Form.Label><Form.Control type="number" min={0} value={form.premium} onChange={set('premium')} required /></Form.Group>
            </div>
            <p className="small text-muted mt-3 mb-0">End time is calculated from the movie duration. Shows on the same screen need a 15 minute changeover.</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" className="btn-accent" disabled={saving}>{saving ? 'Saving...' : 'Save showtime'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
