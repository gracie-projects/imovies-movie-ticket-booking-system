import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { vi } from 'vitest';
import api from '../api/client.js';
import { Login, Register, validateRegister } from '../pages/Auth.jsx';
import ProtectedRoute from '../components/ProtectedRoute.jsx';
import { renderWithProviders } from './utils.jsx';

vi.mock('../api/client.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } };
});

const demoUser = { _id: 'u1', name: 'Demo Customer', email: 'demo@imovies.test', role: 'user' };

function loggedOut() {
  api.get.mockRejectedValue({ response: { status: 401, data: { message: 'Please log in to continue' } } });
}

describe('Authentication forms', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates registration fields on the client', () => {
    expect(validateRegister({ name: 'A', email: 'bad', password: 'short', confirm: 'x' })).toEqual({
      name: expect.any(String),
      email: expect.any(String),
      password: expect.any(String),
      confirm: expect.any(String),
    });
    expect(validateRegister({ name: 'Asha', email: 'a@b.co', password: 'Secret123', confirm: 'Secret123' })).toEqual({});
  });

  it('shows validation errors and does not call the API for an invalid login', async () => {
    loggedOut();
    const user = userEvent.setup();
    renderWithProviders(<Login />, { route: '/login' });
    await user.click(await screen.findByRole('button', { name: 'Log in' }));
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('displays the server error for wrong credentials', async () => {
    loggedOut();
    api.post.mockRejectedValue({ response: { status: 401, data: { message: 'Invalid email or password' } } });
    const user = userEvent.setup();
    renderWithProviders(<Login />, { route: '/login' });
    await user.type(await screen.findByLabelText('Email'), 'demo@imovies.test');
    await user.type(screen.getByLabelText('Password'), 'wrong-password1');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('logs in and redirects to the requested page', async () => {
    loggedOut();
    api.post.mockResolvedValue({ data: { user: demoUser } });
    const user = userEvent.setup();
    renderWithProviders(<Login />, {
      route: '/login?redirect=%2Fmy-bookings',
      path: '/login',
      extraRoutes: <Route path="/my-bookings" element={<h1>Bookings page</h1>} />,
    });
    await user.type(await screen.findByLabelText('Email'), 'demo@imovies.test');
    await user.type(screen.getByLabelText('Password'), 'Demo@12345');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('heading', { name: 'Bookings page' })).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'demo@imovies.test', password: 'Demo@12345' });
  });

  it('ignores external redirect targets', async () => {
    loggedOut();
    api.post.mockResolvedValue({ data: { user: demoUser } });
    const user = userEvent.setup();
    renderWithProviders(<Login />, {
      route: '/login?redirect=%2F%2Fevil.example.com',
      path: '/login',
      extraRoutes: <Route path="/" element={<h1>Home page</h1>} />,
    });
    await user.type(await screen.findByLabelText('Email'), 'demo@imovies.test');
    await user.type(screen.getByLabelText('Password'), 'Demo@12345');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('heading', { name: 'Home page' })).toBeInTheDocument();
  });

  it('registers a new account', async () => {
    loggedOut();
    api.post.mockResolvedValue({ data: { user: { ...demoUser, name: 'Asha' } } });
    const user = userEvent.setup();
    renderWithProviders(<Register />, { route: '/register', path: '/register', extraRoutes: <Route path="/" element={<h1>Home page</h1>} /> });
    await user.type(await screen.findByLabelText('Full name'), 'Asha');
    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText('Password'), 'Secret123');
    await user.type(screen.getByLabelText('Confirm password'), 'Secret123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/register', { name: 'Asha', email: 'asha@example.com', password: 'Secret123' }));
  });
});

describe('ProtectedRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects anonymous visitors to login with a return path', async () => {
    loggedOut();
    renderWithProviders(<ProtectedRoute><h1>Secret</h1></ProtectedRoute>, {
      route: '/my-bookings',
      path: '/my-bookings',
      extraRoutes: <Route path="/login" element={<Login />} />,
    });
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  it('renders the page for a logged-in user', async () => {
    api.get.mockResolvedValue({ data: { user: demoUser } });
    renderWithProviders(<ProtectedRoute><h1>Secret</h1></ProtectedRoute>);
    expect(await screen.findByRole('heading', { name: 'Secret' })).toBeInTheDocument();
  });

  it('denies customers access to admin-only pages', async () => {
    api.get.mockResolvedValue({ data: { user: demoUser } });
    renderWithProviders(<ProtectedRoute role="admin"><h1>Admin</h1></ProtectedRoute>);
    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
  });
});
