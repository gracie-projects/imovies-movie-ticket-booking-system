import { useState } from 'react';
import { Tab, Tabs } from 'react-bootstrap';
import Overview from './Overview.jsx';
import MoviesAdmin from './MoviesAdmin.jsx';
import TheatersAdmin from './TheatersAdmin.jsx';
import ShowtimesAdmin from './ShowtimesAdmin.jsx';
import BookingsAdmin from './BookingsAdmin.jsx';

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  return (
    <div className="container py-4">
      <div className="d-flex align-items-center gap-2 mb-3">
        <i className="bi bi-speedometer2 fs-3 text-accent" aria-hidden="true" />
        <h1 className="h3 mb-0">Admin Dashboard</h1>
      </div>
      <Tabs activeKey={tab} onSelect={(k) => setTab(k)} className="admin-tabs mb-4" mountOnEnter>
        <Tab eventKey="overview" title="Overview"><Overview /></Tab>
        <Tab eventKey="movies" title="Movies"><MoviesAdmin /></Tab>
        <Tab eventKey="theaters" title="Theaters & Screens"><TheatersAdmin /></Tab>
        <Tab eventKey="showtimes" title="Showtimes"><ShowtimesAdmin /></Tab>
        <Tab eventKey="bookings" title="Bookings"><BookingsAdmin /></Tab>
      </Tabs>
    </div>
  );
}
