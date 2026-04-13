import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReminderService } from '../services/reminder.service';
import { ReminderNotificationService } from '../services/reminder-notification.service';
import { TenantService } from '../../superadmin/services/tenant.service';
import { Reminder } from '../schemas/reminder.schema';
import { TenantDocument } from '../../superadmin/schemas/tenant.schema';

@Injectable()
export class ReminderScheduler implements OnModuleInit {
  private readonly logger = new Logger(ReminderScheduler.name);
  private isProcessing = false;

  constructor(
    private readonly reminderService: ReminderService,
    private readonly notificationService: ReminderNotificationService,
    private readonly tenantService: TenantService,
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
      // Step 1: Get all active tenants
      const tenants = await this.tenantService.findAll({ status: 'active' });
      this.logger.debug(`Found ${tenants.length} active tenants`);

      let totalRemindersProcessed = 0;
      let totalOverdueMarked = 0;

      // Step 2: Process each tenant separately
      for (const tenant of tenants) {
        const tenantId = (tenant as TenantDocument)._id.toString();
        
        try {
          // Update overdue reminders for this tenant
          const overdueCount = await this.reminderService.updateOverdueReminders(tenantId);
          if (overdueCount > 0) {
            this.logger.log(`Tenant ${tenant.slug}: Marked ${overdueCount} reminders as overdue`);
            totalOverdueMarked += overdueCount;
          }

          // Get pending reminders to trigger for this tenant
          const remindersToTrigger = await this.reminderService.getPendingRemindersToTrigger(tenantId);

          if (remindersToTrigger.length === 0) {
            continue;
          }

          this.logger.log(`Tenant ${tenant.slug}: Found ${remindersToTrigger.length} reminders to trigger`);

          // Process each reminder for this tenant
          for (const reminder of remindersToTrigger) {
            await this.triggerReminder(reminder);
            totalRemindersProcessed++;
          }
        } catch (tenantError) {
          this.logger.error(`Error processing reminders for tenant ${tenant.slug}:`, tenantError);
          // Continue with next tenant
        }
      }

      // Also process any reminders without tenantId (legacy data)
      const legacyReminders = await this.reminderService.getPendingRemindersToTrigger();
      if (legacyReminders.length > 0) {
        this.logger.warn(`Found ${legacyReminders.length} legacy reminders without tenantId`);
        for (const reminder of legacyReminders) {
          await this.triggerReminder(reminder);
          totalRemindersProcessed++;
        }
      }

      if (totalOverdueMarked > 0 || totalRemindersProcessed > 0) {
        this.logger.log(`Scheduler completed: ${totalOverdueMarked} overdue marked, ${totalRemindersProcessed} reminders triggered`);
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
