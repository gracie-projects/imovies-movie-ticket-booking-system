import { Container, Nav, Navbar, NavDropdown } from 'react-bootstrap';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function AppNavbar() {
  const { user, isAdmin, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    notify('You have been logged out.', 'info');
    navigate('/');
  }

  return (
    <Navbar expand="md" sticky="top" className="im-navbar" variant="dark" collapseOnSelect>
      <Container>
        <Navbar.Brand as={Link} to="/" className="brand-logo brand-text" aria-label="IMovies home">
          <span className="brand-i">I</span>Movies <i className="bi bi-film text-accent fs-5 align-middle" aria-hidden="true" />
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto">
            <Nav.Link as={NavLink} to="/" end eventKey="home">Home</Nav.Link>
            <Nav.Link as={NavLink} to="/movies" eventKey="movies">Movies</Nav.Link>
            {user && <Nav.Link as={NavLink} to="/my-bookings" eventKey="bookings">My Bookings</Nav.Link>}
            {isAdmin && (
              <Nav.Link as={NavLink} to="/admin" eventKey="admin">
                <i className="bi bi-speedometer2 me-1" aria-hidden="true" />Admin
              </Nav.Link>
            )}
          </Nav>
          <Nav>
            {user ? (
              <NavDropdown
                align="end"
                id="account-menu"
                title={
                  <span>
                    <i className="bi bi-person-circle me-1" aria-hidden="true" />
                    {user.name.split(' ')[0]}
                  </span>
                }
              >
                <NavDropdown.Item as={Link} to="/profile">Profile</NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/my-bookings">My Bookings</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item as="button" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-2" aria-hidden="true" />Log out
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <div className="d-flex gap-2 py-2 py-md-0">
                <Link to="/login" className="btn btn-outline-light btn-sm px-3">Log in</Link>
                <Link to="/register" className="btn btn-accent btn-sm px-3">Sign up</Link>
              </div>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
