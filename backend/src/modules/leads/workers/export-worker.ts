import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ExportQueueService } from '../services/export-queue.service';

@Injectable()
export class ExportWorker implements OnModuleInit {
  private readonly logger = new Logger(ExportWorker.name);
  private isRunning = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly exportQueueService: ExportQueueService,
  ) {}

  onModuleInit() {
    // Start background worker to process export jobs
    this.startWorker();
  }

  private startWorker() {
    this.logger.log('[EXPORT WORKER] Starting background worker...');
    this.isRunning = true;

    // Process jobs every 2 seconds
    this.processingInterval = setInterval(() => {
      this.processNextJob().catch(err => {
        this.logger.error('[EXPORT WORKER] Error processing job:', err);
      });
    }, 2000);

    this.logger.log('[EXPORT WORKER] Worker started successfully');
  }

  private async processNextJob() {
    if (!this.isRunning) return;

    try {
      const processed = await this.exportQueueService.processNextJob();
      
      if (processed) {
        this.logger.log('[EXPORT WORKER] Job processed successfully');
      }
    } catch (error: any) {
      this.logger.error('[EXPORT WORKER] Failed to process job:', error.message);
    }
  }

  onStop() {
    this.isRunning = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    this.logger.log('[EXPORT WORKER] Worker stopped');
  }
}
