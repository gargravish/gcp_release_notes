import React, { Suspense, lazy } from 'react';
import { Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Alert, Link, Button } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/useStore';
import { api } from '../services/api';

// Lazy load the table content for better performance
const SummaryTableContent = lazy(() => import('./SummaryTableContent'));

export const Summary: React.FC = () => {
  const { filters } = useStore();

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['releaseNotes', filters],
    queryFn: () => api.getReleaseNotes(filters),
    enabled: filters.summarize,
  });

  if (!filters.summarize) {
    return null;
  }

  // Error from API fetching
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to generate summary
      </Alert>
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
        </CardContent>
      </Card>
    );
  }

  const summary = data?.summary;
  if (!summary && !isLoading && !isFetching) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No summary information available for the selected filters.
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          Industry Use Cases Analysis
          {(isLoading || isFetching) && (
            <CircularProgress size={20} sx={{ ml: 2 }} />
          )}
        </Typography>
        
        <Suspense fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        }>
          {summary && (
            <SummaryTableContent summary={summary} />
          )}
        </Suspense>
      </CardContent>
    </Card>
  );
}; 