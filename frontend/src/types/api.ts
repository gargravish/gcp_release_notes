export interface ReleaseNote {
  product_name: string;
  release_note_type: string;
  description: string;
  published_at: string;
  url?: string;
}

export interface SummaryResult {
  markdown: string;
  keyFeatures: string[];
  industryUseCases: string[];
}

export type Timeframe = '7d' | '30d' | '90d';

export interface ReleaseNotesResponse {
  filtersApplied: {
    timeframe: Timeframe;
    types?: string[];
    products?: string[];
  };
  notes: ReleaseNote[];
  summary: SummaryResult | null;
}

export interface MetaResponse {
  products?: string[];
  types?: string[];
}

export interface ApiError {
  error: string;
  message: string;
} 