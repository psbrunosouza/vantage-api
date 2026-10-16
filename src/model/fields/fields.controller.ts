import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FieldsService } from './fields.service.js';

@ApiTags('fields')
@Controller('fields')
export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  @Get()
  findAll() {
    return this.fieldsService.findAll();
  }
}
