import { Link } from 'react-router-dom';
import { formatDate, formatDuration } from '../utils/format.js';

export default function MovieCard({ movie }) {
  const comingSoon = movie.status === 'coming_soon';
  return (
    <article className="movie-card position-relative" data-testid="movie-card">
      <div className="poster-wrap">
        <img src={movie.posterUrl} alt={`${movie.title} poster`} loading="lazy" />
        <span className={`badge badge-floating ${comingSoon ? 'text-bg-info' : 'text-bg-danger'}`}>
          {comingSoon ? 'Coming Soon' : 'Now Showing'}
        </span>
        {movie.rating > 0 && (
          <span className="rating-pill" aria-label={`Rated ${movie.rating} out of 10`}>
            <i className="bi bi-star-fill text-accent me-1" aria-hidden="true" />
            {movie.rating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="p-3 d-flex flex-column gap-2 flex-grow-1">
        <h3 className="h6 mb-0 fw-semibold">
          <Link to={`/movies/${movie.slug}`} className="stretched-link text-reset">
            {movie.title}
          </Link>
        </h3>
        <div className="small text-muted">
          {movie.certificate} • {formatDuration(movie.durationMins)}
          {comingSoon && <> • {formatDate(movie.releaseDate)}</>}
        </div>
        <div className="d-flex flex-wrap gap-1 mt-auto">
          {movie.genres.slice(0, 2).map((g) => (
            <span key={g} className="chip">{g}</span>
          ))}
          <span className="chip">{movie.languages.join(', ')}</span>
        </div>
      </div>
    </article>
  );
}
