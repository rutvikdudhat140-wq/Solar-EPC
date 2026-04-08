import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Request,
  Logger,
  Headers,
} from '@nestjs/common';
import { SurveysService } from '../services/surveys.service';
import { CreateSurveyDto, UpdateSurveyDto, QuerySurveyDto } from '../dto/survey.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('surveys')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SurveysController {
  private readonly logger = new Logger(SurveysController.name);

  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createSurveyDto: CreateSurveyDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id || req.user?._id;
    return this.surveysService.create(createSurveyDto, tenantId, userId);
  }

  @Get()
  findAll(@Query() query: QuerySurveyDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const user = req.user;
    return this.surveysService.findAll(query, tenantId, user);
  }

  @Get('stats')
  getStats(
    @Headers('x-tenant-id') headerTenantId: string,
    @Request() req: any
  ) {
    const tenantId = headerTenantId || req.tenant?.id || req.user?.tenantId || '';
    const user = req.user;
    console.log('[Surveys Stats] tenantId:', tenantId);
    return this.surveysService.getStats(tenantId, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const user = req.user;
    return this.surveysService.findOne(id, tenantId, user);
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
  update(@Param('id') id: string, @Body() updateSurveyDto: UpdateSurveyDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id || req.user?._id;
    return this.surveysService.update(id, updateSurveyDto, tenantId, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id || req.user?._id;
    return this.surveysService.remove(id, tenantId, userId);
  }

  @Patch(':id/assign')
  @HttpCode(HttpStatus.OK)
  assignSurvey(
    @Param('id') id: string,
    @Body('assignedTo') assignedTo: string,
    @Request() req: any
  ) {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id || req.user?._id;
    return this.surveysService.assignSurvey(id, assignedTo, tenantId, userId);
  }
}
