import { ReleaseNotesResponse, MetaResponse, ApiError } from '../types/api';

const API_BASE_URL = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'An error occurred');
  }
  return response.json();
}

export const api = {
  async getReleaseNotes(params: {
    timeframe?: string;
    types?: string[];
    products?: string[];
    summarize?: boolean;
  }): Promise<ReleaseNotesResponse> {
    const searchParams = new URLSearchParams();
    if (params.timeframe) searchParams.set('timeframe', params.timeframe);
    if (params.types?.length) searchParams.set('types', params.types.join(','));
    if (params.products?.length) searchParams.set('products', params.products.join(','));
    if (params.summarize !== undefined) searchParams.set('summarize', String(params.summarize));

    const response = await fetch(`${API_BASE_URL}/release-notes?${searchParams}`);
    return handleResponse<ReleaseNotesResponse>(response);
  },

  async getDistinctProducts(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/meta/products`);
    const data = await handleResponse<MetaResponse>(response);
    return data.products || [];
  },

  async getDistinctTypes(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/meta/types`);
    const data = await handleResponse<MetaResponse>(response);
    return data.types || [];
  },
}; 