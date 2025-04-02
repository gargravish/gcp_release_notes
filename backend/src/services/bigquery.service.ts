import { BigQuery } from '@google-cloud/bigquery';
import { ReleaseNote } from '../types';
import { config } from '../config';

export class BigQueryService {
  private bigquery: BigQuery;
  private dataset: string;
  private table: string;

  constructor() {
    this.bigquery = new BigQuery({
      projectId: config.projectId,
      keyFilename: config.keyFilename,
    });
    this.dataset = config.bigquery.dataset;
    this.table = config.bigquery.table;
  }

  private getDateRange(timeframe: string): { startDate: string; endDate: string } {
    const now = new Date();
    const days = parseInt(timeframe.replace('d', ''));
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days);

    // Format dates as YYYY-MM-DD for BigQuery
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      startDate: formatDate(startDate),
      endDate: formatDate(now)
    };
  }

  async getReleaseNotes(timeframe: string, types: string[], products: string[]): Promise<ReleaseNote[]> {
    const { startDate, endDate } = this.getDateRange(timeframe);

    const query = `
      SELECT
        product_name,
        release_note_type,
        description,
        DATE(published_at) as published_at
      FROM \`${this.dataset}.${this.table}\`
      WHERE DATE(published_at) BETWEEN DATE(@startDate) AND DATE(@endDate)
      ${types.length ? 'AND release_note_type IN UNNEST(@types)' : ''}
      ${products.length ? 'AND product_name IN UNNEST(@products)' : ''}
      ORDER BY published_at DESC
    `;

    const options = {
      query,
      params: {
        startDate,
        endDate,
        types: types || [],
        products: products || [],
      },
      location: 'US',  // Specify the location of your BigQuery dataset
    };

    try {
      console.log('Executing BigQuery with options:', JSON.stringify(options, null, 2));
      const [rows] = await this.bigquery.query(options);
      console.log('BigQuery response:', JSON.stringify(rows, null, 2));
      return rows.map((row: any) => ({
        ...row,
        published_at: row.published_at.value || row.published_at
      }));
    } catch (error) {
      console.error('Error fetching release notes:', error);
      throw error;
    }
  }

  async getDistinctProducts(): Promise<string[]> {
    const query = `
      SELECT DISTINCT product_name
      FROM \`${this.dataset}.${this.table}\`
      ORDER BY product_name
    `;

    try {
      const [rows] = await this.bigquery.query({ query, location: 'US' });
      return rows.map((row: { product_name: string }) => row.product_name);
    } catch (error) {
      console.error('Error fetching distinct products:', error);
      throw error;
    }
  }

  async getDistinctTypes(): Promise<string[]> {
    const query = `
      SELECT DISTINCT release_note_type
      FROM \`${this.dataset}.${this.table}\`
      ORDER BY release_note_type
    `;

    try {
      const [rows] = await this.bigquery.query({ query, location: 'US' });
      return rows.map((row: { release_note_type: string }) => row.release_note_type);
    } catch (error) {
      console.error('Error fetching distinct types:', error);
      throw error;
    }
  }
} 