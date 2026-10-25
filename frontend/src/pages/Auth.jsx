import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Spinner } from 'react-bootstrap';
import { getErrorMessage } from '../api/client.js';
import { ErrorAlert } from '../components/common.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only allow redirects to paths inside this app (prevents open redirects) */
function safeRedirect(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export function validateLogin({ email, password }) {
  const errors = {};
  if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Password is required';
  return errors;
}

export function validateRegister({ name, email, password, confirm }) {
  const errors = {};
  if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) errors.password = 'Password must contain a letter and a number';
  if (confirm !== password) errors.confirm = 'Passwords do not match';
  return errors;
}

function Field({ id, label, error, ...props }) {
  return (
    <Form.Group className="mb-3" controlId={id}>
      <Form.Label>{label}</Form.Label>
      <Form.Control isInvalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error && <Form.Control.Feedback type="invalid" id={`${id}-error`}>{error}</Form.Control.Feedback>}
    </Form.Group>
  );
}

function AuthShell({ title, subtitle, children }) {
  return (
    <div className="container">
      <div className="auth-card im-card p-4 p-md-5">
        <div className="text-center mb-4">
          <i className="bi bi-film fs-1 text-accent" aria-hidden="true" />
          <h1 className="h3 mt-2 mb-1">{title}</h1>
          <p className="text-muted mb-0">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Login() {
  const { user, login } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user && !submitting) return <Navigate to={redirect} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateLogin(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSubmitting(true);
    setServerError('');
    try {
      const loggedIn = await login(form.email.trim(), form.password);
      notify(`Welcome back, ${loggedIn.name.split(' ')[0]}!`);
      navigate(redirect, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, 'Login failed.'));
      setSubmitting(false);
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <AuthShell title="Welcome back" subtitle="Log in to book your seats">
      <ErrorAlert message={serverError} />
      <Form noValidate onSubmit={handleSubmit} aria-label="Log in form">
        <Field id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} />
        <button type="submit" className="btn btn-accent w-100 py-2" disabled={submitting}>
          {submitting ? <><Spinner size="sm" className="me-2" aria-hidden="true" />Logging in...</> : 'Log in'}
        </button>
      </Form>
      <p className="text-center small text-muted mt-4 mb-0">
        New to IMovies? <Link to={`/register${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}>Create an account</Link>
      </p>
    </AuthShell>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user && !submitting) return <Navigate to={redirect} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateRegister(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSubmitting(true);
    setServerError('');
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      notify('Account created. Enjoy the show!');
      navigate(redirect, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, 'Registration failed.'));
      setSubmitting(false);
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <AuthShell title="Create your account" subtitle="Join IMovies in seconds">
      <ErrorAlert message={serverError} />
      <Form noValidate onSubmit={handleSubmit} aria-label="Registration form">
        <Field id="name" label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
        <Field id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <Field id="password" label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
        <Form.Text className="d-block mt-n2 mb-3 small text-muted">At least 8 characters, including a letter and a number.</Form.Text>
        <Field id="confirm" label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <button type="submit" className="btn btn-accent w-100 py-2" disabled={submitting}>
          {submitting ? <><Spinner size="sm" className="me-2" aria-hidden="true" />Creating account...</> : 'Create account'}
        </button>
      </Form>
      <p className="text-center small text-muted mt-4 mb-0">
        Already have an account? <Link to={`/login${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}>Log in</Link>
      </p>
    </AuthShell>
  );
}
