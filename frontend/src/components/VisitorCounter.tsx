import React, { useEffect, useState } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { api } from '../services/api';

export const VisitorCounter: React.FC = () => {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeCounter = async () => {
      try {
        // Check if we've already incremented in this session
        const hasIncremented = sessionStorage.getItem('visitorCounterIncremented');
        
        if (!hasIncremented) {
          // First, increment the counter
          await api.incrementVisitorCounter();
          // Mark that we've incremented in this session
          sessionStorage.setItem('visitorCounterIncremented', 'true');
        }
        
        // Then get the current count
        const response = await api.getVisitorCounter();
        setCount(response.count);
      } catch (err) {
        console.error('Error initializing visitor counter:', err);
        setError('Failed to load visitor count');
      }
    };

    initializeCounter();
  }, []);

  if (error) {
    return null; // Don't show anything if there's an error
  }

  return (
    <Tooltip title="Total number of visitors to this site">
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: 1,
        color: 'white'
      }}>
        <Typography variant="body2" sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 0.5
        }}>
          <span role="img" aria-label="visitors">👥</span>
          {count !== null ? count.toLocaleString() : '...'}
        </Typography>
      </Box>
    </Tooltip>
  );
}; 