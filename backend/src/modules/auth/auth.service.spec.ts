import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { User, UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; findById: jest.Mock };
  let authRepository: { setRefreshTokenHash: jest.Mock };

  const config = {
    getOrThrow: (key: string) =>
      ({
        JWT_SECRET: 'test-access-secret',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
      })[key],
  };

  let plainPassword: string;
  let user: User;

  beforeAll(async () => {
    plainPassword = 'CorrectPassword123!';
    user = {
      id: 'user-1',
      email: 'admin@example.com',
      passwordHash: await argon2.hash(plainPassword),
      role: UserRole.ADMIN,
      refreshTokenHash: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn(), findById: jest.fn() };
    authRepository = { setRefreshTokenHash: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: AuthRepository, useValue: authRepository },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('issues tokens and persists the refresh token hash for correct credentials', async () => {
      usersService.findByEmail.mockResolvedValue(user);

      const tokens = await service.login(user.email, plainPassword);

      expect(tokens.accessToken).toEqual(expect.any(String));
      expect(tokens.refreshToken).toEqual(expect.any(String));
      expect(authRepository.setRefreshTokenHash).toHaveBeenCalledWith(user.id, expect.any(String));

      const decoded = new JwtService().decode(tokens.accessToken) as { sub: string; role: string };
      expect(decoded.sub).toBe(user.id);
      expect(decoded.role).toBe(UserRole.ADMIN);
    });

    it('rejects when the user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login('nobody@example.com', plainPassword)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authRepository.setRefreshTokenHash).not.toHaveBeenCalled();
    });

    it('rejects when the password is wrong', async () => {
      usersService.findByEmail.mockResolvedValue(user);

      await expect(service.login(user.email, 'WrongPassword')).rejects.toThrow(UnauthorizedException);
      expect(authRepository.setRefreshTokenHash).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('rejects when the user has no stored refresh token hash', async () => {
      usersService.findById.mockResolvedValue({ ...user, refreshTokenHash: null });

      await expect(service.refresh(user.id, 'some-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects when the provided refresh token does not match the stored hash', async () => {
      usersService.findById.mockResolvedValue({
        ...user,
        refreshTokenHash: await argon2.hash('a-different-refresh-token'),
      });

      await expect(service.refresh(user.id, 'wrong-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('issues a new token pair when the refresh token matches', async () => {
      const validRefreshToken = 'valid-refresh-token';
      usersService.findById.mockResolvedValue({
        ...user,
        refreshTokenHash: await argon2.hash(validRefreshToken),
      });

      const tokens = await service.refresh(user.id, validRefreshToken);

      expect(tokens.accessToken).toEqual(expect.any(String));
      expect(authRepository.setRefreshTokenHash).toHaveBeenCalledWith(user.id, expect.any(String));
    });
  });

  describe('logout', () => {
    it('clears the stored refresh token hash', async () => {
      await service.logout(user.id);
      expect(authRepository.setRefreshTokenHash).toHaveBeenCalledWith(user.id, null);
    });
  });
});
