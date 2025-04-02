import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Link,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  IconButton,
  Paper,
  Chip
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { ReleaseNote } from '../types/api';
import { DataVisualizations } from './DataVisualizations';
import ReactMarkdown from 'react-markdown';

// Type color mapping
const typeColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
  FEATURE: 'primary',
  SERVICE_ANNOUNCEMENT: 'secondary',
  FIX: 'warning',
  ISSUE: 'error',
  LIBRARIES: 'info',
  DEPRECATION: 'error',
  BREAKING_CHANGE: 'error',
  SECURITY_BULLETIN: 'error',
  NON_BREAKING_CHANGE: 'success'
};

interface ExpandableRowProps {
  product: string;
  notes: ReleaseNote[];
}

const ExpandableRow: React.FC<ExpandableRowProps> = ({ product, notes }) => {
  const [open, setOpen] = React.useState(false);
  const { filters } = useStore();
  const selectedTypes = filters.types;
  
  // Generate type counts for selected types
  const typeCounts = selectedTypes.reduce((acc: Record<string, number>, type) => {
    acc[type] = notes.filter(note => note.release_note_type === type).length;
    return acc;
  }, {});

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const [year, month, day] = dateString.split('-').map(num => parseInt(num));
      const date = new Date(year, month - 1, day);
      
      if (isNaN(date.getTime())) {
        return 'N/A';
      }

      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch {
      return 'N/A';
    }
  };

  const getDateRange = () => {
    if (!notes.length) return 'N/A';

    const validDates = notes
      .filter(note => note.published_at)
      .sort((a, b) => {
        const dateA = new Date(a.published_at);
        const dateB = new Date(b.published_at);
        return dateB.getTime() - dateA.getTime();
      });

    if (!validDates.length) return 'N/A';

    const latest = formatDate(validDates[0].published_at);
    const earliest = formatDate(validDates[validDates.length - 1].published_at);

    return latest === earliest ? latest : `${latest} - ${earliest}`;
  };

  const formatDescription = (description: string) => {
    // Replace URLs with markdown links
    const urlRegex = /\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g;
    return description.replace(urlRegex, '[$1]($2)');
  };

  // Format for display (replaces underscores with spaces, capitalizes)
  const formatTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          <Typography variant="subtitle1" fontWeight="medium">
            {product}
          </Typography>
        </TableCell>
        <TableCell align="center">
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            {Object.entries(typeCounts).map(([type, count]) => (
              count > 0 && (
                <Chip 
                  key={type}
                  label={`${formatTypeLabel(type)}: ${count}`} 
                  color={typeColors[type] || 'default'} 
                  size="small"
                />
              )
            ))}
          </Box>
        </TableCell>
        <TableCell align="right">
          {getDateRange()}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Release Notes
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                {notes.map((note) => (
                  selectedTypes.includes(note.release_note_type) && (
                    <Card key={`${note.product_name}-${note.published_at}-${note.description.substring(0, 20)}`} variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography color="text.secondary">
                            {formatDate(note.published_at)}
                          </Typography>
                          <Chip 
                            label={formatTypeLabel(note.release_note_type)} 
                            size="small"
                            color={typeColors[note.release_note_type] || 'default'}
                          />
                        </Box>
                        <Box sx={{ typography: 'body1', mb: 1 }}>
                          <ReactMarkdown
                            components={{
                              a: ({ node, ...props }) => (
                                <Link {...props} target="_blank" rel="noopener noreferrer" />
                              ),
                            }}
                          >
                            {formatDescription(note.description)}
                          </ReactMarkdown>
                        </Box>
                        {note.url && (
                          <Link href={note.url} target="_blank" rel="noopener noreferrer">
                            Read more
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  )
                ))}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export const ReleaseNotesList: React.FC = () => {
  const { filters } = useStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['releaseNotes', filters],
    queryFn: () => api.getReleaseNotes(filters),
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load release notes
      </Alert>
    );
  }

  if (!data?.notes.length) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No release notes found for the selected filters
      </Alert>
    );
  }

  // Filter notes by selected types
  const filteredNotes = data.notes.filter(note => 
    filters.types.includes(note.release_note_type)
  );

  if (!filteredNotes.length) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No release notes found for the selected filters
      </Alert>
    );
  }

  // Group notes by product and sort by date
  const groupedNotes = filteredNotes.reduce((acc: { [key: string]: ReleaseNote[] }, note) => {
    if (!acc[note.product_name]) {
      acc[note.product_name] = [];
    }
    acc[note.product_name].push(note);
    return acc;
  }, {});

  // Sort notes within each product by date
  Object.values(groupedNotes).forEach(notes => {
    notes.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <DataVisualizations notes={data.notes} />
      
      <TableContainer component={Paper} elevation={0}>
        <Table aria-label="release notes table">
          <TableHead>
            <TableRow>
              <TableCell width="50px" />
              <TableCell>Product</TableCell>
              <TableCell align="center">Updates</TableCell>
              <TableCell align="right">Date Range</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(groupedNotes).map(([product, notes]) => (
              <ExpandableRow key={product} product={product} notes={notes} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}; 