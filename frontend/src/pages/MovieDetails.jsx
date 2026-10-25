import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import { EmptyState, ErrorAlert, Loader } from '../components/common.jsx';
import { dayKey, formatCurrency, formatDate, formatDuration, formatShortDate, formatTime } from '../utils/format.js';

export default function MovieDetails() {
  const { slug } = useParams();
  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [language, setLanguage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [m, s] = await Promise.all([api.get(`/movies/${slug}`), api.get(`/movies/${slug}/showtimes`)]);
      setMovie(m.data.movie);
      setShowtimes(s.data.showtimes);
      setSelectedDay(s.data.showtimes[0] ? dayKey(s.data.showtimes[0].startTime) : '');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load this movie.'));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(() => {
    const map = new Map();
    showtimes.forEach((s) => map.has(dayKey(s.startTime)) || map.set(dayKey(s.startTime), s.startTime));
    return [...map.entries()];
  }, [showtimes]);

  const theaters = useMemo(() => {
    const groups = new Map();
    showtimes
      .filter((s) => dayKey(s.startTime) === selectedDay && (!language || s.language === language))
      .forEach((s) => {
        if (!groups.has(s.theater._id)) groups.set(s.theater._id, { theater: s.theater, shows: [] });
        groups.get(s.theater._id).shows.push(s);
      });
    return [...groups.values()];
  }, [showtimes, selectedDay, language]);

  if (loading) return <Loader label="Loading movie..." />;
  if (error) {
    return (
      <div className="container py-5">
        <ErrorAlert message={error} onRetry={load} />
        <Link to="/movies" className="btn btn-outline-light">Back to movies</Link>
      </div>
    );
  }

  const comingSoon = movie.status === 'coming_soon';

  return (
    <>
      <section className="hero mb-4" aria-label={movie.title}>
        <div className="hero-bg" style={{ backgroundImage: `url(${movie.backdropUrl || movie.posterUrl})` }} />
        <div className="container hero-content">
          <div className="row g-4 align-items-end">
            <div className="col-md-4 col-lg-3 d-none d-md-block">
              <img src={movie.posterUrl} alt={`${movie.title} poster`} className="hero-poster" />
            </div>
            <div className="col-md-8 col-lg-9">
              <nav aria-label="Breadcrumb" className="small mb-2">
                <Link to="/movies" className="text-muted">Movies</Link> <span className="text-muted">/</span> <span>{movie.title}</span>
              </nav>
              <h1 className="display font-display mb-1">{movie.title}</h1>
              {movie.tagline && <p className="lead text-light opacity-75">{movie.tagline}</p>}
              <div className="d-flex flex-wrap gap-2 small mb-3">
                {movie.rating > 0 && <span className="chip"><i className="bi bi-star-fill text-accent me-1" aria-hidden="true" />{movie.rating.toFixed(1)}/10</span>}
                <span className="chip">{movie.certificate}</span>
                <span className="chip"><i className="bi bi-clock me-1" aria-hidden="true" />{formatDuration(movie.durationMins)}</span>
                <span className="chip"><i className="bi bi-calendar3 me-1" aria-hidden="true" />{comingSoon ? 'Releases' : 'Released'} {formatDate(movie.releaseDate)}</span>
                {movie.genres.map((g) => <span className="chip" key={g}>{g}</span>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="row g-4">
          <div className="col-lg-4 order-lg-2">
            <div className="im-card p-4">
              <h2 className="h5">About the movie</h2>
              <p className="text-muted">{movie.description}</p>
              <dl className="mb-0 small">
                <dt className="ticket-label">Director</dt>
                <dd>{movie.director}</dd>
                <dt className="ticket-label">Cast</dt>
                <dd>{movie.cast.join(', ') || '—'}</dd>
                <dt className="ticket-label">Languages</dt>
                <dd className="mb-0">{movie.languages.join(', ')}</dd>
              </dl>
            </div>
          </div>

          <div className="col-lg-8 order-lg-1">
            <h2 className="im-section-title">Showtimes</h2>
            {comingSoon ? (
              <EmptyState icon="bi-hourglass-split" title="Bookings open soon">
                This movie releases on {formatDate(movie.releaseDate)}. Check back closer to the date.
              </EmptyState>
            ) : showtimes.length === 0 ? (
              <EmptyState icon="bi-calendar-x" title="No upcoming shows">No showtimes are scheduled for the next 7 days.</EmptyState>
            ) : (
              <>
                <div className="d-flex flex-wrap gap-2 mb-3" role="tablist" aria-label="Choose a date">
                  {days.map(([key, date]) => {
                    const [weekday, ...rest] = formatShortDate(date).split(' ');
                    return (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={selectedDay === key}
                        className={`date-tab ${selectedDay === key ? 'active' : ''}`}
                        onClick={() => setSelectedDay(key)}
                        data-testid="date-tab"
                      >
                        <small>{weekday.replace(',', '')}</small>
                        <strong>{rest[0]}</strong>
                        <small>{rest[1]}</small>
                      </button>
                    );
                  })}
                </div>
                {movie.languages.length > 1 && (
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <label htmlFor="show-language" className="small text-muted">Language</label>
                    <select id="show-language" className="form-select form-select-sm w-auto" value={language} onChange={(e) => setLanguage(e.target.value)}>
                      <option value="">All</option>
                      {movie.languages.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                )}
                {theaters.length === 0 ? (
                  <EmptyState icon="bi-calendar-x" title="No shows for this selection" />
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {theaters.map(({ theater, shows }) => (
                      <div className="im-card p-3 p-md-4" key={theater._id} data-testid="theater-showtimes">
                        <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
                          <div>
                            <h3 className="h6 mb-1"><i className="bi bi-geo-alt-fill text-danger me-1" aria-hidden="true" />{theater.name}</h3>
                            <div className="small text-muted">{theater.address}</div>
                          </div>
                          <div className="d-flex flex-wrap gap-1 align-items-start">
                            {theater.amenities.slice(0, 3).map((a) => <span key={a} className="chip">{a}</span>)}
                          </div>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {shows.map((s) => (
                            <Link
                              key={s._id}
                              to={`/booking/${s._id}`}
                              className={`time-chip ${s.seatsLeft / s.capacity < 0.3 ? 'filling' : ''}`}
                              aria-label={`${formatTime(s.startTime)}, ${s.language} ${s.format}, ${s.screen.name}, ${s.seatsLeft} seats left, from ${formatCurrency(s.prices.standard)}`}
                              data-testid="showtime-link"
                            >
                              {formatTime(s.startTime)}
                              <small>{s.language} • {s.format} • {s.screen.name}</small>
                              <small>{s.seatsLeft} seats left • from {formatCurrency(s.prices.standard)}</small>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
