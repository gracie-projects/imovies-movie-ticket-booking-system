import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SeatMap from '../components/SeatMap.jsx';
import { estimatePrice, formatCurrency } from '../utils/format.js';

const layout = { rows: 3, seatsPerRow: 4, premiumRows: ['C'], aisleAfter: [2] };
const prices = { standard: 180, premium: 280 };

function Harness({ booked = ['A2'], maxSeats = 10 }) {
  const [selected, setSelected] = useState([]);
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const { total } = estimatePrice(selected, prices, layout.premiumRows, 20);
  return (
    <>
      <SeatMap screen={layout} bookedSeats={booked} selected={selected} onToggle={toggle} prices={prices} maxSeats={maxSeats} />
      <output data-testid="total">{formatCurrency(total)}</output>
    </>
  );
}

describe('SeatMap', () => {
  it('renders every seat with its state', () => {
    render(<Harness />);
    expect(screen.getAllByRole('button', { name: /^Seat / })).toHaveLength(12);
    expect(screen.getByRole('button', { name: /Seat A2, standard.*booked/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Seat C1, premium/ })).toBeEnabled();
  });

  it('selects and deselects seats and updates the live price', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const a1 = screen.getByRole('button', { name: /Seat A1,/ });
    const c3 = screen.getByRole('button', { name: /Seat C3,/ });

    await user.click(a1);
    expect(a1).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('total')).toHaveTextContent(formatCurrency(180 + 20));

    await user.click(c3);
    expect(screen.getByTestId('total')).toHaveTextContent(formatCurrency(180 + 280 + 40));

    await user.click(a1);
    expect(a1).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('total')).toHaveTextContent(formatCurrency(280 + 20));
  });

  it('cannot select booked seats', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /Seat A2,/ }));
    expect(screen.getByTestId('total')).toHaveTextContent(formatCurrency(0));
  });

  it('works with the keyboard', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByRole('button', { name: /Seat B1,/ }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: /Seat B1,/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables unselected seats once the maximum is reached', async () => {
    const user = userEvent.setup();
    render(<Harness maxSeats={2} booked={[]} />);
    await user.click(screen.getByRole('button', { name: /Seat A1,/ }));
    await user.click(screen.getByRole('button', { name: /Seat A2,/ }));
    expect(screen.getByRole('button', { name: /Seat A3,/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Seat A1,/ })).toBeEnabled();
  });
});
