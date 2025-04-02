import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Treemap, TooltipProps
} from 'recharts';
import { ReleaseNote } from '../types/api';
import { useStore } from '../store/useStore';

// Type color mapping
const typeColors: Record<string, string> = {
  FEATURE: '#8884d8',
  SERVICE_ANNOUNCEMENT: '#82ca9d',
  FIX: '#ff8042',
  ISSUE: '#ffc658',
  LIBRARIES: '#0088fe',
  DEPRECATION: '#ff0000',
  BREAKING_CHANGE: '#ff00ff',
  SECURITY_BULLETIN: '#008000',
  NON_BREAKING_CHANGE: '#00bcd4',
};

interface DataVisualizationsProps {
  notes: ReleaseNote[];
}

const CustomTooltip = ({ active, payload }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Card sx={{ p: 1, bgcolor: 'background.paper' }}>
        <Typography variant="subtitle2">{data.product}</Typography>
        {Object.entries(data)
          .filter(([key]) => key !== 'product')
          .map(([key, value]) => (
            <Typography key={key} variant="body2" color="text.secondary">
              {key.charAt(0).toUpperCase() + key.slice(1)}: {value as number}
            </Typography>
          ))}
      </Card>
    );
  }
  return null;
};

const TreemapTooltip = ({ active, payload }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Card sx={{ p: 1, bgcolor: 'background.paper' }}>
        <Typography variant="subtitle2">{data.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          Total Updates: {data.value}
        </Typography>
      </Card>
    );
  }
  return null;
};

export const DataVisualizations: React.FC<DataVisualizationsProps> = ({ notes }) => {
  const { filters } = useStore();
  const selectedTypes = filters.types;

  // Process data for visualizations
  const productStats = notes.reduce((acc: { [key: string]: Record<string, number> }, note) => {
    if (!acc[note.product_name]) {
      // Initialize with all types set to 0
      acc[note.product_name] = selectedTypes.reduce((types, type) => {
        types[type] = 0;
        return types;
      }, {} as Record<string, number>);
    }
    
    // Only count types that are in the selected types
    if (selectedTypes.includes(note.release_note_type)) {
      acc[note.product_name][note.release_note_type]++;
    }
    
    return acc;
  }, {});

  const barChartData = Object.entries(productStats).map(([product, stats]) => ({
    product,
    ...stats, // Spread all type counts
  }));

  const heatmapData = Object.entries(productStats).map(([product, stats]) => ({
    name: product,
    value: Object.values(stats).reduce((sum, count) => sum + count, 0),
  }));

  return (
    <Box sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Release Notes Analytics
      </Typography>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: 1, minWidth: 300 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Updates by Product and Type
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="product" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {selectedTypes.map((type) => (
                  <Bar 
                    key={type}
                    dataKey={type}
                    name={type.replace(/_/g, ' ')}
                    fill={typeColors[type] || '#999999'}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 300 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Release Activity Heatmap
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <Treemap
                data={heatmapData}
                dataKey="value"
                nameKey="name"
                stroke="#fff"
                fill="#8884d8"
                aspectRatio={1}
              >
                <Tooltip content={<TreemapTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}; 