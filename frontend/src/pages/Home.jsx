import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import MovieCard from '../components/MovieCard.jsx';
import { ErrorAlert, Loader } from '../components/common.jsx';
import { formatDuration } from '../utils/format.js';

export default function Home() {
  const [nowShowing, setNowShowing] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [now, soon] = await Promise.all([
        api.get('/movies', { params: { status: 'now_showing', limit: 8 } }),
        api.get('/movies', { params: { status: 'coming_soon', limit: 4 } }),
      ]);
      setNowShowing(now.data.movies);
      setComingSoon(soon.data.movies);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load movies.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const featured = [...nowShowing].sort((a, b) => b.rating - a.rating)[0];

  return (
    <>
      {featured && (
        <section className="hero mb-5" aria-label="Featured movie">
          <div className="hero-bg" style={{ backgroundImage: `url(${featured.backdropUrl || featured.posterUrl})` }} />
          <div className="container hero-content">
            <div className="row align-items-end g-4">
              <div className="col-lg-8">
                <span className="badge text-bg-danger mb-3">
                  <i className="bi bi-fire me-1" aria-hidden="true" />Featured this week
                </span>
                <h1 className="display font-display">{featured.title}</h1>
                <p className="lead text-light opacity-75 mb-2">{featured.tagline}</p>
                <div className="d-flex flex-wrap gap-2 mb-4 small">
                  <span className="chip"><i className="bi bi-star-fill text-accent me-1" aria-hidden="true" />{featured.rating.toFixed(1)}/10</span>
                  <span className="chip">{featured.certificate}</span>
                  <span className="chip">{formatDuration(featured.durationMins)}</span>
                  <span className="chip">{featured.genres.join(' • ')}</span>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <Link to={`/movies/${featured.slug}`} className="btn btn-cinema btn-lg px-4">
                    <i className="bi bi-ticket-perforated me-2" aria-hidden="true" />Book tickets
                  </Link>
                  <Link to="/movies" className="btn btn-outline-light btn-lg px-4">Browse all movies</Link>
                </div>
              </div>
              <div className="col-lg-4 d-none d-lg-flex justify-content-end">
                <img src={featured.posterUrl} alt={`${featured.title} poster`} className="hero-poster" />
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="container">
        {!featured && !loading && (
          <section className="py-5 text-center">
            <h1 className="display font-display">Movie ticket booking made simple.</h1>
          </section>
        )}
        <ErrorAlert message={error} onRetry={load} />
        {loading ? (
          <Loader label="Rolling the trailers..." />
        ) : (
          <>
            <section className="mb-5" aria-labelledby="now-showing-heading">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 id="now-showing-heading" className="im-section-title mb-0">Now Showing</h2>
                <Link to="/movies?status=now_showing" className="small">See all <i className="bi bi-arrow-right" aria-hidden="true" /></Link>
              </div>
              <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3 g-md-4">
                {nowShowing.map((movie) => (
                  <div className="col" key={movie._id}><MovieCard movie={movie} /></div>
                ))}
              </div>
            </section>

            {comingSoon.length > 0 && (
              <section className="mb-5" aria-labelledby="coming-soon-heading">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 id="coming-soon-heading" className="im-section-title mb-0">Coming Soon</h2>
                  <Link to="/movies?status=coming_soon" className="small">See all <i className="bi bi-arrow-right" aria-hidden="true" /></Link>
                </div>
                <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3 g-md-4">
                  {comingSoon.map((movie) => (
                    <div className="col" key={movie._id}><MovieCard movie={movie} /></div>
                  ))}
                </div>
              </section>
            )}

            <section className="im-card p-4 p-md-5 mb-4" aria-label="How it works">
              <div className="row g-4 text-center">
                {[
                  ['bi-search', 'Find a movie', 'Search by title, genre or language.'],
                  ['bi-calendar-event', 'Pick a show', 'Choose the theater, date and time.'],
                  ['bi-grid-3x3-gap', 'Choose seats', 'Live seat map with instant pricing.'],
                  ['bi-qr-code', 'Get your ticket', 'Instant digital ticket with QR code.'],
                ].map(([icon, title, text]) => (
                  <div className="col-6 col-md-3" key={title}>
                    <i className={`bi ${icon} fs-2 text-accent`} aria-hidden="true" />
                    <h3 className="h6 mt-2 mb-1">{title}</h3>
                    <p className="small text-muted mb-0">{text}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
