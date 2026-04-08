import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { LeadStatus, LeadStatusSchema } from '../settings/schemas/lead-status.schema';
import { User, UserSchema } from '../../core/auth/schemas/user.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { LeadsService } from './services/leads.service';
import { ExportQueueService } from './services/export-queue.service';
import { ExportWorker } from './workers/export-worker';
import { LeadsController } from './controllers/leads.controller';
import { SettingsModule } from '../settings/settings.module';
import { SurveyModule } from '../survey/survey.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: LeadStatus.name, schema: LeadStatusSchema },
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    SettingsModule,
    forwardRef(() => SurveyModule),
    CustomersModule,
  ],
  controllers: [LeadsController],
  providers: [LeadsService, ExportQueueService, ExportWorker],
  exports: [MongooseModule, LeadsService, ExportQueueService]
})
export class LeadsModule {}
