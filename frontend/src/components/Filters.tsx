import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Switch,
  Checkbox,
  ListItemText,
  OutlinedInput
} from '@mui/material';
import { useStore } from '../store/useStore';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

export const Filters: React.FC = () => {
  const { filters, products, types, setFilters } = useStore();

  const handleTimeframeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, timeframe: event.target.value });
  };

  const handleProductsChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const value = event.target.value as string[];
    setFilters({ ...filters, products: value });
  };

  const handleTypesChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const value = event.target.value as string[];
    setFilters({ ...filters, types: value });
  };

  const handleSummarizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, summarize: event.target.checked });
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      <TextField
        label="Time Range"
        select
        value={filters.timeframe}
        onChange={handleTimeframeChange}
        sx={{ minWidth: 200 }}
      >
        <MenuItem value="7d">Last 7 days</MenuItem>
        <MenuItem value="30d">Last 30 days</MenuItem>
        <MenuItem value="90d">Last 90 days</MenuItem>
      </TextField>

      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel>Products</InputLabel>
        <Select
          multiple
          value={filters.products}
          onChange={handleProductsChange}
          input={<OutlinedInput label="Products" />}
          renderValue={(selected) => (selected as string[]).join(', ')}
          MenuProps={MenuProps}
        >
          {products.map((product) => (
            <MenuItem key={product} value={product}>
              <Checkbox checked={filters.products.indexOf(product) > -1} />
              <ListItemText primary={product} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel>Types</InputLabel>
        <Select
          multiple
          value={filters.types}
          onChange={handleTypesChange}
          input={<OutlinedInput label="Types" />}
          renderValue={(selected) => (selected as string[]).join(', ')}
          MenuProps={MenuProps}
        >
          {types.map((type) => (
            <MenuItem key={type} value={type}>
              <Checkbox checked={filters.types.indexOf(type) > -1} />
              <ListItemText primary={type} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControlLabel
        control={
          <Switch
            checked={filters.summarize}
            onChange={handleSummarizeChange}
          />
        }
        label="Generate Summary"
      />
    </Box>
  );
}; 