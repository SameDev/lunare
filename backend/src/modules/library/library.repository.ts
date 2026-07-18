import { Injectable } from '@nestjs/common';
import { Album, Artist, Favorite, Prisma, Track } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchTracksQueryDto } from './dto/search-tracks-query.dto';

const trackWithRelations = Prisma.validator<Prisma.TrackDefaultArgs>()({
  include: { album: { include: { artist: true } } },
});
export type TrackWithRelations = Prisma.TrackGetPayload<typeof trackWithRelations>;

@Injectable()
export class LibraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTracks(
    query: SearchTracksQueryDto,
  ): Promise<{ items: TrackWithRelations[]; total: number }> {
    const where: Prisma.TrackWhereInput = {
      ...(query.genre && { genre: query.genre }),
      ...(query.albumId && { albumId: query.albumId }),
      ...(query.artistId && { album: { artistId: query.artistId } }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { album: { title: { contains: query.search, mode: 'insensitive' } } },
          { album: { artist: { name: { contains: query.search, mode: 'insensitive' } } } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.track.findMany({
        where,
        include: trackWithRelations.include,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ album: { artist: { name: 'asc' } } }, { trackNumber: 'asc' }],
      }),
      this.prisma.track.count({ where }),
    ]);

    return { items, total };
  }

  findTrackById(id: string): Promise<Track | null> {
    return this.prisma.track.findUnique({ where: { id } });
  }

  findArtists(search?: string): Promise<Artist[]> {
    return this.prisma.artist.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  findAlbums(artistId?: string): Promise<(Album & { artist: Artist })[]> {
    return this.prisma.album.findMany({
      where: artistId ? { artistId } : undefined,
      include: { artist: true },
      orderBy: { title: 'asc' },
    });
  }

  async findGenres(): Promise<string[]> {
    const rows = await this.prisma.track.findMany({
      where: { genre: { not: null } },
      select: { genre: true },
      distinct: ['genre'],
      orderBy: { genre: 'asc' },
    });
    return rows.map((row) => row.genre).filter((genre): genre is string => genre !== null);
  }

  addFavorite(userId: string, trackId: string): Promise<Favorite> {
    return this.prisma.favorite.upsert({
      where: { userId_trackId: { userId, trackId } },
      create: { userId, trackId },
      update: {},
    });
  }

  async removeFavorite(userId: string, trackId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({ where: { userId, trackId } });
  }

  findFavorites(userId: string): Promise<(Favorite & { track: TrackWithRelations })[]> {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: { track: { include: trackWithRelations.include } },
      orderBy: { createdAt: 'desc' },
    });
  }

  recordPlay(userId: string, trackId: string): Promise<{ id: string }> {
    return this.prisma.playHistory.create({ data: { userId, trackId }, select: { id: true } });
  }

  findHistory(userId: string, limit: number) {
    return this.prisma.playHistory.findMany({
      where: { userId },
      include: { track: { include: trackWithRelations.include } },
      orderBy: { playedAt: 'desc' },
      take: limit,
    });
  }

  async getCounts(): Promise<{ trackCount: number; artistCount: number; albumCount: number }> {
    const [trackCount, artistCount, albumCount] = await this.prisma.$transaction([
      this.prisma.track.count(),
      this.prisma.artist.count(),
      this.prisma.album.count(),
    ]);
    return { trackCount, artistCount, albumCount };
  }

  async upsertTrackFromFile(data: {
    artistName: string;
    albumTitle: string;
    albumYear?: number;
    coverPath?: string;
    title: string;
    trackNumber?: number;
    durationSeconds?: number;
    genre?: string;
    filePath: string;
  }): Promise<TrackWithRelations> {
    const artist = await this.prisma.artist.upsert({
      where: { name: data.artistName },
      create: { name: data.artistName },
      update: {},
    });

    const album = await this.prisma.album.upsert({
      where: { artistId_title: { artistId: artist.id, title: data.albumTitle } },
      create: {
        title: data.albumTitle,
        year: data.albumYear,
        coverPath: data.coverPath,
        artistId: artist.id,
      },
      update: data.coverPath ? { coverPath: data.coverPath } : {},
    });

    return this.prisma.track.upsert({
      where: { filePath: data.filePath },
      create: {
        title: data.title,
        trackNumber: data.trackNumber,
        durationSeconds: data.durationSeconds,
        genre: data.genre,
        filePath: data.filePath,
        albumId: album.id,
      },
      update: {
        title: data.title,
        trackNumber: data.trackNumber,
        durationSeconds: data.durationSeconds,
        genre: data.genre,
        albumId: album.id,
      },
      include: trackWithRelations.include,
    });
  }
}
