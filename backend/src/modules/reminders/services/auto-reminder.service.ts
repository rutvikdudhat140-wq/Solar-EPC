import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reminder, ReminderDocument } from '../schemas/reminder.schema';

/**
 * Auto Reminder Service
 * Creates automatic reminders based on system events
 */
@Injectable()
export class AutoReminderService {
  private readonly logger = new Logger(AutoReminderService.name);

  constructor(
    @InjectModel(Reminder.name) private readonly reminderModel: Model<ReminderDocument>,
  ) {}

  // ==================== CRM REMINDERS ====================

  @OnEvent('lead.created')
  async onLeadCreated(payload: { leadId: string; tenantId: string; assignedTo?: string; createdBy: string }) {
    this.logger.log(`Lead created event: ${payload.leadId}`);
    
    // Auto reminder: Follow up in 2 days
    if (payload.assignedTo) {
      await this.createReminder({
        tenantId: payload.tenantId,
        title: 'Follow up with new lead',
        description: 'Contact the lead to discuss requirements',
        module: 'crm',
        referenceId: payload.leadId,
        type: 'system',
        priority: 'high',
        assignedTo: payload.assignedTo,
        createdBy: payload.createdBy,
        triggerType: 'relative',
        relativeTo: 'createdAt',
        offsetValue: 2,
        offsetUnit: 'days',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        notificationChannels: ['in-app', 'email'],
      });
    }
  }

  @OnEvent('lead.inactive')
  async onLeadInactive(payload: { leadId: string; tenantId: string; assignedTo: string; daysInactive: number }) {
    this.logger.log(`Lead inactive event: ${payload.leadId} - ${payload.daysInactive} days`);
    
    await this.createReminder({
      tenantId: payload.tenantId,
      title: `Lead inactive for ${payload.daysInactive} days`,
      description: 'Re-engage with the lead to check status',
      module: 'crm',
      referenceId: payload.leadId,
      type: 'smart',
      priority: 'medium',
      assignedTo: payload.assignedTo,
      createdBy: 'system',
      triggerType: 'date',
      triggerDate: new Date(),
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      notificationChannels: ['in-app'],
    });
  }

  // ==================== HRM REMINDERS ====================

  @OnEvent('leave.requested')
  async onLeaveRequested(payload: { leaveId: string; tenantId: string; employeeId: string; managerId: string }) {
    this.logger.log(`Leave requested event: ${payload.leaveId}`);
    
    await this.createReminder({
      tenantId: payload.tenantId,
      title: 'Leave approval pending',
      description: 'Review and approve/reject leave request',
      module: 'hrm',
      referenceId: payload.leaveId,
      type: 'system',
      priority: 'high',
      assignedTo: payload.managerId,
      createdBy: 'system',
      triggerType: 'date',
      triggerDate: new Date(),
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      notificationChannels: ['in-app', 'email'],
    });
  }

  @OnEvent('attendance.missing')
  async onAttendanceMissing(payload: { employeeId: string; tenantId: string; date: string; hrManagerId: string }) {
    this.logger.log(`Attendance missing event: ${payload.employeeId} on ${payload.date}`);
    
    await this.createReminder({
      tenantId: payload.tenantId,
      title: 'Missing attendance record',
      description: `Attendance not marked for ${payload.date}`,
      module: 'hrm',
      referenceId: payload.employeeId,
      type: 'system',
      priority: 'medium',
      assignedTo: payload.hrManagerId,
      createdBy: 'system',
      triggerType: 'date',
      triggerDate: new Date(),
      dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
      notificationChannels: ['in-app'],
    });
  }

  // ==================== FINANCE REMINDERS ====================

  @OnEvent('invoice.overdue')
  async onInvoiceOverdue(payload: { invoiceId: string; tenantId: string; customerEmail: string; financeUserId: string }) {
    this.logger.log(`Invoice overdue event: ${payload.invoiceId}`);
    
    await this.createReminder({
      tenantId: payload.tenantId,
      title: 'Invoice payment overdue',
      description: 'Follow up with customer for payment',
      module: 'finance',
      referenceId: payload.invoiceId,
      type: 'system',
      priority: 'critical',
      assignedTo: payload.financeUserId,
      createdBy: 'system',
      triggerType: 'date',
      triggerDate: new Date(),
      dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
      notificationChannels: ['in-app', 'email'],
    });
  }

  @OnEvent('payment.received')
  async onPaymentReceived(payload: { invoiceId: string; tenantId: string; amount: number; financeUserId: string }) {
    this.logger.log(`Payment received event: ${payload.invoiceId}`);
    
    await this.createReminder({
      tenantId: payload.tenantId,
      title: 'Verify payment and update records',
      description: `Payment of ${payload.amount} received. Update invoice status.`,
      module: 'finance',
      referenceId: payload.invoiceId,
      type: 'system',
      priority: 'medium',
      assignedTo: payload.financeUserId,
      createdBy: 'system',
      triggerType: 'date',
      triggerDate: new Date(),
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      notificationChannels: ['in-app'],
    });
  }

  // ==================== INVENTORY REMINDERS ====================

  @OnEvent('inventory.low')
  async onInventoryLow(payload: { itemId: string; tenantId: string; itemName: string; currentStock: number; minStock: number; storeManagerId: string }) {
    this.logger.log(`Inventory low event: ${payload.itemId} - ${payload.currentStock}/${payload.minStock}`);
    
    await this.createReminder({
      tenantId: payload.tenantId,
      title: `Low stock alert: ${payload.itemName}`,
      description: `Current stock: ${payload.currentStock}, Minimum: ${payload.minStock}. Reorder required.`,
      module: 'inventory',
      referenceId: payload.itemId,
      type: 'smart',
      priority: 'high',
      assignedTo: payload.storeManagerId,
      createdBy: 'system',
      triggerType: 'date',
      triggerDate: new Date(),
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      notificationChannels: ['in-app', 'email'],
    });
  }

  // ==================== PROJECT REMINDERS ====================

  @OnEvent('project.deadline.approaching')
  async onProjectDeadlineApproaching(payload: { projectId: string; tenantId: string; daysRemaining: number; projectManagerId: string }) {
    this.logger.log(`Project deadline approaching: ${payload.projectId} - ${payload.daysRemaining} days`);
    
    await this.createReminder({
      tenantId: payload.tenantId,
      title: `Project deadline in ${payload.daysRemaining} days`,
      description: 'Review project status and ensure completion on time',
      module: 'project',
      referenceId: payload.projectId,
      type: 'system',
      priority: payload.daysRemaining <= 3 ? 'critical' : 'high',
      assignedTo: payload.projectManagerId,
      createdBy: 'system',
      triggerType: 'date',
      triggerDate: new Date(),
      dueDate: new Date(Date.now() + payload.daysRemaining * 24 * 60 * 60 * 1000),
      notificationChannels: ['in-app', 'email'],
    });
  }

  // ==================== SERVICE REMINDERS ====================

  @OnEvent('service.due')
  async onServiceDue(payload: { serviceId: string; tenantId: string; customerId: string; dueDate: string; serviceManagerId: string }) {
    this.logger.log(`Service due event: ${payload.serviceId}`);
    
    await this.createReminder({
      tenantId: payload.tenantId,
      title: 'Scheduled service due',
      description: `Service scheduled for ${payload.dueDate}`,
      module: 'service',
      referenceId: payload.serviceId,
      type: 'system',
      priority: 'high',
      assignedTo: payload.serviceManagerId,
      createdBy: 'system',
      triggerType: 'date',
      triggerDate: new Date(),
      dueDate: new Date(payload.dueDate),
      notificationChannels: ['in-app', 'email'],
    });
  }

  // ==================== HELPER METHOD ====================

  private async createReminder(data: any): Promise<Reminder> {
    const reminder = new this.reminderModel({
      ...data,
      isCustom: false,
      isTriggered: false,
      triggerCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await reminder.save();
    this.logger.log(`Auto reminder created: ${saved._id} - ${saved.title}`);
    return saved;
  }
}
