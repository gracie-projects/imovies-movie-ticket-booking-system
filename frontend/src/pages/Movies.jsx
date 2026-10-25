import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Form, InputGroup, Nav } from 'react-bootstrap';
import api, { getErrorMessage } from '../api/client.js';
import MovieCard from '../components/MovieCard.jsx';
import { EmptyState, ErrorAlert, Loader, PaginationBar } from '../components/common.jsx';

const STATUS_TABS = [
  ['all', 'All movies'],
  ['now_showing', 'Now Showing'],
  ['coming_soon', 'Coming Soon'],
];

export default function Movies() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const genre = params.get('genre') || '';
  const language = params.get('language') || '';
  const status = params.get('status') || 'all';
  const page = Number(params.get('page')) || 1;

  const [searchInput, setSearchInput] = useState(search);
  const [filters, setFilters] = useState({ genres: [], languages: [] });
  const [data, setData] = useState({ movies: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  // Always start from the latest params: a delayed (debounced) call must never overwrite newer filter changes
  const latestParams = useRef(params);
  useEffect(() => {
    latestParams.current = params;
  }, [params]);

  function update(changes) {
    const next = new URLSearchParams(latestParams.current);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  }

  // Debounce typing in the search box
  useEffect(() => {
    if (searchInput.trim() === (latestParams.current.get('search') || '')) return undefined;
    const timer = setTimeout(() => update({ search: searchInput.trim() }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    api.get('/movies/filters').then(({ data: f }) => setFilters(f)).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .get('/movies', { params: { search: search || undefined, genre: genre || undefined, language: language || undefined, status, page, limit: 8 } })
      .then(({ data: res }) => active && setData(res))
      .catch((err) => active && setError(getErrorMessage(err, 'Could not load movies.')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [search, genre, language, status, page, reload]);

  const hasFilters = search || genre || language || status !== 'all';

  return (
    <div className="container py-4">
      <h1 className="im-section-title mb-3">Explore Movies</h1>

      <div className="filter-bar mb-4">
        <div className="row g-2 align-items-end">
          <div className="col-12 col-lg-5">
            <Form.Label htmlFor="movie-search" className="small text-muted mb-1">Search by title</Form.Label>
            <InputGroup>
              <InputGroup.Text className="bg-transparent border-secondary-subtle"><i className="bi bi-search" aria-hidden="true" /></InputGroup.Text>
              <Form.Control
                id="movie-search"
                type="search"
                placeholder="e.g. Neon Horizon"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </InputGroup>
          </div>
          <div className="col-6 col-lg-3">
            <Form.Label htmlFor="genre-filter" className="small text-muted mb-1">Genre</Form.Label>
            <Form.Select id="genre-filter" value={genre} onChange={(e) => update({ genre: e.target.value })}>
              <option value="">All genres</option>
              {filters.genres.map((g) => <option key={g} value={g}>{g}</option>)}
            </Form.Select>
          </div>
          <div className="col-6 col-lg-3">
            <Form.Label htmlFor="language-filter" className="small text-muted mb-1">Language</Form.Label>
            <Form.Select id="language-filter" value={language} onChange={(e) => update({ language: e.target.value })}>
              <option value="">All languages</option>
              {filters.languages.map((l) => <option key={l} value={l}>{l}</option>)}
            </Form.Select>
          </div>
          <div className="col-12 col-lg-1 d-grid">
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={!hasFilters}
              onClick={() => {
                setSearchInput('');
                setParams({}, { replace: true });
              }}
            >
              Clear
            </button>
          </div>
        </div>
        <Nav variant="pills" className="mt-3 gap-1" role="tablist" aria-label="Release status">
          {STATUS_TABS.map(([value, label]) => (
            <Nav.Item key={value}>
              <Nav.Link as="button" type="button" role="tab" aria-selected={status === value} active={status === value} onClick={() => update({ status: value === 'all' ? '' : value })}>
                {label}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      </div>

      <ErrorAlert message={error} onRetry={() => setReload((n) => n + 1)} />

      {loading ? (
        <Loader label="Finding movies..." />
      ) : data.movies.length === 0 ? (
        !error && (
          <EmptyState icon="bi-camera-reels" title="No movies match your filters">
            Try a different title, genre or language.
          </EmptyState>
        )
      ) : (
        <>
          <p className="small text-muted" aria-live="polite">
            Showing {data.movies.length} of {data.pagination.total} movie{data.pagination.total === 1 ? '' : 's'}
          </p>
          <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3 g-md-4">
            {data.movies.map((movie) => (
              <div className="col" key={movie._id}><MovieCard movie={movie} /></div>
            ))}
          </div>
          <PaginationBar page={data.pagination.page} pages={data.pagination.pages} onChange={(p) => update({ page: String(p) })} />
        </>
      )}
    </div>
  );
}
