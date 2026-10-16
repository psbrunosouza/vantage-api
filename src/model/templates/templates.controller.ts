import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TemplatesService } from './templates.service.js';

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }
}
