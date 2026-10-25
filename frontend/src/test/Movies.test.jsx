import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import api from '../api/client.js';
import Movies from '../pages/Movies.jsx';
import Home from '../pages/Home.jsx';
import { renderWithProviders, sampleMovie } from './utils.jsx';

vi.mock('../api/client.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } };
});

const comedy = { ...sampleMovie, _id: 'm2', title: 'Laugh Track', slug: 'laugh-track', genres: ['Comedy'], languages: ['Hindi'] };

function mockApi(movies = [sampleMovie, comedy]) {
  api.get.mockImplementation((url, config = {}) => {
    if (url === '/auth/me') return Promise.reject({ response: { status: 401 } });
    if (url === '/movies/filters') return Promise.resolve({ data: { genres: ['Action', 'Comedy', 'Sci-Fi'], languages: ['English', 'Hindi'] } });
    if (url === '/movies') {
      const { search, genre, status } = config.params || {};
      const list = movies.filter(
        (m) => (!search || m.title.toLowerCase().includes(search.toLowerCase()))
          && (!genre || m.genres.includes(genre))
          && (!status || status === 'all' || m.status === status),
      );
      return Promise.resolve({ data: { movies: list, pagination: { page: 1, limit: 8, total: list.length, pages: 1 } } });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe('Movie catalog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a loading state, then movie cards', async () => {
    mockApi();
    renderWithProviders(<Movies />, { route: '/movies' });
    expect(screen.getByText(/finding movies/i)).toBeInTheDocument();
    expect(await screen.findAllByTestId('movie-card')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Neon Horizon' })).toHaveAttribute('href', '/movies/neon-horizon');
  });

  it('filters by genre', async () => {
    mockApi();
    const user = userEvent.setup();
    renderWithProviders(<Movies />, { route: '/movies' });
    await screen.findAllByTestId('movie-card');
    await user.selectOptions(await screen.findByLabelText('Genre'), 'Comedy');
    await waitFor(() => expect(screen.getAllByTestId('movie-card')).toHaveLength(1));
    expect(screen.getByText('Laugh Track')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/movies', expect.objectContaining({ params: expect.objectContaining({ genre: 'Comedy' }) }));
  });

  it('searches by title with debounce', async () => {
    mockApi();
    const user = userEvent.setup();
    renderWithProviders(<Movies />, { route: '/movies' });
    await screen.findAllByTestId('movie-card');
    await user.type(screen.getByLabelText(/search by title/i), 'neon');
    await waitFor(() => expect(screen.getAllByTestId('movie-card')).toHaveLength(1));
    expect(screen.getByText('Neon Horizon')).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    mockApi([]);
    renderWithProviders(<Movies />, { route: '/movies' });
    expect(await screen.findByText(/no movies match/i)).toBeInTheDocument();
  });

  it('shows an error with retry when the API fails', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/movies') return Promise.reject({ request: {}, message: 'Network Error' });
      return Promise.reject({ response: { status: 401 } });
    });
    renderWithProviders(<Movies />, { route: '/movies' });
    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot reach the imovies server/i);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('home page features a movie and lists now showing', async () => {
    mockApi();
    renderWithProviders(<Home />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Neon Horizon' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /book tickets/i })).toHaveAttribute('href', '/movies/neon-horizon');
  });
});
