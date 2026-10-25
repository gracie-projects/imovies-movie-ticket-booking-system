import { useState } from 'react';
import { Form } from 'react-bootstrap';
import api, { getErrorMessage } from '../api/client.js';
import { ErrorAlert } from '../components/common.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate } from '../utils/format.js';

export default function Profile() {
  const { user, setUser } = useAuth();
  const { notify } = useToast();
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [saving, setSaving] = useState('');

  async function saveProfile(e) {
    e.preventDefault();
    setSaving('profile');
    setProfileError('');
    try {
      const { data } = await api.patch('/auth/me', { name: profile.name.trim(), phone: profile.phone.trim() });
      setUser(data.user);
      notify('Profile updated.');
    } catch (err) {
      setProfileError(getErrorMessage(err));
    } finally {
      setSaving('');
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setSaving('password');
    setPasswordError('');
    try {
      await api.post('/auth/change-password', passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      notify('Password changed.');
    } catch (err) {
      setPasswordError(getErrorMessage(err));
    } finally {
      setSaving('');
    }
  }

  return (
    <div className="container py-4" style={{ maxWidth: 820 }}>
      <h1 className="im-section-title mb-4">My Profile</h1>
      <div className="row g-4">
        <div className="col-md-6">
          <form className="im-card p-4 h-100" onSubmit={saveProfile} aria-label="Profile details">
            <h2 className="h5 mb-3">Account details</h2>
            <ErrorAlert message={profileError} />
            <Form.Group className="mb-3" controlId="profile-email">
              <Form.Label>Email</Form.Label>
              <Form.Control value={user.email} readOnly plaintext className="text-light" />
            </Form.Group>
            <Form.Group className="mb-3" controlId="profile-name">
              <Form.Label>Full name</Form.Label>
              <Form.Control value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required minLength={2} maxLength={60} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="profile-phone">
              <Form.Label>Phone (optional)</Form.Label>
              <Form.Control value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} maxLength={20} inputMode="tel" />
            </Form.Group>
            <p className="small text-muted">Member since {formatDate(user.createdAt)} • Role: {user.role}</p>
            <button className="btn btn-accent" type="submit" disabled={saving === 'profile'}>
              {saving === 'profile' ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </div>
        <div className="col-md-6">
          <form className="im-card p-4 h-100" onSubmit={changePassword} aria-label="Change password">
            <h2 className="h5 mb-3">Change password</h2>
            <ErrorAlert message={passwordError} />
            <Form.Group className="mb-3" controlId="current-password">
              <Form.Label>Current password</Form.Label>
              <Form.Control type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3" controlId="new-password">
              <Form.Label>New password</Form.Label>
              <Form.Control type="password" autoComplete="new-password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength={8} />
              <Form.Text className="text-muted">At least 8 characters with a letter and a number.</Form.Text>
            </Form.Group>
            <button className="btn btn-outline-light" type="submit" disabled={saving === 'password'}>
              {saving === 'password' ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
