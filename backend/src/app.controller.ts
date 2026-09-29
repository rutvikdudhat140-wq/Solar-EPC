import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('/')
  getRoot() {
    return {
      success: true,
      message: 'Solar EPC API is running!',
      version: '1.0.0',
      endpoints: {
        api: '/api',
        health: '/api/health',
        auth: '/api/auth/login',
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('/api/health')
  getHealthAPI() {
    return this.getHealth();
  }

  @Get('/health')
  getHealth() {
    return {
      success: true,
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('/favicon.ico')
  getFavicon() {
    return '';
  }
}
