import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma, User, UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'admin@example.com',
    passwordHash: '',
    role: UserRole.ADMIN,
    refreshTokenHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const uniqueConstraintError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
  code: 'P2002',
  clientVersion: '5.22.0',
});

describe('UsersService', () => {
  let service: UsersService;
  let repo: {
    findById: jest.Mock;
    findByEmail: jest.Mock;
    findAll: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
    countByRole: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      countByRole: jest.fn(),
    };

    const config = { getOrThrow: (key: string) => ({ ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'InitialPass123!' })[key] };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repo },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('onApplicationBootstrap', () => {
    it('seeds an admin user when none exist', async () => {
      repo.count.mockResolvedValue(0);
      repo.create.mockResolvedValue(makeUser());

      await service.onApplicationBootstrap();

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'admin@example.com', role: UserRole.ADMIN }),
      );
    });

    it('does nothing when users already exist', async () => {
      repo.count.mockResolvedValue(1);

      await service.onApplicationBootstrap();

      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('requires currentPassword when setting a new password', async () => {
      repo.findById.mockResolvedValue(makeUser());

      await expect(service.updateProfile('user-1', { newPassword: 'NewPass123!' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects an incorrect currentPassword', async () => {
      const passwordHash = await argon2.hash('RealPassword123!');
      repo.findById.mockResolvedValue(makeUser({ passwordHash }));

      await expect(
        service.updateProfile('user-1', { currentPassword: 'wrong', newPassword: 'NewPass123!' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('updates the password when currentPassword is correct', async () => {
      const passwordHash = await argon2.hash('RealPassword123!');
      repo.findById.mockResolvedValue(makeUser({ passwordHash }));
      repo.update.mockResolvedValue(makeUser());

      await service.updateProfile('user-1', { currentPassword: 'RealPassword123!', newPassword: 'NewPass123!' });

      expect(repo.update).toHaveBeenCalledWith('user-1', { passwordHash: expect.any(String) });
    });

    it('surfaces a duplicate email as a 409, not a raw DB error', async () => {
      repo.findById.mockResolvedValue(makeUser());
      repo.update.mockRejectedValue(uniqueConstraintError);

      await expect(service.updateProfile('user-1', { email: 'taken@example.com' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException for a missing user', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.updateProfile('ghost', { email: 'x@example.com' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createUser', () => {
    it('surfaces a duplicate email as a 409', async () => {
      repo.create.mockRejectedValue(uniqueConstraintError);

      await expect(service.createUser({ email: 'dup@example.com', password: 'Password123!' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('defaults role to USER when not specified', async () => {
      repo.create.mockResolvedValue(makeUser({ role: UserRole.USER }));

      await service.createUser({ email: 'new@example.com', password: 'Password123!' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com', role: UserRole.USER }),
      );
    });
  });

  describe('deleteUser', () => {
    it('blocks deleting your own account', async () => {
      await expect(service.deleteUser('user-1', 'user-1')).rejects.toThrow(BadRequestException);
      expect(repo.findById).not.toHaveBeenCalled();
    });

    it('blocks deleting the last remaining admin', async () => {
      repo.findById.mockResolvedValue(makeUser({ id: 'admin-2', role: UserRole.ADMIN }));
      repo.countByRole.mockResolvedValue(1);

      await expect(service.deleteUser('user-1', 'admin-2')).rejects.toThrow(ForbiddenException);
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('allows deleting an admin when another admin remains', async () => {
      repo.findById.mockResolvedValue(makeUser({ id: 'admin-2', role: UserRole.ADMIN }));
      repo.countByRole.mockResolvedValue(2);

      await service.deleteUser('user-1', 'admin-2');

      expect(repo.delete).toHaveBeenCalledWith('admin-2');
    });

    it('allows deleting a non-admin user without checking admin count', async () => {
      repo.findById.mockResolvedValue(makeUser({ id: 'user-2', role: UserRole.USER }));

      await service.deleteUser('user-1', 'user-2');

      expect(repo.countByRole).not.toHaveBeenCalled();
      expect(repo.delete).toHaveBeenCalledWith('user-2');
    });

    it('throws NotFoundException for a missing target', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.deleteUser('user-1', 'ghost')).rejects.toThrow(NotFoundException);
    });
  });
});
