import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateDownloadDto } from './dto/create-download.dto';
import { ListDownloadsQueryDto } from './dto/list-downloads-query.dto';
import { DownloadsService } from './downloads.service';

@ApiTags('downloads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('downloads')
export class DownloadsController {
  constructor(private readonly downloadsService: DownloadsService) {}

  @Post()
  submit(@CurrentUser() user: JwtPayload, @Body() dto: CreateDownloadDto) {
    return this.downloadsService.submit(user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListDownloadsQueryDto) {
    return this.downloadsService.list(user.sub, query.page, query.limit);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.downloadsService.findOne(user.sub, id);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.downloadsService.cancel(user.sub, id);
  }
}
