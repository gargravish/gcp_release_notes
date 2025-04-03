import axios from 'axios';
import { config } from '../config';
import { ReleaseNote } from '../types';

export interface SummaryResult {
  markdown: string;
  keyFeatures: string[];
  industryUseCases: string[];
}

export class GeminiService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    // Get the API key and model from environment config
    this.apiKey = config.vertexAI.apiKey || '';
    
    // Get model from config, which has already been validated
    this.model = config.vertexAI.model;
    
    // Determine API base URL based on model
    if (this.model.startsWith('gemini-2.5-')) {
      // Experimental models may use beta version
      this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
      console.log('Using beta API endpoint for experimental model');
    } else if (this.model.startsWith('gemini-2.0-')) {
      // Experimental models may use beta version
      this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
      console.log('Using beta API endpoint for experimental model');
    } else {
      // Standard models use stable v1
      this.baseUrl = 'https://generativelanguage.googleapis.com/v1';
    }
    
    // Log configuration on initialization
    console.log('Initializing Gemini service with:');
    console.log(`- API Key: ${this.apiKey ? '********' + this.apiKey.slice(-4) : 'NOT SET'}`);
    console.log(`- Model: ${this.model}`);
    console.log(`- Base URL: ${this.baseUrl}`);
  }

  private formatReleaseNotes(notes: ReleaseNote[]): string {
    return notes
      .map(
        note => `
### ${note.product_name} - ${note.release_note_type}
${note.description}
`
      )
      .join('\n');
  }

  private createPrompt(notes: ReleaseNote[]): string {
    const formattedNotes = this.formatReleaseNotes(notes);
    
    // Count distinct products in the notes to mention in the prompt
    const distinctProducts = [...new Set(notes.map(note => note.product_name))];
    
    return `
Please analyze the following GCP release notes from multiple products (${distinctProducts.join(', ')}) and provide a focused analysis of the most impactful features and announcements across different products. Your analysis should:

1. Identify and prioritize the MOST SIGNIFICANT features or announcements that will have the greatest impact on customers
2. Ensure balanced coverage across different GCP products, not just focusing on one product
3. Analyze both FEATURE and SERVICE_ANNOUNCEMENT types to find the most valuable capabilities
4. Match specific industry verticals to the most relevant product features

Release Notes:
${formattedNotes}

Please format your response as a table of industry use cases, with balanced representation across ALL the GCP products mentioned in the release notes:

## Industry Use Cases
| Industry | Use Case | Benefits / ROI | Product Feature |
|----------|----------|---------------|-----------------|
[Fill this table with diverse industry use cases across DIFFERENT GCP PRODUCTS. For each entry, include:
- A specific industry vertical (e.g., Retail, Financial Services, Healthcare)
- Clear, practical use cases formatted as bullet points if there are multiple
- Measurable benefits including TCO optimization metrics and ROI probabilities (use bullet points for multiple benefits)
- The specific GCP product feature or announcement that enables this use case]

IMPORTANT GUIDELINES:
1. DO NOT FOCUS PRIMARILY ON BIGQUERY. Ensure balanced coverage across the different GCP products in the release notes.
2. RANK AND PRIORITIZE features based on customer impact - focus on the most transformative capabilities.
3. Include a mix of products (at least 3-4 different GCP products) and both feature types (FEATURE and SERVICE_ANNOUNCEMENT).
4. For each product, identify the PRIMARY industry vertical that would benefit most from that specific feature.
5. Provide specific, measurable metrics for ROI and benefits (e.g., "15-20% reduction in processing time").
6. Represent diverse industries: Financial Services, Healthcare, Retail, Manufacturing, Media, etc.
`;
  }

  async generateSummary(notes: ReleaseNote[]): Promise<SummaryResult> {
    try {
      console.log('Starting to generate summary with direct API...');
      
      if (!this.apiKey) {
        throw new Error('Gemini API key is not configured. Please check your environment variables.');
      }
      
      // Log the model and URL for debugging
      console.log(`Using Gemini model: ${this.model}`);
      console.log(`Using baseUrl: ${this.baseUrl}`);
      
      const prompt = this.createPrompt(notes);
      
      // Use Axios to call the Gemini API directly
      const endpoint = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
      
      console.log(`Sending request to Gemini API at ${endpoint.replace(this.apiKey, '***')}`);
      
      // Simplified request format for better compatibility
      const requestPayload = {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048
        }
      };
      
      console.log('Request payload structure:', JSON.stringify(requestPayload, (key, value) => {
        // Mask the actual prompt content for security
        if (key === 'text' && typeof value === 'string' && value.length > 100) {
          return value.substring(0, 100) + '... [truncated]';
        }
        return value;
      }, 2));
      
      const response = await axios.post(endpoint, requestPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 seconds timeout to prevent hanging requests
      });
      
      console.log('Received response from Gemini API:', response.status);
      console.log('Response data structure:', JSON.stringify(response.data, null, 2));
      
      if (!response.data) {
        console.error('Empty response from Gemini API');
        throw new Error('Empty response from Gemini API');
      }
      
      // Handle different response formats
      let text = '';
      
      if (response.data.candidates && response.data.candidates.length > 0) {
        const candidate = response.data.candidates[0];
        
        // Try to extract text based on different possible response formats
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          text = candidate.content.parts[0].text || '';
        } else if (candidate.text) {
          text = candidate.text;
        } else if (candidate.output) {
          text = candidate.output;
        }
      } else if (response.data.text) {
        text = response.data.text;
      }
      
      if (!text) {
        console.error('No text found in response:', JSON.stringify(response.data));
        throw new Error('Could not extract text from the Gemini API response');
      }
      
      console.log('Successfully received text response');

      // Parse the markdown response to extract structured data
      const keyFeatures = this.extractKeyFeatures(text);
      const industryUseCases = this.extractIndustryUseCases(text);

      return {
        markdown: text,
        keyFeatures,
        industryUseCases,
      };
    } catch (error) {
      console.error('Error generating summary:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          data: error.response?.data,
          config: {
            url: error.config?.url?.replace(this.apiKey, '***'),
            method: error.config?.method,
          }
        });
        
        // Check for specific error types
        if (error.response?.status === 403) {
          throw new Error('Access denied: API key may be invalid or lacks permissions for the specified model');
        } else if (error.response?.status === 404) {
          throw new Error(`Model not found: "${this.model}" may not be available or correctly specified`);
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          throw new Error('Network error: Unable to connect to the Gemini API');
        } else if (error.code === 'ETIMEDOUT') {
          throw new Error('Request timed out: The Gemini API took too long to respond');
        }
      }
      throw new Error(`Failed to generate summary using Gemini: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private extractKeyFeatures(markdown: string): string[] {
    const featuresSection = markdown.split('## Key Features and Announcements')[1]?.split('##')[0];
    if (!featuresSection) return [];

    return featuresSection
      .split('\n')
      .filter(line => line.trim().startsWith('|') && !line.includes('---'))
      .map(line => {
        const [, feature] = line.split('|').map(cell => cell.trim());
        return feature;
      });
  }

  private extractIndustryUseCases(markdown: string): string[] {
    const useCasesSection = markdown.split('## Industry Use Cases')[1]?.split('##')[0];
    if (!useCasesSection) return [];

    return useCasesSection
      .split('\n')
      .filter(line => line.trim().startsWith('|') && !line.includes('---'))
      .map(line => {
        const [, industry, useCase] = line.split('|').map(cell => cell.trim());
        return `${industry}: ${useCase}`;
      });
  }
} 