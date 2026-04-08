import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReminderService } from '../services/reminder.service';
import { ReminderNotificationService } from '../services/reminder-notification.service';
import { Reminder } from '../schemas/reminder.schema';

@Injectable()
export class ReminderScheduler implements OnModuleInit {
  private readonly logger = new Logger(ReminderScheduler.name);
  private isProcessing = false;

  constructor(
    private readonly reminderService: ReminderService,
    private readonly notificationService: ReminderNotificationService,
  ) {}

  onModuleInit() {
    this.logger.log('Reminder Scheduler initialized');
  }

  /**
   * Run every minute to check for reminders to trigger
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processReminders() {
    if (this.isProcessing) {
      this.logger.debug('Previous job still running, skipping...');
      return;
    }

    this.isProcessing = true;
    this.logger.debug('Processing reminders...');

    try {
      // Step 1: Update overdue reminders
      const overdueCount = await this.reminderService.updateOverdueReminders();
      if (overdueCount > 0) {
        this.logger.log(`Marked ${overdueCount} reminders as overdue`);
      }

      // Step 2: Get pending reminders to trigger
      const remindersToTrigger = await this.reminderService.getPendingRemindersToTrigger();

      if (remindersToTrigger.length === 0) {
        this.logger.debug('No reminders to trigger');
        return;
      }

      this.logger.log(`Found ${remindersToTrigger.length} reminders to trigger`);

      // Step 3: Process each reminder
      for (const reminder of remindersToTrigger) {
        await this.triggerReminder(reminder);
      }

    } catch (error) {
      this.logger.error('Error processing reminders:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Trigger a single reminder
   */
  private async triggerReminder(reminder: Reminder) {
    try {
      this.logger.log(`Triggering reminder: ${reminder._id} - ${reminder.title}`);

      // Send notifications
      await this.notificationService.sendNotification(reminder);

      // Mark as triggered
      await this.reminderService.markTriggered(reminder._id.toString());

      // Handle recurring reminders
      if (reminder.recurringPattern) {
        await this.reminderService.handleRecurringReminder(reminder);
      }

    } catch (error) {
      this.logger.error(`Failed to trigger reminder ${reminder._id}:`, error);
    }
  }

  /**
   * Hourly cleanup job - remove old completed reminders
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldReminders() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Soft delete old completed/cancelled reminders
      // This would be implemented in the service
      this.logger.debug('Cleanup job completed');
    } catch (error) {
      this.logger.error('Error in cleanup job:', error);
    }
  }
}
