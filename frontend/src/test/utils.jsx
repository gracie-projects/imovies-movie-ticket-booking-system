import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../context/ToastContext.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';

/** Renders UI inside the same providers the real app uses */
export function renderWithProviders(ui, { route = '/', path = '*', extraRoutes = null } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path={path} element={ui} />
            {extraRoutes}
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

export const sampleMovie = {
  _id: 'm1',
  title: 'Neon Horizon',
  slug: 'neon-horizon',
  tagline: 'The future has a pulse.',
  description: 'A courier smuggles memories through a megacity.',
  genres: ['Sci-Fi', 'Action'],
  languages: ['English', 'Hindi'],
  durationMins: 142,
  certificate: 'UA13+',
  rating: 8.4,
  director: 'Aarav Mehta',
  cast: ['Riya Kapoor'],
  releaseDate: '2026-10-01T00:00:00.000Z',
  posterUrl: '/posters/neon-horizon.svg',
  status: 'now_showing',
};
