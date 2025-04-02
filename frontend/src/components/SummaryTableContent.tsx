import React from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import { SummaryResult } from '../types/api';
import ReactMarkdown from 'react-markdown';

// Extract industry and use case from the combined string
const parseIndustryUseCase = (combined: string) => {
  const parts = combined.split(':');
  if (parts.length < 2) {
    return { industry: combined, useCase: '' };
  }
  return {
    industry: parts[0].trim(),
    useCase: parts.slice(1).join(':').trim()
  };
};

// Parse markdown table data if available
const parseMarkdownTable = (markdown: string): Array<{ 
  industry: string; 
  useCase: string; 
  benefits: string;
  productFeature: string;
}> => {
  try {
    // Look for the industry use cases table
    const useCasesSection = markdown.split('## Industry Use Cases')[1]?.split('##')[0];
    if (!useCasesSection) return [];

    // Get table rows (skip header and separator rows)
    const tableRows = useCasesSection
      .split('\n')
      .filter(line => line.trim().startsWith('|') && !line.includes('---') && !line.includes('Industry'));

    return tableRows.map(row => {
      const cells = row.split('|').filter(cell => cell.trim() !== '');
      if (cells.length >= 4) {
        return {
          industry: cells[0].trim(),
          useCase: cells[1].trim(),
          benefits: cells[2].trim(),
          productFeature: cells[3].trim()
        };
      } else if (cells.length >= 3) {
        return {
          industry: cells[0].trim(),
          useCase: cells[1].trim(),
          benefits: cells[2].trim(),
          productFeature: ''
        };
      }
      return { industry: '', useCase: '', benefits: '', productFeature: '' };
    }).filter(item => item.industry !== '');
  } catch (error) {
    console.error('Error parsing markdown table:', error);
    return [];
  }
};

// Process text content for display - handles newlines and literal '\n' in text
const processTextContent = (content: string): string => {
  if (!content) return '';
  
  // Replace literal '\n' with actual line breaks
  return content.replace(/\\n/g, '\n');
};

// Custom component to render markdown content in table cells
const MarkdownCell: React.FC<{ content: string }> = ({ content }) => {
  // Process content to handle newlines properly
  const processedContent = processTextContent(content);
  
  return (
    <ReactMarkdown components={{
      // Override default styling to match table styling
      p: ({ children }) => <div style={{ margin: '0.2rem 0' }}>{children}</div>,
      strong: ({ children }) => <span style={{ fontWeight: 'bold' }}>{children}</span>,
      // Format lists better in table cells
      ul: ({ children }) => <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>{children}</ul>,
      li: ({ children }) => <li style={{ marginBottom: '0.3rem' }}>{children}</li>
    }}>
      {processedContent}
    </ReactMarkdown>
  );
};

// Format content into bullet points if it contains multiple sentences or items
const formatToBulletPoints = (content: string): string => {
  if (!content) return '';
  
  // Process any literal '\n' characters first
  const processedContent = processTextContent(content);
  
  // If content already has bullet points or line breaks, return as is
  if (processedContent.includes('- ') || processedContent.includes('\n')) {
    return processedContent;
  }
  
  // Split by periods followed by space and create bullet points
  const items = processedContent.split(/\.\s+/).filter(item => item.trim());
  
  if (items.length <= 1) {
    return processedContent;
  }
  
  return items.map(item => {
    // Ensure item ends with period if it doesn't already
    const formattedItem = item.trim();
    return `- ${formattedItem}${formattedItem.endsWith('.') ? '' : '.'}`;
  }).join('\n');
};

interface SummaryTableContentProps {
  summary: SummaryResult;
}

const SummaryTableContent: React.FC<SummaryTableContentProps> = ({ summary }) => {
  // Try to parse the markdown table first
  let tableData = parseMarkdownTable(summary.markdown);
  
  // If we couldn't get structured data from the markdown table, fall back to the industryUseCases array
  const useCases = tableData.length > 0 
    ? tableData 
    : summary.industryUseCases.map(useCase => {
        const { industry, useCase: useCaseText } = parseIndustryUseCase(useCase);
        return { 
          industry, 
          useCase: formatToBulletPoints(useCaseText),
          benefits: '', // No benefits available in the fallback format
          productFeature: ''
        };
      });

  // Add bullet points to use cases and benefits if needed
  const formattedUseCases = useCases.map(row => ({
    ...row,
    useCase: formatToBulletPoints(row.useCase),
    benefits: formatToBulletPoints(row.benefits)
  }));

  // Enhance table styling
  const tableCellStyle = {
    borderRight: '1px solid rgba(224, 224, 224, 1)', 
    borderBottom: '1px solid rgba(224, 224, 224, 1)',
    padding: '12px 16px',
    verticalAlign: 'top'
  };
  
  const tableHeaderStyle = {
    ...tableCellStyle,
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold'
  };

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
        <Table aria-label="industry use cases table">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...tableHeaderStyle, width: '15%' }}>Industry</TableCell>
              <TableCell sx={{ ...tableHeaderStyle, width: '30%' }}>Use Case</TableCell>
              {tableData.length > 0 && (
                <>
                  <TableCell sx={{ ...tableHeaderStyle, width: '30%' }}>Benefits / ROI</TableCell>
                  <TableCell sx={{ ...tableHeaderStyle, width: '25%', borderRight: 'none' }}>Product Feature</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {formattedUseCases.map((row, index) => (
              <TableRow 
                key={index}
                sx={{ '&:nth-of-type(odd)': { backgroundColor: 'rgba(0, 0, 0, 0.02)' } }}
              >
                <TableCell sx={tableCellStyle}>
                  <MarkdownCell content={row.industry} />
                </TableCell>
                <TableCell sx={tableCellStyle}>
                  <MarkdownCell content={row.useCase} />
                </TableCell>
                {tableData.length > 0 && (
                  <>
                    <TableCell sx={tableCellStyle}>
                      <MarkdownCell content={row.benefits} />
                    </TableCell>
                    <TableCell sx={{ ...tableCellStyle, borderRight: 'none' }}>
                      <MarkdownCell content={row.productFeature} />
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SummaryTableContent; 