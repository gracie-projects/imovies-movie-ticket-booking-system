import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container py-5 text-center">
      <h1 className="display-1 font-display text-accent">404</h1>
      <p className="lead">This scene didn&apos;t make the final cut.</p>
      <Link to="/" className="btn btn-accent mt-2">Back to home</Link>
    </div>
  );
}
