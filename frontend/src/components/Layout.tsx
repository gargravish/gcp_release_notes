import React from 'react';
import { Box, AppBar, Toolbar, Typography, Container, Paper, useTheme } from '@mui/material';
import { Filters } from './Filters';
import { ReleaseNotesList } from './ReleaseNotesList';
import { Summary } from './Summary';

export const Layout: React.FC = () => {
  const theme = useTheme();

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      bgcolor: theme.palette.grey[100]
    }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: theme.palette.primary.dark }}>
        <Toolbar>
          <Typography variant="h5" component="div" sx={{ 
            flexGrow: 1,
            fontWeight: 600,
            letterSpacing: '0.5px'
          }}>
            GCP Release Notes Dashboard
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1 }}>
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Filters />
        </Paper>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
            <ReleaseNotesList />
          </Paper>
          
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
            <Summary />
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}; 