import { Request, Response } from 'express';
import { BigQueryService } from '../services/bigquery.service';
import { GeminiService } from '../services/gemini.service';
import { ReleaseNotesResponse } from '../types';

export class ReleaseNotesController {
  private bigQueryService: BigQueryService;
  private geminiService: GeminiService;

  constructor() {
    this.bigQueryService = new BigQueryService();
    this.geminiService = new GeminiService();
  }

  async getReleaseNotes(req: Request, res: Response) {
    try {
      const timeframe = (req.query.timeframe as string) || '7d';
      const types = req.query.types ? (req.query.types as string).split(',') : [];
      const products = req.query.products ? (req.query.products as string).split(',') : [];
      const summarize = req.query.summarize === 'true';

      console.log('Fetching release notes with params:', { timeframe, types, products, summarize });

      const notes = await this.bigQueryService.getReleaseNotes(timeframe, types, products);
      console.log(`Found ${notes.length} release notes`);

      let summary = undefined;
      let summaryError = null;
      
      if (summarize && notes.length > 0) {
        try {
          console.log('Attempting to generate summary with Gemini...');
          summary = await this.geminiService.generateSummary(notes);
          console.log('Summary generated successfully');
        } catch (error) {
          console.error('Error generating summary:', error);
          summaryError = {
            message: error instanceof Error ? error.message : 'Unknown error generating summary',
            details: 'There was an issue connecting to Gemini API. Please check your API key and configuration.'
          };
          // Continue without summary if there's an error
        }
      } else if (summarize) {
        console.log('Not generating summary - no release notes found');
      } else {
        console.log('Summary generation not requested');
      }

      const response: ReleaseNotesResponse = {
        notes,
        filters: {
          timeframe: timeframe as any,
          types,
          products,
        },
        summary,
        summaryError
      };

      res.json(response);
    } catch (error) {
      console.error('Error in getReleaseNotes:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  async getDistinctProducts(req: Request, res: Response) {
    try {
      const products = await this.bigQueryService.getDistinctProducts();
      res.json({ products });
    } catch (error) {
      console.error('Error in getDistinctProducts:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  async getDistinctTypes(req: Request, res: Response) {
    try {
      const types = await this.bigQueryService.getDistinctTypes();
      res.json({ types });
    } catch (error) {
      console.error('Error in getDistinctTypes:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
} 