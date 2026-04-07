import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../common/services/redis.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lead, LeadDocument } from '../schemas/lead.schema';
import * as fs from 'fs';
import * as path from 'path';

export interface ExportJob {
  id: string;
  tenantId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filters?: any;
  leadIds?: string[];
  filePath?: string;
  filename?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  progress: number; // 0-100
}

@Injectable()
export class ExportQueueService {
  private readonly QUEUE_KEY = 'crm:export:queue';
  private readonly PROCESSING_KEY = 'crm:export:processing';
  private readonly JOBS_PREFIX = 'crm:export:job';
  private readonly logger = new Logger(ExportQueueService.name);

  constructor(
    private readonly redisService: RedisService,
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
  ) {}

  /**
   * Create a new export job
   */
  async createExportJob(
    tenantId: string,
    userId: string,
    filters?: any,
    leadIds?: string[]
  ): Promise<string> {
    const jobId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: ExportJob = {
      id: jobId,
      tenantId,
      userId,
      status: 'pending',
      filters,
      leadIds,
      createdAt: new Date(),
      progress: 0,
    };

    // Store job details
    await this.redisService.set(
      `${this.JOBS_PREFIX}:${jobId}`,
      JSON.stringify(job),
      3600 // 1 hour TTL
    );

    // Add to queue
    await this.redisService.getClient()!.lpush(this.QUEUE_KEY, jobId);

    this.logger.log(`[EXPORT QUEUE] Job created: ${jobId}`);
    return jobId;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<ExportJob | null> {
    const jobData = await this.redisService.get(`${this.JOBS_PREFIX}:${jobId}`);
    if (!jobData) {
      return null;
    }
    return JSON.parse(jobData);
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: string,
    updates: Partial<ExportJob>
  ): Promise<void> {
    const currentJob = await this.getJobStatus(jobId);
    if (!currentJob) {
      throw new Error(`Job ${jobId} not found`);
    }

    const updatedJob = { ...currentJob, ...updates };
    
    await this.redisService.set(
      `${this.JOBS_PREFIX}:${jobId}`,
      JSON.stringify(updatedJob),
      3600
    );
  }

  /**
   * Process next job in queue
   */
  async processNextJob(): Promise<boolean> {
    const client = this.redisService.getClient();
    if (!client) {
      return false;
    }

    // Get next job from queue (atomic operation)
    const jobId = await client.rpop(this.QUEUE_KEY);
    if (!jobId) {
      return false; // Queue empty
    }

    // Check if already being processed
    const isProcessing = await this.redisService.exists(`${this.PROCESSING_KEY}:${jobId}`);
    if (isProcessing) {
      this.logger.warn(`[EXPORT QUEUE] Job ${jobId} already processing, skipping`);
      return true;
    }

    // Mark as processing
    await this.redisService.set(`${this.PROCESSING_KEY}:${jobId}`, '1', 300);
    
    try {
      const job = await this.getJobStatus(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      this.logger.log(`[EXPORT QUEUE] Processing job: ${jobId}`);
      await this.updateJobStatus(jobId, { status: 'processing', progress: 10 });

      // Generate CSV data
      const csvData = await this.generateExportData(job);
      
      await this.updateJobStatus(jobId, { progress: 60 });

      // Create file
      const filePath = await this.createExportFile(csvData, job.tenantId);
      
      await this.updateJobStatus(jobId, {
        status: 'completed',
        filePath,
        filename: path.basename(filePath),
        progress: 100,
        completedAt: new Date(),
      });

      this.logger.log(`[EXPORT QUEUE] Job completed: ${jobId}, file: ${filePath}`);
      return true;
    } catch (error: any) {
      this.logger.error(`[EXPORT QUEUE] Job failed: ${jobId}`, error.stack);
      await this.updateJobStatus(jobId, {
        status: 'failed',
        error: error.message,
      });
      return false;
    } finally {
      // Remove from processing
      await this.redisService.del(`${this.PROCESSING_KEY}:${jobId}`);
    }
  }

  /**
   * Generate export data based on filters or IDs
   */
  private async generateExportData(job: ExportJob): Promise<any[]> {
    const matchQuery: any = { isDeleted: { $ne: true } };

    if (job.tenantId) {
      matchQuery.tenantId = new Types.ObjectId(job.tenantId);
    }

    // Filter by IDs if provided
    if (job.leadIds && job.leadIds.length > 0) {
      matchQuery._id = { $in: job.leadIds.map(id => new Types.ObjectId(id)) };
    }

    // Apply filters
    if (job.filters) {
      if (job.filters.startDate && job.filters.endDate) {
        matchQuery.createdAt = {
          $gte: new Date(job.filters.startDate),
          $lte: new Date(job.filters.endDate),
        };
      }

      if (job.filters.status) {
        matchQuery.statusKey = job.filters.status;
      }

      if (job.filters.source) {
        matchQuery.source = job.filters.source;
      }

      if (job.filters.assignedTo) {
        matchQuery.assignedTo = new Types.ObjectId(job.filters.assignedTo);
      }

      if (job.filters.minValue !== undefined) {
        matchQuery.value = { $gte: Number(job.filters.minValue) };
      }

      if (job.filters.maxValue !== undefined) {
        matchQuery.value = { ...matchQuery.value, $lte: Number(job.filters.maxValue) };
      }
    }

    // Fetch leads with projection (only required fields)
    const leads = await this.leadModel
      .find(matchQuery)
      .select('name email phone statusKey source value assignedTo created createdAt updatedAt')
      .lean()
      .limit(50000); // Safety limit

    // Transform to CSV-friendly format
    return leads.map((lead: any) => ({
      Name: lead.name || '',
      Email: lead.email || '',
      Phone: lead.phone || '',
      Status: lead.statusKey || '',
      Source: lead.source || '',
      Value: lead.value || 0,
      AssignedTo: lead.assignedTo ? 'Yes' : 'No',
      CreatedAt: new Date(lead.created).toISOString(),
      UpdatedAt: lead.updatedAt ? new Date(lead.updatedAt).toISOString() : new Date().toISOString(),
    }));
  }

  /**
   * Create CSV file from data
   */
  private async createExportFile(data: any[], tenantId: string): Promise<string> {
    const uploadDir = path.join(process.cwd(), 'uploads', 'exports');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `leads-export-${tenantId}-${timestamp}.csv`;
    const filePath = path.join(uploadDir, filename);

    // Convert to CSV
    const headers = Object.keys(data[0] || {});
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(value || '').replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',')
      )
    ];

    const csvContent = csvRows.join('\n');
    
    // Write file
    fs.writeFileSync(filePath, csvContent, 'utf-8');

    this.logger.log(`[EXPORT FILE] Created: ${filePath}`);
    return filePath;
  }

  /**
   * Download export file
   */
  async downloadFile(filename: string): Promise<{ path: string; name: string }> {
    const filePath = path.join(process.cwd(), 'uploads', 'exports', filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    return { path: filePath, name: filename };
  }

  /**
   * Clean up old export files (run periodically)
   */
  async cleanupOldFiles(maxAgeHours: number = 24): Promise<number> {
    const uploadDir = path.join(process.cwd(), 'uploads', 'exports');
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    let cleaned = 0;

    if (!fs.existsSync(uploadDir)) {
      return 0;
    }

    const files = fs.readdirSync(uploadDir);
    for (const file of files) {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    }

    this.logger.log(`[EXPORT CLEANUP] Cleaned ${cleaned} old files`);
    return cleaned;
  }
}

