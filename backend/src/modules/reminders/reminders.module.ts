import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ReminderController } from './controllers/reminder.controller';
import { ReminderService } from './services/reminder.service';
import { ReminderScheduler } from './services/reminder-scheduler.service';
import { ReminderNotificationService } from './services/reminder-notification.service';
import { AutoReminderService } from './services/auto-reminder.service';
import { Reminder, ReminderSchema } from './schemas/reminder.schema';
import { NotificationLog, NotificationLogSchema } from './schemas/notification-log.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Reminder.name, schema: ReminderSchema },
      { name: NotificationLog.name, schema: NotificationLogSchema },
    ]),
  ],
  controllers: [ReminderController],
  providers: [
    ReminderService,
    ReminderScheduler,
    ReminderNotificationService,
    AutoReminderService,
  ],
  exports: [ReminderService, ReminderNotificationService, AutoReminderService],
})
export class RemindersModule {}
