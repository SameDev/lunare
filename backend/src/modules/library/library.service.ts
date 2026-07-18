import { Injectable, NotFoundException } from '@nestjs/common';
import { Artist, Album } from '@prisma/client';
import { LibraryRepository, TrackWithRelations } from './library.repository';
import { SearchTracksQueryDto } from './dto/search-tracks-query.dto';

@Injectable()
export class LibraryService {
  constructor(private readonly libraryRepository: LibraryRepository) {}

  searchTracks(query: SearchTracksQueryDto): Promise<{ items: TrackWithRelations[]; total: number }> {
    return this.libraryRepository.findTracks(query);
  }

  listArtists(search?: string): Promise<Artist[]> {
    return this.libraryRepository.findArtists(search);
  }

  listAlbums(artistId?: string): Promise<(Album & { artist: Artist })[]> {
    return this.libraryRepository.findAlbums(artistId);
  }

  listGenres(): Promise<string[]> {
    return this.libraryRepository.findGenres();
  }

  async favorite(userId: string, trackId: string): Promise<void> {
    await this.assertTrackExists(trackId);
    await this.libraryRepository.addFavorite(userId, trackId);
  }

  async unfavorite(userId: string, trackId: string): Promise<void> {
    await this.assertTrackExists(trackId);
    await this.libraryRepository.removeFavorite(userId, trackId);
  }

  listFavorites(userId: string) {
    return this.libraryRepository.findFavorites(userId);
  }

  async recordPlay(userId: string, trackId: string): Promise<void> {
    await this.assertTrackExists(trackId);
    await this.libraryRepository.recordPlay(userId, trackId);
  }

  listHistory(userId: string, limit: number) {
    return this.libraryRepository.findHistory(userId, limit);
  }

  getCounts(): Promise<{ trackCount: number; artistCount: number; albumCount: number }> {
    return this.libraryRepository.getCounts();
  }

  upsertTrackFromFile(data: {
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
    return this.libraryRepository.upsertTrackFromFile(data);
  }

  private async assertTrackExists(trackId: string): Promise<void> {
    const track = await this.libraryRepository.findTrackById(trackId);
    if (!track) {
      throw new NotFoundException('Track not found');
    }
  }
}
