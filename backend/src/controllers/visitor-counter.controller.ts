import { Request, Response } from 'express';
import { VisitorCounterService } from '../services/visitor-counter.service';

export class VisitorCounterController {
  private visitorCounterService: VisitorCounterService;

  constructor() {
    this.visitorCounterService = new VisitorCounterService();
  }

  async incrementCounter(req: Request, res: Response) {
    try {
      const count = await this.visitorCounterService.incrementCounter();
      res.json({ count });
    } catch (error) {
      console.error('Error in incrementCounter:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  async getCounter(req: Request, res: Response) {
    try {
      const count = await this.visitorCounterService.getCounter();
      res.json({ count });
    } catch (error) {
      console.error('Error in getCounter:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
} 