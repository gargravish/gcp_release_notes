import { create } from 'zustand';
import { ReleaseNote, SummaryResult, Timeframe } from '../types/api';

interface FilterState {
  timeframe: Timeframe;
  types: string[];
  products: string[];
  summarize: boolean;
}

interface StoreState {
  // Data
  notes: ReleaseNote[];
  summary: SummaryResult | null;
  products: string[];
  types: string[];

  // Filters
  filters: FilterState;

  // Loading states
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;

  // Actions
  setNotes: (notes: ReleaseNote[]) => void;
  setSummary: (summary: SummaryResult | null) => void;
  setProducts: (products: string[]) => void;
  setTypes: (types: string[]) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (message: string | null) => void;
}

const defaultFilters: FilterState = {
  timeframe: '7d',
  types: ['FEATURE', 'SERVICE_ANNOUNCEMENT'],
  products: ['BigQuery', 'Cloud Composer', 'Pub/Sub', 'Dataflow', 'Dataproc'],
  summarize: true,
};

export const useStore = create<StoreState>((set) => ({
  // Initial data state
  notes: [],
  summary: null,
  products: [],
  types: [],

  // Initial filter state
  filters: defaultFilters,

  // Initial loading state
  isLoading: false,
  isError: false,
  errorMessage: null,

  // Actions
  setNotes: (notes) => set({ notes }),
  setSummary: (summary) => set({ summary }),
  setProducts: (products) => set({ products }),
  setTypes: (types) => set({ types }),
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (message) => set({ isError: !!message, errorMessage: message }),
})); 