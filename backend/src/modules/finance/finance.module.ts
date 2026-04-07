import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsModule } from '../settings/settings.module';
import { QuotationModule } from '../quotation/quotation.module';
import { FinanceController } from './controllers/finance.controller';
import { FinanceVendorController } from './controllers/finance-vendor.controller';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';

import { InvoiceService, PaymentService, ExpenseService, TransactionService, FinancePaymentService, ManualAdjustmentService, AdjustmentCategoryService, JournalEntryService, FinanceVendorService } from './services';

import { Invoice, InvoiceSchema, Payment, PaymentSchema, Expense, ExpenseSchema, Transaction, TransactionSchema, Project, ProjectSchema, ReminderLog, ReminderLogSchema, Activity, ActivitySchema, FinancePayment, FinancePaymentSchema, ManualAdjustment, ManualAdjustmentSchema, AdjustmentCategory, AdjustmentCategorySchema, JournalEntry, JournalEntrySchema, FinanceVendor, FinanceVendorSchema, FinancePurchaseOrder, FinancePurchaseOrderSchema } from './schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: FinancePayment.name, schema: FinancePaymentSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: ReminderLog.name, schema: ReminderLogSchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: ManualAdjustment.name, schema: ManualAdjustmentSchema },
      { name: AdjustmentCategory.name, schema: AdjustmentCategorySchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: FinanceVendor.name, schema: FinanceVendorSchema },
      { name: FinancePurchaseOrder.name, schema: FinancePurchaseOrderSchema },
      { name: 'PurchaseOrder', schema: require('../procurement/schemas/purchase-order.schema').PurchaseOrderSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: 'Quotation', schema: require('../quotation/schemas/quotation.schema').QuotationSchema },
    ]),
    SettingsModule,
    QuotationModule,
  ],
  controllers: [FinanceController, FinanceVendorController],

  providers: [InvoiceService, PaymentService, FinancePaymentService, ExpenseService, TransactionService, ManualAdjustmentService, AdjustmentCategoryService, JournalEntryService, FinanceVendorService],

  exports: [InvoiceService, PaymentService, FinancePaymentService, ExpenseService, TransactionService, ManualAdjustmentService, AdjustmentCategoryService, JournalEntryService, FinanceVendorService],

})
export class FinanceModule {}
