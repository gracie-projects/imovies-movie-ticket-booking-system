import { useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import api, { getErrorMessage } from '../../api/client.js';
import { EmptyState, ErrorAlert, Loader } from '../../components/common.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { splitList, useAdminData } from './useAdminData.js';

const EMPTY_THEATER = { name: '', city: '', address: '', amenities: '', isActive: true };
const EMPTY_SCREEN = { name: '', rows: 8, seatsPerRow: 12, premiumRows: '', aisleAfter: '' };

export default function TheatersAdmin() {
  const { data, loading, error, reload } = useAdminData('/admin/theaters');
  const { notify } = useToast();
  const [modal, setModal] = useState(null); // { kind: 'theater'|'screen', record?, theaterId? }
  const [form, setForm] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function openTheater(theater) {
    setModal({ kind: 'theater', record: theater });
    setForm(theater ? { ...theater, amenities: theater.amenities.join(', ') } : EMPTY_THEATER);
    setFormError('');
  }

  function openScreen(theaterId, screen) {
    setModal({ kind: 'screen', record: screen, theaterId });
    setForm(screen ? { ...screen, premiumRows: screen.premiumRows.join(', '), aisleAfter: screen.aisleAfter.join(', ') } : EMPTY_SCREEN);
    setFormError('');
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (modal.kind === 'theater') {
        const payload = { name: form.name, city: form.city, address: form.address, amenities: splitList(form.amenities), isActive: form.isActive };
        if (modal.record) await api.put(`/admin/theaters/${modal.record._id}`, payload);
        else await api.post('/admin/theaters', payload);
      } else {
        const payload = {
          theater: modal.theaterId,
          name: form.name,
          rows: Number(form.rows),
          seatsPerRow: Number(form.seatsPerRow),
          premiumRows: splitList(form.premiumRows).map((r) => r.toUpperCase()),
          aisleAfter: splitList(String(form.aisleAfter)).map(Number),
        };
        if (modal.record) await api.put(`/admin/screens/${modal.record._id}`, payload);
        else await api.post('/admin/screens', payload);
      }
      notify(`${modal.kind === 'theater' ? 'Theater' : 'Screen'} saved.`);
      setModal(null);
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(kind, record) {
    if (!window.confirm(`Delete ${kind} "${record.name}"? Its showtimes will also be removed.`)) return;
    try {
      await api.delete(`/admin/${kind}s/${record._id}`);
      notify(`${kind === 'theater' ? 'Theater' : 'Screen'} deleted.`, 'info');
      reload();
    } catch (err) {
      notify(getErrorMessage(err), 'danger');
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  if (loading) return <Loader />;

  return (
    <>
      <ErrorAlert message={error} onRetry={reload} />
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 mb-0">Theaters ({data?.theaters.length || 0})</h2>
        <Button className="btn-accent" onClick={() => openTheater(null)}><i className="bi bi-plus-lg me-1" aria-hidden="true" />Add theater</Button>
      </div>
      {data?.theaters.length === 0 && <EmptyState icon="bi-building" title="No theaters yet" />}
      <div className="d-flex flex-column gap-3">
        {data?.theaters.map((t) => (
          <section key={t._id} className="im-card p-3" aria-label={t.name}>
            <div className="d-flex flex-wrap justify-content-between gap-2">
              <div>
                <h3 className="h6 mb-1">{t.name} {!t.isActive && <span className="badge text-bg-secondary ms-1">Inactive</span>}</h3>
                <div className="small text-muted">{t.address} • {t.city}</div>
                <div className="d-flex flex-wrap gap-1 mt-2">{t.amenities.map((a) => <span key={a} className="chip">{a}</span>)}</div>
              </div>
              <div className="text-nowrap">
                <Button size="sm" variant="outline-light" className="me-1" onClick={() => openTheater(t)}>Edit</Button>
                <Button size="sm" variant="outline-danger" onClick={() => remove('theater', t)}>Delete</Button>
              </div>
            </div>
            <div className="table-responsive mt-3">
              <table className="table table-sm align-middle mb-0">
                <thead><tr><th>Screen</th><th>Layout</th><th>Capacity</th><th>Premium rows</th><th className="text-end">Actions</th></tr></thead>
                <tbody>
                  {t.screens.map((s) => (
                    <tr key={s._id}>
                      <td>{s.name}</td>
                      <td className="small">{s.rows} rows × {s.seatsPerRow} seats</td>
                      <td className="small">{s.rows * s.seatsPerRow}</td>
                      <td className="small">{s.premiumRows.join(', ') || '—'}</td>
                      <td className="text-end text-nowrap">
                        <Button size="sm" variant="outline-light" className="me-1" onClick={() => openScreen(t._id, s)} aria-label={`Edit ${s.name}`}><i className="bi bi-pencil" aria-hidden="true" /></Button>
                        <Button size="sm" variant="outline-danger" onClick={() => remove('screen', s)} aria-label={`Delete ${s.name}`}><i className="bi bi-trash" aria-hidden="true" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button size="sm" variant="link" className="px-0 mt-1" onClick={() => openScreen(t._id, null)}><i className="bi bi-plus" aria-hidden="true" />Add screen</Button>
          </section>
        ))}
      </div>

      <Modal show={!!modal} onHide={() => setModal(null)} centered>
        <Form onSubmit={save}>
          <Modal.Header closeButton>
            <Modal.Title as="h2" className="h5">{modal?.record ? 'Edit' : 'Add'} {modal?.kind}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ErrorAlert message={formError} />
            {modal?.kind === 'theater' ? (
              <>
                <Form.Group className="mb-3" controlId="t-name"><Form.Label>Name</Form.Label><Form.Control value={form.name} onChange={set('name')} required /></Form.Group>
                <Form.Group className="mb-3" controlId="t-city"><Form.Label>City</Form.Label><Form.Control value={form.city} onChange={set('city')} required /></Form.Group>
                <Form.Group className="mb-3" controlId="t-address"><Form.Label>Address</Form.Label><Form.Control value={form.address} onChange={set('address')} required /></Form.Group>
                <Form.Group className="mb-3" controlId="t-amenities"><Form.Label>Amenities (comma separated)</Form.Label><Form.Control value={form.amenities} onChange={set('amenities')} /></Form.Group>
                <Form.Check id="t-active" label="Active" checked={form.isActive} onChange={set('isActive')} />
              </>
            ) : (
              <div className="row g-3">
                <Form.Group className="col-12" controlId="s-name"><Form.Label>Screen name</Form.Label><Form.Control value={form.name} onChange={set('name')} required /></Form.Group>
                <Form.Group className="col-6" controlId="s-rows"><Form.Label>Rows (1-26)</Form.Label><Form.Control type="number" min={1} max={26} value={form.rows} onChange={set('rows')} required /></Form.Group>
                <Form.Group className="col-6" controlId="s-seats"><Form.Label>Seats per row (1-30)</Form.Label><Form.Control type="number" min={1} max={30} value={form.seatsPerRow} onChange={set('seatsPerRow')} required /></Form.Group>
                <Form.Group className="col-6" controlId="s-premium"><Form.Label>Premium rows</Form.Label><Form.Control placeholder="G, H" value={form.premiumRows} onChange={set('premiumRows')} /></Form.Group>
                <Form.Group className="col-6" controlId="s-aisle"><Form.Label>Aisle after seat #</Form.Label><Form.Control placeholder="3, 9" value={form.aisleAfter} onChange={set('aisleAfter')} /></Form.Group>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" className="btn-accent" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
