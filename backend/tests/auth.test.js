import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, client, reseed, loginAs } from './helpers.js';

describe('Authentication API', () => {
  beforeAll(reseed);

  it('registers a new user, sets an httpOnly cookie and never returns the password hash', async () => {
    const c = client();
    const res = await c.post('/api/auth/register').send({
      name: 'Asha Verma',
      email: 'Asha@Example.com',
      password: 'Secret123',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('asha@example.com');
    expect(res.body.user.role).toBe('user');
    expect(res.body.user.passwordHash).toBeUndefined();
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/imovies_token=/);
    expect(cookie).toMatch(/HttpOnly/i);

    const me = await c.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.name).toBe('Asha Verma');
  });

  it('ignores attempts to self-register as admin', async () => {
    const res = await client().post('/api/auth/register').send({
      name: 'Sneaky', email: 'sneaky@example.com', password: 'Secret123', role: 'admin',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('user');
  });

  it('rejects duplicate emails', async () => {
    const res = await client().post('/api/auth/register').send({
      name: 'Dup', email: 'demo@imovies.test', password: 'Secret123',
    });
    expect(res.status).toBe(409);
  });

  it.each([
    [{ name: 'A', email: 'a@b.com', password: 'Secret123' }, /at least 2/i],
    [{ name: 'Valid', email: 'not-an-email', password: 'Secret123' }, /valid email/i],
    [{ name: 'Valid', email: 'v@b.com', password: 'short1' }, /at least 8/i],
    [{ name: 'Valid', email: 'v@b.com', password: 'nodigitshere' }, /number/i],
  ])('validates registration input %#', async (body, message) => {
    const res = await client().post('/api/auth/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(message);
  });

  it('logs in with valid credentials and rejects invalid ones with a generic message', async () => {
    const ok = await client().post('/api/auth/login').send({ email: 'demo@imovies.test', password: 'Demo@12345' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.role).toBe('user');

    const wrongPassword = await client().post('/api/auth/login').send({ email: 'demo@imovies.test', password: 'nope' });
    const unknownUser = await client().post('/api/auth/login').send({ email: 'ghost@imovies.test', password: 'nope' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownUser.body.message);
  });

  it('requires authentication for /me and clears the session on logout', async () => {
    expect((await client().get('/api/auth/me')).status).toBe(401);

    const c = await loginAs('user');
    expect((await c.get('/api/auth/me')).status).toBe(200);
    const out = await c.post('/api/auth/logout');
    expect(out.status).toBe(200);
    expect((await c.get('/api/auth/me')).status).toBe(401);
  });

  it('rejects tampered or expired tokens', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });

  it('updates profile details and changes password', async () => {
    const c = client();
    await c.post('/api/auth/register').send({ name: 'Profile User', email: 'profile@example.com', password: 'Secret123' });

    const upd = await c.patch('/api/auth/me').send({ name: 'Renamed User', phone: '+91 98765 43210' });
    expect(upd.status).toBe(200);
    expect(upd.body.user.name).toBe('Renamed User');

    const bad = await c.post('/api/auth/change-password').send({ currentPassword: 'wrong', newPassword: 'NewSecret1' });
    expect(bad.status).toBe(400);
    const good = await c.post('/api/auth/change-password').send({ currentPassword: 'Secret123', newPassword: 'NewSecret1' });
    expect(good.status).toBe(200);

    const login = await client().post('/api/auth/login').send({ email: 'profile@example.com', password: 'NewSecret1' });
    expect(login.status).toBe(200);
  });

  it('blocks state-changing requests without the CSRF header', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'demo@imovies.test', password: 'Demo@12345' });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/csrf/i);
  });
});
