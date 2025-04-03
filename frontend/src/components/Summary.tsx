import React, { Suspense, lazy } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Alert, Link, Button } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/useStore';
import { api } from '../services/api';

// Lazy load the table content for better performance
const SummaryTableContent = lazy(() => import('./SummaryTableContent'));

export const Summary: React.FC = () => {
  const { filters, setFilters } = useStore();

  // Use a separate query key for summary to avoid reloading all data
  const { 
    data, 
    isLoading, 
    error, 
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['summaryOnly', filters],
    queryFn: () => api.getReleaseNotes({...filters, summarize: true}),
    enabled: filters.summarize,
    // Don't refetch on window focus to avoid unexpected reloads
    refetchOnWindowFocus: false,
    // Keep previous data while loading new data
    keepPreviousData: true
  });

  // Generate summary on demand rather than with filter toggle
  const handleGenerateSummary = () => {
    refetch();
  };

  if (!filters.summarize) {
    return null;
  }

  // Error from API fetching
  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI Summary Error
          </Typography>
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to generate summary: {error instanceof Error ? error.message : 'Unknown error'}
          </Alert>
          <Button 
            variant="contained" 
            onClick={handleGenerateSummary} 
            sx={{ mt: 2 }}
            disabled={isLoading || isFetching}
          >
            Retry Summary Generation
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Handle summary error from the API
  if (data?.summaryError) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI Summary Error
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {data.summaryError.message}
          </Alert>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {data.summaryError.details}
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            To use the Gemini AI summary feature, you need to:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>Ensure you have a valid Gemini API key in your .env file</li>
            <li>Verify that your Google Cloud project has the Vertex AI API enabled</li>
            <li>
              See the <Link href="https://cloud.google.com/vertex-ai/docs/generative-ai/start/quickstarts/api-quickstart" target="_blank" rel="noopener noreferrer">
                Vertex AI API documentation
              </Link> for more information
            </li>
          </Box>
          <Button 
            variant="contained" 
            onClick={handleGenerateSummary} 
            sx={{ mt: 2 }}
            disabled={isLoading || isFetching}
          >
            Retry Summary Generation
          </Button>
        </CardContent>
      </Card>
    );
  }

  const summary = data?.summary;
  if (!summary && !isLoading && !isFetching) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            No summary information available for the selected filters.
          </Alert>
          <Button 
            variant="contained" 
            onClick={handleGenerateSummary} 
            disabled={isLoading || isFetching}
          >
            Generate Summary
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Industry Use Cases Analysis
          </Typography>
          {(isLoading || isFetching) ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Generating summary...
              </Typography>
            </Box>
          ) : (
            <Button 
              variant="outlined" 
              onClick={handleGenerateSummary} 
              size="small"
            >
              Refresh Summary
            </Button>
          )}
        </Box>
        
        <Suspense fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        }>
          {summary && !isLoading && (
            <SummaryTableContent summary={summary} />
          )}
        </Suspense>
      </CardContent>
    </Card>
  );
}; 