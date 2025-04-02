import { VertexAI } from '@google-cloud/vertexai';
import { config } from '../config';
import { ReleaseNote } from '../types';

export interface SummaryResult {
  markdown: string;
  keyFeatures: string[];
  industryUseCases: string[];
}

export class GeminiService {
  private vertexAI: VertexAI;
  private model: string;

  constructor() {
    this.vertexAI = new VertexAI({
      project: config.googleCloud.projectId || '',
      location: 'us-central1',
    });
    this.model = config.vertexAI.model || 'gemini-pro';
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
      console.log('Starting to generate summary...');
      const prompt = this.createPrompt(notes);
      const model = this.vertexAI.preview.getGenerativeModel({
        model: this.model,
      });

      console.log('Sending request to Gemini API...');
      
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{
            text: prompt
          }]
        }],
        generation_config: {
          max_output_tokens: 2048,
          temperature: 0.2,
          top_p: 0.8,
          top_k: 40
        }
      });
      
      console.log('Received response from Gemini API');
      const response = result.response;
      
      const candidates = response.candidates || [];
      let text = '';
      
      if (candidates.length > 0 && candidates[0].content) {
        const parts = candidates[0].content.parts || [];
        if (parts.length > 0) {
          const part = parts[0] as { text?: string };
          text = part.text || '';
        }
      }
      
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