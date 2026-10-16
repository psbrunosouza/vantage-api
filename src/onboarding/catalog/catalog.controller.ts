import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GENRE_CATALOG } from '../../world/worlds/genre-axes.js';
import { CatalogService } from './catalog.service.js';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('themes')
  themes() {
    return this.catalogService.themes();
  }

  @Get('genre-axes')
  genreAxes() {
    return GENRE_CATALOG;
  }
}
