import { useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import api, { getErrorMessage } from '../../api/client.js';
import { ErrorAlert, Loader, StatusBadge } from '../../components/common.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate, formatDuration } from '../../utils/format.js';
import { splitList, useAdminData } from './useAdminData.js';

const EMPTY = {
  title: '', tagline: '', description: '', genres: '', languages: '', durationMins: 120, certificate: 'UA',
  rating: 0, director: '', cast: '', releaseDate: new Date().toISOString().slice(0, 10), posterUrl: '/posters/neon-horizon.svg', status: 'now_showing',
};

function toForm(movie) {
  return {
    ...movie,
    genres: movie.genres.join(', '),
    languages: movie.languages.join(', '),
    cast: movie.cast.join(', '),
    releaseDate: movie.releaseDate.slice(0, 10),
  };
}

export default function MoviesAdmin() {
  const { data, loading, error, reload } = useAdminData('/admin/movies');
  const { notify } = useToast();
  const [editing, setEditing] = useState(null); // null = closed, {} = new
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function open(movie) {
    setEditing(movie || {});
    setForm(movie ? toForm(movie) : EMPTY);
    setFormError('');
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = {
      title: form.title, tagline: form.tagline, description: form.description,
      genres: splitList(form.genres), languages: splitList(form.languages), cast: splitList(form.cast),
      durationMins: Number(form.durationMins), certificate: form.certificate, rating: Number(form.rating),
      director: form.director, releaseDate: form.releaseDate, posterUrl: form.posterUrl,
      backdropUrl: form.backdropUrl || form.posterUrl, status: form.status,
    };
    try {
      if (editing._id) await api.put(`/admin/movies/${editing._id}`, payload);
      else await api.post('/admin/movies', payload);
      notify(`Movie "${payload.title}" saved.`);
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(movie) {
    if (!window.confirm(`Delete "${movie.title}" and its showtimes? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/movies/${movie._id}`);
      notify('Movie deleted.', 'info');
      reload();
    } catch (err) {
      notify(getErrorMessage(err), 'danger');
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  if (loading) return <Loader />;

  return (
    <>
      <ErrorAlert message={error} onRetry={reload} />
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 mb-0">Movies ({data?.movies.length || 0})</h2>
        <Button className="btn-accent" onClick={() => open(null)}><i className="bi bi-plus-lg me-1" aria-hidden="true" />Add movie</Button>
      </div>
      <div className="im-card table-responsive">
        <table className="table align-middle mb-0">
          <thead><tr><th>Movie</th><th>Genres</th><th>Duration</th><th>Release</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
          <tbody>
            {data?.movies.map((m) => (
              <tr key={m._id}>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <img src={m.posterUrl} alt="" width={36} height={54} style={{ objectFit: 'cover', borderRadius: 6 }} />
                    <span className="fw-semibold">{m.title}</span>
                  </div>
                </td>
                <td className="small">{m.genres.join(', ')}</td>
                <td className="small">{formatDuration(m.durationMins)}</td>
                <td className="small">{formatDate(m.releaseDate)}</td>
                <td><StatusBadge status={m.status} /></td>
                <td className="text-end text-nowrap">
                  <Button size="sm" variant="outline-light" className="me-1" onClick={() => open(m)} aria-label={`Edit ${m.title}`}><i className="bi bi-pencil" aria-hidden="true" /></Button>
                  <Button size="sm" variant="outline-danger" onClick={() => remove(m)} aria-label={`Delete ${m.title}`}><i className="bi bi-trash" aria-hidden="true" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal show={!!editing} onHide={() => setEditing(null)} size="lg" centered>
        <Form onSubmit={save}>
          <Modal.Header closeButton><Modal.Title as="h2" className="h5">{editing?._id ? 'Edit movie' : 'Add movie'}</Modal.Title></Modal.Header>
          <Modal.Body>
            <ErrorAlert message={formError} />
            <div className="row g-3">
              <Form.Group className="col-md-8" controlId="m-title"><Form.Label>Title</Form.Label><Form.Control value={form.title} onChange={set('title')} required /></Form.Group>
              <Form.Group className="col-md-4" controlId="m-status">
                <Form.Label>Status</Form.Label>
                <Form.Select value={form.status} onChange={set('status')}>
                  <option value="now_showing">Now showing</option>
                  <option value="coming_soon">Coming soon</option>
                  <option value="archived">Archived</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="col-12" controlId="m-tagline"><Form.Label>Tagline</Form.Label><Form.Control value={form.tagline} onChange={set('tagline')} /></Form.Group>
              <Form.Group className="col-12" controlId="m-description"><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={3} value={form.description} onChange={set('description')} required minLength={10} /></Form.Group>
              <Form.Group className="col-md-6" controlId="m-genres"><Form.Label>Genres (comma separated)</Form.Label><Form.Control value={form.genres} onChange={set('genres')} required /></Form.Group>
              <Form.Group className="col-md-6" controlId="m-languages"><Form.Label>Languages (comma separated)</Form.Label><Form.Control value={form.languages} onChange={set('languages')} required /></Form.Group>
              <Form.Group className="col-md-4" controlId="m-duration"><Form.Label>Duration (mins)</Form.Label><Form.Control type="number" min={30} max={300} value={form.durationMins} onChange={set('durationMins')} required /></Form.Group>
              <Form.Group className="col-md-4" controlId="m-certificate">
                <Form.Label>Certificate</Form.Label>
                <Form.Select value={form.certificate} onChange={set('certificate')}>{['U', 'UA', 'UA13+', 'A'].map((c) => <option key={c}>{c}</option>)}</Form.Select>
              </Form.Group>
              <Form.Group className="col-md-4" controlId="m-rating"><Form.Label>Rating (0-10)</Form.Label><Form.Control type="number" step="0.1" min={0} max={10} value={form.rating} onChange={set('rating')} /></Form.Group>
              <Form.Group className="col-md-6" controlId="m-director"><Form.Label>Director</Form.Label><Form.Control value={form.director} onChange={set('director')} required /></Form.Group>
              <Form.Group className="col-md-6" controlId="m-release"><Form.Label>Release date</Form.Label><Form.Control type="date" value={form.releaseDate} onChange={set('releaseDate')} required /></Form.Group>
              <Form.Group className="col-12" controlId="m-cast"><Form.Label>Cast (comma separated)</Form.Label><Form.Control value={form.cast} onChange={set('cast')} /></Form.Group>
              <Form.Group className="col-12" controlId="m-poster"><Form.Label>Poster URL</Form.Label><Form.Control value={form.posterUrl} onChange={set('posterUrl')} required /></Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" className="btn-accent" disabled={saving}>{saving ? 'Saving...' : 'Save movie'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
