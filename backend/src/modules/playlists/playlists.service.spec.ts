import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PlaylistsService } from './playlists.service';
import { PlaylistsRepository, PlaylistWithTracks } from './playlists.repository';

const fkViolation = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
  code: 'P2003',
  clientVersion: '5.22.0',
});

function makePlaylist(trackIds: string[]): PlaylistWithTracks {
  return {
    id: 'playlist-1',
    userId: 'user-1',
    name: 'My Playlist',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tracks: trackIds.map((trackId, position) => ({
      id: `pt-${trackId}`,
      playlistId: 'playlist-1',
      trackId,
      position,
      addedAt: new Date(),
      track: {} as never,
    })),
  };
}

describe('PlaylistsService', () => {
  let service: PlaylistsService;
  let repo: {
    findById: jest.Mock;
    addTrack: jest.Mock;
    reorder: jest.Mock;
  };

  beforeEach(async () => {
    repo = { findById: jest.fn(), addTrack: jest.fn(), reorder: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlaylistsService, { provide: PlaylistsRepository, useValue: repo }],
    }).compile();

    service = module.get(PlaylistsService);
  });

  describe('findOne / ownership', () => {
    it('throws NotFoundException when the playlist does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findOne('user-1', 'ghost')).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException for another user's playlist", async () => {
      repo.findById.mockResolvedValue(makePlaylist([]));
      await expect(service.findOne('someone-else', 'playlist-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addTrack', () => {
    it('surfaces a foreign-key violation as 404, not a raw DB error', async () => {
      repo.findById.mockResolvedValue(makePlaylist([]));
      repo.addTrack.mockRejectedValue(fkViolation);

      await expect(service.addTrack('user-1', 'playlist-1', 'nonexistent-track')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reorder', () => {
    it('accepts an exact permutation of the current tracks', async () => {
      repo.findById.mockResolvedValue(makePlaylist(['t1', 't2', 't3']));

      await service.reorder('user-1', 'playlist-1', ['t3', 't1', 't2']);

      expect(repo.reorder).toHaveBeenCalledWith('playlist-1', ['t3', 't1', 't2']);
    });

    it('rejects a reorder that drops a track', async () => {
      repo.findById.mockResolvedValue(makePlaylist(['t1', 't2', 't3']));

      await expect(service.reorder('user-1', 'playlist-1', ['t1', 't2'])).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.reorder).not.toHaveBeenCalled();
    });

    it('rejects a reorder that introduces a track not in the playlist', async () => {
      repo.findById.mockResolvedValue(makePlaylist(['t1', 't2']));

      await expect(service.reorder('user-1', 'playlist-1', ['t1', 't2', 't99'])).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.reorder).not.toHaveBeenCalled();
    });

    it('rejects a reorder with a duplicated track id', async () => {
      repo.findById.mockResolvedValue(makePlaylist(['t1', 't2']));

      await expect(service.reorder('user-1', 'playlist-1', ['t1', 't1'])).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
