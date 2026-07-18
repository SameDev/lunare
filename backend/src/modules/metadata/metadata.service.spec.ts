import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MetadataService } from './metadata.service';
import { MetadataRepository } from './metadata.repository';
import { SettingsService } from '../settings/settings.service';

describe('MetadataService path safety', () => {
  let service: MetadataService;
  let libraryRoot: string;
  let insideFile: string;
  let outsideFile: string;

  beforeAll(async () => {
    const base = await mkdtemp(join(tmpdir(), 'musichub-test-'));
    libraryRoot = join(base, 'library');
    const outsideDir = join(base, 'outside');
    await mkdir(libraryRoot, { recursive: true });
    await mkdir(outsideDir, { recursive: true });

    insideFile = join(libraryRoot, 'song.mp3');
    outsideFile = join(outsideDir, 'secret.mp3');
    await writeFile(insideFile, 'not really audio, just needs to exist');
    await writeFile(outsideFile, 'not really audio, just needs to exist');
  });

  afterAll(async () => {
    await rm(join(libraryRoot, '..'), { recursive: true, force: true });
  });

  beforeEach(async () => {
    const settingsService = { getLibraryPath: jest.fn().mockResolvedValue(libraryRoot) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetadataService,
        { provide: MetadataRepository, useValue: {} },
        { provide: SettingsService, useValue: settingsService },
      ],
    }).compile();

    service = module.get(MetadataService);
  });

  it('rejects a direct escape outside the library root', async () => {
    await expect(service.writeTags({ filePath: outsideFile })).rejects.toThrow(BadRequestException);
  });

  it('rejects a ".." traversal that resolves outside the library root', async () => {
    const traversal = join(libraryRoot, '..', 'outside', 'secret.mp3');
    await expect(service.writeTags({ filePath: traversal })).rejects.toThrow(BadRequestException);
  });

  it('rejects a sibling directory whose name merely starts with the library path as a string', async () => {
    // e.g. libraryRoot = "/data/library" must not match "/data/library-evil/x"
    const lookalike = `${libraryRoot}-evil${join('/', 'x.mp3')}`;
    await expect(service.writeTags({ filePath: lookalike })).rejects.toThrow(BadRequestException);
  });

  it('rejects a path inside the library root that does not exist', async () => {
    await expect(service.writeTags({ filePath: join(libraryRoot, 'missing.mp3') })).rejects.toThrow(
      NotFoundException,
    );
  });
});
