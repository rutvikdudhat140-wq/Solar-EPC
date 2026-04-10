import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reminder } from '../schemas/reminder.schema';
import { NotificationLog, NotificationLogDocument } from '../schemas/notification-log.schema';
import { ReminderGateway } from '../gateways/reminder.gateway';

@Injectable()
export class ReminderNotificationService {
  private readonly logger = new Logger(ReminderNotificationService.name);

  constructor(
    @InjectModel(NotificationLog.name) private readonly notificationLogModel: Model<NotificationLogDocument>,
    @Inject(forwardRef(() => ReminderGateway))
    private readonly reminderGateway: ReminderGateway,
  ) {}

  /**
   * Send notification through all configured channels
   */
  async sendNotification(reminder: Reminder): Promise<void> {
    const channels = reminder.notificationChannels || ['in-app'];
    const results: any[] = [];

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'in-app':
            await this.sendInAppNotification(reminder);
            results.push({ channel: 'in-app', success: true });
            break;
          case 'email':
            await this.sendEmailNotification(reminder);
            results.push({ channel: 'email', success: true });
            break;
          case 'sms':
            await this.sendSMSNotification(reminder);
            results.push({ channel: 'sms', success: true });
            break;
          default:
            this.logger.warn(`Unknown channel: ${channel}`);
        }
      } catch (error: any) {
        this.logger.error(`Failed to send ${channel} notification for reminder ${reminder._id}:`, error);
        results.push({ channel, success: false, error: (error as Error).message });
      }
    }

    // Log all notification attempts
    await this.logNotification(reminder, results);
  }

  /**
   * In-app notification (real-time via WebSocket or stored for polling)
   */
  private async sendInAppNotification(reminder: Reminder): Promise<void> {
    const userId = reminder.assignedTo.toString();
    this.logger.log(`[IN-APP] Reminder: ${reminder.title} for user ${userId}`);

    // Emit real-time WebSocket event to user's room
    if (this.reminderGateway) {
      this.reminderGateway.notifyReminderTriggered(userId, {
        id: reminder._id,
        title: reminder.title,
        description: reminder.description,
        priority: reminder.priority,
        dueDate: reminder.dueDate,
        module: reminder.module,
        type: reminder.type,
      });
      this.logger.log(`[WEBSOCKET] Sent real-time notification to user ${userId}`);
    }

    // Also broadcast to tenant for admin/manager visibility
    if (reminder.tenantId) {
      const tenantId = reminder.tenantId.toString();
      this.reminderGateway?.broadcastToTenant(tenantId, 'reminder-triggered', {
        id: reminder._id,
        title: reminder.title,
        assignedTo: userId,
        priority: reminder.priority,
        dueDate: reminder.dueDate,
        module: reminder.module,
      });
    }

    return Promise.resolve();
  }

  /**
   * Email notification
   */
  private async sendEmailNotification(reminder: Reminder): Promise<void> {
    this.logger.log(`[EMAIL] Reminder: ${reminder.title} to user ${reminder.assignedTo}`);
    
    // TODO: Integrate with existing email service
    // This would use the existing SMTP configuration
    
    const emailContent = {
      subject: `Reminder: ${reminder.title}`,
      body: `
        <h2>${reminder.title}</h2>
        <p>${reminder.description || ''}</p>
        <p><strong>Due:</strong> ${reminder.dueDate}</p>
        <p><strong>Priority:</strong> ${reminder.priority}</p>
      `,
    };

    // Placeholder for email service integration
    this.logger.debug(`Email content prepared: ${emailContent.subject}`);
    return Promise.resolve();
  }

  /**
   * SMS notification
   */
  private async sendSMSNotification(reminder: Reminder): Promise<void> {
    this.logger.log(`[SMS] Reminder: ${reminder.title} to user ${reminder.assignedTo}`);
    
    // TODO: Integrate with SMS provider (Twilio, etc.)
    
    const smsContent = `Reminder: ${reminder.title}. Due: ${new Date(reminder.dueDate).toLocaleDateString()}`;
    
    this.logger.debug(`SMS content prepared: ${smsContent}`);
    return Promise.resolve();
  }

  /**
   * Log notification attempts
   */
  private async logNotification(reminder: Reminder, results: any[]): Promise<void> {
    const log = new this.notificationLogModel({
      reminderId: reminder._id,
      tenantId: reminder.tenantId,
      userId: reminder.assignedTo,
      channels: results,
      sentAt: new Date(),
    });

    await log.save();
  }

  /**
   * Get notification logs for a reminder
   */
  async getNotificationLogs(reminderId: string): Promise<any[]> {
    return this.notificationLogModel
      .find({ reminderId })
      .sort({ sentAt: -1 })
      .lean();
  }
}
