import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import { Layout } from './components/Layout';
import { useStore } from './store/useStore';
import { api } from './services/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const { setProducts, setTypes, setLoading, setError } = useStore();

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const [products, types] = await Promise.all([
          api.getDistinctProducts(),
          api.getDistinctTypes(),
        ]);
        setProducts(products);
        setTypes(types);
      } catch (error) {
        setError('Failed to fetch metadata');
        console.error('Error fetching metadata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [setProducts, setTypes, setLoading, setError]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Layout />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App; 