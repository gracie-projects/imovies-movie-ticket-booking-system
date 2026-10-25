import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { vi } from 'vitest';
import api from '../api/client.js';
import Checkout from '../pages/Checkout.jsx';
import BookingConfirmation from '../pages/BookingConfirmation.jsx';
import TicketCard from '../components/TicketCard.jsx';
import { formatCurrency } from '../utils/format.js';
import { renderWithProviders, sampleMovie } from './utils.jsx';

vi.mock('../api/client.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } };
});

const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
const showtime = {
  _id: 's1',
  startTime: start,
  language: 'English',
  format: 'IMAX',
  prices: { standard: 320, premium: 480 },
  bookedSeats: [],
  movie: sampleMovie,
  theater: { name: 'IMovies Grand Central', address: 'AB Road, Indore' },
  screen: { name: 'Audi 2 - IMAX', rows: 9, seatsPerRow: 14, premiumRows: ['H', 'I'] },
  convenienceFeePerSeat: 20,
  bookingOpen: true,
};
const quote = {
  seats: [{ id: 'D5', type: 'standard', price: 320 }, { id: 'H6', type: 'premium', price: 480 }],
  subtotal: 800, convenienceFee: 40, total: 840, currency: 'INR', unavailable: [],
};
const booking = {
  _id: 'b1', reference: 'IMV-ABCD2345', status: 'confirmed', seats: quote.seats, subtotal: 800, convenienceFee: 40, total: 840,
  paymentMethod: 'upi', movie: sampleMovie, theater: showtime.theater, screen: { name: 'Audi 2 - IMAX' },
  showtime: { startTime: start, language: 'English', format: 'IMAX' }, showStartTime: start,
};
const demoUser = { _id: 'u1', name: 'Demo Customer', email: 'demo@imovies.test', role: 'user' };

function mockLoggedIn() {
  api.get.mockImplementation((url) => {
    if (url === '/auth/me') return Promise.resolve({ data: { user: demoUser } });
    if (url === '/showtimes/s1') return Promise.resolve({ data: { showtime } });
    if (url === '/bookings/b1') return Promise.resolve({ data: { booking } });
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe('Checkout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the server quote and pays once with an idempotency key', async () => {
    mockLoggedIn();
    api.post.mockImplementation((url) => {
      if (url === '/bookings/quote') return Promise.resolve({ data: { quote } });
      if (url === '/bookings') return Promise.resolve({ data: { booking } });
      return Promise.reject(new Error(url));
    });
    const user = userEvent.setup();
    renderWithProviders(<Checkout />, {
      route: '/checkout?showtime=s1&seats=D5,H6',
      path: '/checkout',
      extraRoutes: <Route path="/bookings/:id" element={<h1>Confirmation</h1>} />,
    });

    expect(await screen.findByTestId('checkout-total')).toHaveTextContent(formatCurrency(840));
    const pay = screen.getByTestId('pay-button');
    await user.click(pay);
    expect(await screen.findByRole('heading', { name: 'Confirmation' })).toBeInTheDocument();

    const bookingCalls = api.post.mock.calls.filter(([url]) => url === '/bookings');
    expect(bookingCalls).toHaveLength(1);
    expect(bookingCalls[0][1]).toMatchObject({ showtimeId: 's1', seats: ['D5', 'H6'], paymentMethod: 'upi' });
    expect(bookingCalls[0][1].idempotencyKey).toEqual(expect.any(String));
  });

  it('explains a seat conflict and offers to choose different seats', async () => {
    mockLoggedIn();
    api.post.mockImplementation((url) => {
      if (url === '/bookings/quote') return Promise.resolve({ data: { quote } });
      return Promise.reject({ response: { status: 409, data: { message: 'taken', details: { conflictingSeats: ['H6'] } } } });
    });
    const user = userEvent.setup();
    renderWithProviders(<Checkout />, { route: '/checkout?showtime=s1&seats=D5,H6', path: '/checkout' });
    await user.click(await screen.findByTestId('pay-button'));
    const alert = await screen.findByTestId('seat-conflict');
    expect(alert).toHaveTextContent('H6');
    expect(screen.getByRole('link', { name: /choose different seats/i })).toHaveAttribute('href', '/booking/s1?seats=D5');
    expect(screen.getByTestId('pay-button')).toBeDisabled();
  });

  it('shows a helpful message when no seats are selected', async () => {
    mockLoggedIn();
    renderWithProviders(<Checkout />, { route: '/checkout', path: '/checkout' });
    expect(await screen.findByText(/no seats selected/i)).toBeInTheDocument();
  });
});

describe('Confirmation & ticket', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the digital ticket with reference, seats and total', () => {
    renderWithProviders(<TicketCard booking={booking} />);
    expect(screen.getByTestId('booking-reference')).toHaveTextContent('IMV-ABCD2345');
    expect(screen.getByTestId('ticket-seats')).toHaveTextContent('D5, H6');
    expect(screen.getByTestId('ticket-total')).toHaveTextContent(formatCurrency(840));
    expect(screen.getByLabelText('Ticket QR code')).toBeInTheDocument();
  });

  it('confirmation page loads the booking', async () => {
    mockLoggedIn();
    renderWithProviders(<BookingConfirmation />, { route: '/bookings/b1?new=1', path: '/bookings/:id' });
    await waitFor(() => expect(screen.getByTestId('confirmation-heading')).toHaveTextContent('Booking confirmed!'));
    expect(screen.getByRole('link', { name: /my bookings/i })).toHaveAttribute('href', '/my-bookings');
  });
});
