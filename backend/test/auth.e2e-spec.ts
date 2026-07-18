import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// Requires a live Postgres + Redis reachable via the DATABASE_URL / REDIS_HOST env vars
// (same as `npm run start:dev`), and an admin account matching ADMIN_EMAIL / ADMIN_PASSWORD.
// Run with `npm run test:e2e`. Deliberately makes few calls to POST /auth/login — it's
// throttled to 5/min, and this suite shares that budget with anything else hitting it.
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let throwawayUserId: string;

  const throwawayEmail = `e2e-test-${Date.now()}@example.com`;
  const throwawayPassword = 'ThrowawayPass123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.accessToken;

    const created = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: throwawayEmail, password: throwawayPassword })
      .expect(201);
    throwawayUserId = created.body.id;
  });

  afterAll(async () => {
    if (throwawayUserId) {
      await request(app.getHttpServer())
        .delete(`/users/${throwawayUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
    await app.close();
  });

  it('rejects protected routes with no token', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('rejects login with the wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: throwawayEmail, password: 'WrongPassword123!' })
      .expect(401);
  });

  it('logs in, accesses a protected route, refreshes, and logs out', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: throwawayEmail, password: throwawayPassword })
      .expect(200);

    const { accessToken, refreshToken } = login.body;
    expect(accessToken).toEqual(expect.any(String));
    expect(refreshToken).toEqual(expect.any(String));

    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body.email).toBe(throwawayEmail);
    expect(me.body.passwordHash).toBeUndefined();

    const refreshed = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`)
      .expect(204);

    // the refresh token was invalidated by logout — reusing it must fail
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: refreshed.body.refreshToken })
      .expect(401);
  });

  it('enforces role-based access: a non-admin cannot list users', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: throwawayEmail, password: throwawayPassword })
      .expect(200);

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
  });
});
