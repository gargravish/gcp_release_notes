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
    this.model = config.vertexAI.model || 'gemini-pro';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    
    // Log configuration on initialization
    console.log('Initializing Gemini service with:');
    console.log(`- API Key: ${this.apiKey ? '********' + this.apiKey.slice(-4) : 'NOT SET'}`);
    console.log(`- Model: ${this.model}`);
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
      
      const prompt = this.createPrompt(notes);
      
      // Use Axios to call the Gemini API directly
      const endpoint = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
      
      console.log(`Sending request to Gemini API at ${endpoint.replace(this.apiKey, '***')}`);
      
      const response = await axios.post(endpoint, {
        contents: [{
          role: 'user',
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.2,
          topP: 0.8,
          topK: 40
        }
      });
      
      console.log('Received response from Gemini API:', response.status);
      
      if (!response.data || !response.data.candidates || response.data.candidates.length === 0) {
        console.error('Invalid response format:', JSON.stringify(response.data));
        throw new Error('Invalid response format from Gemini API');
      }
      
      const candidate = response.data.candidates[0];
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        console.error('No content in response:', JSON.stringify(candidate));
        throw new Error('No content in response from Gemini API');
      }
      
      const text = candidate.content.parts[0].text;
      
      if (!text) {
        console.error('No text generated in response');
        throw new Error('No text generated from Gemini API');
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
        console.error('Axios error details:', error.response?.data);
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