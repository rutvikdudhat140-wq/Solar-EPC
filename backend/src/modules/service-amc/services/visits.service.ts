import { Injectable, NotFoundException } from '@nestjs/common';



import { InjectModel } from '@nestjs/mongoose';



import { Model, Types } from 'mongoose';



import { Visit, VisitDocument } from '../schemas/visit.schema';



import { CreateVisitDto, UpdateVisitDto, QueryVisitDto } from '../dto/visit.dto';
import { UserWithVisibility } from '../../../common/utils/visibility-filter';
import { EmailService } from '../../email/email.service';







@Injectable()



export class VisitsService {



  constructor(



    @InjectModel(Visit.name) private visitModel: Model<VisitDocument>,



    private readonly emailService: EmailService,



  ) {}







  async create(createVisitDto: CreateVisitDto, tenantId?: string): Promise<Visit> {



    const visitId = `V${Date.now().toString().slice(-5)}`;



    



    // Ensure all required fields have values - using snake_case from DTO



    const visitData: any = {



      contractId: createVisitDto.contract_id || 'N/A',



      customer: createVisitDto.customer || 'Unknown',



      site: createVisitDto.site || 'Unknown',



      systemSize: createVisitDto.system_size ? Number(createVisitDto.system_size) : 0,



      visitType: createVisitDto.visit_type || 'Routine Maintenance',



      scheduledDate: createVisitDto.scheduled_date || new Date().toISOString().split('T')[0],



      scheduledTime: createVisitDto.scheduled_time || '09:00',



      engineerId: createVisitDto.engineer_id || 'N/A',



      engineerName: createVisitDto.engineer_name || 'Unassigned',



      priority: createVisitDto.priority || 'Low',



      notes: createVisitDto.notes || '',



      status: createVisitDto.status || 'Scheduled',



      visitId,



    };



    



    if (tenantId) {



      // Handle both string tenant IDs (like 'solarcorp') and ObjectId



      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {



        visitData.tenantId = new Types.ObjectId(tenantId);



      } else {



        visitData.tenantId = tenantId; // Store as string for named tenants



      }



    }



    



    console.log('Creating visit with data:', visitData);



    const createdVisit = new this.visitModel(visitData);



    const savedVisit = await createdVisit.save();



    



    // Send email notification if email is provided



    if (createVisitDto.email) {



      await this.sendVisitScheduledEmail(savedVisit, createVisitDto.email);



    }



    



    return savedVisit;



  }







  private async sendVisitScheduledEmail(visit: any, toEmail: string): Promise<void> {



    try {



      const subject = `Visit Scheduled - ${visit.visitId}`;



      const text = `



Dear ${visit.customer},







Your maintenance visit has been scheduled successfully.







Visit Details:



- Visit ID: ${visit.visitId}



- Contract ID: ${visit.contractId}



- Visit Type: ${visit.visitType}



- Scheduled Date: ${visit.scheduledDate}



- Scheduled Time: ${visit.scheduledTime}



- Engineer: ${visit.engineerName}



- Site: ${visit.site}



- Priority: ${visit.priority}







${visit.notes ? `Notes: ${visit.notes}` : ''}







Please ensure someone is available at the site during the scheduled time.







Best regards,



Solar EPC Team



      `.trim();



      



      const html = `



<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">



  <h2 style="color: #f97316;">Visit Scheduled Successfully</h2>



  <p>Dear <strong>${visit.customer}</strong>,</p>



  <p>Your maintenance visit has been scheduled successfully.</p>



  



  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">



    <h3 style="margin-top: 0; color: #374151;">Visit Details</h3>



    <table style="width: 100%; border-collapse: collapse;">



      <tr><td style="padding: 8px 0; color: #6b7280;">Visit ID:</td><td style="padding: 8px 0; font-weight: bold;">${visit.visitId}</td></tr>



      <tr><td style="padding: 8px 0; color: #6b7280;">Contract ID:</td><td style="padding: 8px 0; font-weight: bold;">${visit.contractId}</td></tr>



      <tr><td style="padding: 8px 0; color: #6b7280;">Visit Type:</td><td style="padding: 8px 0; font-weight: bold;">${visit.visitType}</td></tr>



      <tr><td style="padding: 8px 0; color: #6b7280;">Scheduled Date:</td><td style="padding: 8px 0; font-weight: bold;">${visit.scheduledDate}</td></tr>



      <tr><td style="padding: 8px 0; color: #6b7280;">Scheduled Time:</td><td style="padding: 8px 0; font-weight: bold;">${visit.scheduledTime}</td></tr>



      <tr><td style="padding: 8px 0; color: #6b7280;">Engineer:</td><td style="padding: 8px 0; font-weight: bold;">${visit.engineerName}</td></tr>



      <tr><td style="padding: 8px 0; color: #6b7280;">Site:</td><td style="padding: 8px 0; font-weight: bold;">${visit.site}</td></tr>



      <tr><td style="padding: 8px 0; color: #6b7280;">Priority:</td><td style="padding: 8px 0; font-weight: bold;">${visit.priority}</td></tr>



    </table>



    ${visit.notes ? `<p style="margin-top: 15px;"><strong>Notes:</strong> ${visit.notes}</p>` : ''}



  </div>



  



  <p style="background: #fef3c7; padding: 10px; border-radius: 5px; border-left: 4px solid #f59e0b;">



    Please ensure someone is available at the site during the scheduled time.



  </p>



  



  <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">



    Best regards,<br>



    <strong>Solar EPC Team</strong>



  </p>



</div>



      `;



      



      const result = await this.emailService.sendEmail(toEmail, subject, text, html);



      if (result.success) {



        console.log(`Visit scheduled email sent to ${toEmail}, messageId: ${result.messageId}`);



      } else {



        console.error(`Failed to send visit scheduled email: ${result.message}`);



      }



    } catch (error) {



      console.error('Error sending visit scheduled email:', error);



    }



  }







  async findAll(query: QueryVisitDto, tenantId?: string, user?: UserWithVisibility): Promise<{ data: Visit[]; total: number }> {
    const { page = 1, limit = 25, contract_id, status, engineer_id, search } = query;
    const filter: any = { isDeleted: { $ne: true } };



    if (tenantId) {



      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {



        filter.tenantId = new Types.ObjectId(tenantId);



      } else {



        filter.tenantId = tenantId;



      }



    }



    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      const userEmail = (user as any).email || '';
      const firstName = (user as any).firstName || '';
      const lastName = (user as any).lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();

      const visibilityOr: any[] = [];

      // Match by engineerId (employee ID or auth User ID)
      if (userId) {
        visibilityOr.push({ engineerId: String(userId) });
      }

      // Match by engineerName (name matching)
      if (fullName) {
        visibilityOr.push({ engineerName: { $regex: fullName, $options: 'i' } });
      }
      if (firstName && firstName !== fullName) {
        visibilityOr.push({ engineerName: { $regex: firstName, $options: 'i' } });
      }

      if (visibilityOr.length > 0) {
        filter.$and = [...(filter.$and || []), { $or: visibilityOr }];
        console.log(`[VISITS VISIBILITY] Applied ASSIGNED visibility for user: ${fullName || userId}`);
      }
    }

    if (contract_id) filter.contractId = contract_id;



    if (status) filter.status = status;



    if (engineer_id) filter.engineerId = engineer_id;



    if (search) {



      filter.$or = [



        { visitId: { $regex: search, $options: 'i' } },



        { customer: { $regex: search, $options: 'i' } },



        { site: { $regex: search, $options: 'i' } },



      ];



    }



    const skip = (page - 1) * limit;



    const [data, total] = await Promise.all([



      this.visitModel.find(filter).sort({ scheduledDate: 1, scheduledTime: 1 }).skip(skip).limit(limit).lean().exec(),



      this.visitModel.countDocuments(filter),



    ]);



    return { data: data as unknown as Visit[], total };



  }







  async findOne(id: string, tenantId?: string): Promise<Visit> {



    const filter: any = {



      $or: [{ _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined }, { visitId: id }].filter(Boolean),



      isDeleted: { $ne: true }



    };



    if (tenantId) {



      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {



        filter.tenantId = new Types.ObjectId(tenantId);



      } else {



        filter.tenantId = tenantId;



      }



    }



    const visit = await this.visitModel.findOne(filter).lean().exec();



    if (!visit) throw new NotFoundException('Visit not found');



    return { ...visit, id: visit.visitId } as unknown as Visit;



  }







  async update(id: string, updateVisitDto: UpdateVisitDto, tenantId?: string): Promise<Visit> {



    const filter: any = {



      $or: [{ _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined }, { visitId: id }].filter(Boolean),



      isDeleted: { $ne: true }



    };



    if (tenantId) {



      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {



        filter.tenantId = new Types.ObjectId(tenantId);



      } else {



        filter.tenantId = tenantId;



      }



    }



    const existingVisit = await this.visitModel.findOne(filter).exec();



    if (!existingVisit) throw new NotFoundException('Visit not found');



    Object.assign(existingVisit, updateVisitDto);



    const saved = await existingVisit.save();



    return { ...saved.toObject(), id: saved.visitId } as unknown as Visit;



  }







  async remove(id: string, tenantId?: string): Promise<void> {



    const filter: any = {



      $or: [{ _id: Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined }, { visitId: id }].filter(Boolean),



    };



    if (tenantId) {



      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {



        filter.tenantId = new Types.ObjectId(tenantId);



      } else {



        filter.tenantId = tenantId;



      }



    }



    const result = await this.visitModel.deleteOne(filter).exec();



    if (result.deletedCount === 0) throw new NotFoundException('Visit not found');



  }







  async getStats(tenantId?: string, user?: UserWithVisibility): Promise<any> {
    console.log('DEBUG - Visits getStats called, tenantId:', tenantId);
    const filter: any = { isDeleted: { $ne: true } };



    if (tenantId) {

      if (Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {

        filter.tenantId = new Types.ObjectId(tenantId);

      } else {

        filter.tenantId = tenantId;

      }

    }



    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      const firstName = (user as any).firstName || '';
      const lastName = (user as any).lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();

      const visibilityOr: any[] = [];

      if (userId) {
        visibilityOr.push({ engineerId: String(userId) });
      }
      if (fullName) {
        visibilityOr.push({ engineerName: { $regex: fullName, $options: 'i' } });
      }
      if (firstName && firstName !== fullName) {
        visibilityOr.push({ engineerName: { $regex: firstName, $options: 'i' } });
      }

      if (visibilityOr.length > 0) {
        filter.$and = [...(filter.$and || []), { $or: visibilityOr }];
        console.log(`[VISITS STATS VISIBILITY] Applied ASSIGNED visibility for user: ${fullName || userId}`);
      }
    }

    const [totalVisits, scheduled, completed, cancelled] = await Promise.all([

      this.visitModel.countDocuments(filter),

      this.visitModel.countDocuments({ ...filter, status: 'Scheduled' }),

      this.visitModel.countDocuments({ ...filter, status: 'Completed' }),

      this.visitModel.countDocuments({ ...filter, status: 'Cancelled' }),

    ]);



    const result = { totalVisits, scheduled, completed, cancelled };

    console.log('DEBUG - Visits getStats result:', result);

    return result;

  }



}

