import React from 'react';
import { Box, Card, CardContent, Typography, Grid, Button } from '@mui/material';
import { Description, Code, Book, Article } from '@mui/icons-material';

const categories = [
  {
    title: 'Programming',
    icon: <Code sx={{ fontSize: 40, color: '#2196f3' }} />,
    texts: [
      'function calculateSum(a, b) { return a + b; }',
      'const handleSubmit = async (event) => { event.preventDefault(); }',
      'class Rectangle { constructor(height, width) { this.height = height; this.width = width; } }'
    ]
  },
  {
    title: 'Articles',
    icon: <Article sx={{ fontSize: 40, color: '#4caf50' }} />,
    texts: [
      'The quick brown fox jumps over the lazy dog.',
      'To be or not to be, that is the question.',
      'All that glitters is not gold.'
    ]
  },
  {
    title: 'Documents',
    icon: <Description sx={{ fontSize: 40, color: '#ff9800' }} />,
    texts: [
      'Dear Sir/Madam, I am writing to express my interest in the position.',
      'Thank you for your prompt response to our inquiry.',
      'Please find attached the requested documentation.'
    ]
  },
  {
    title: 'Literature',
    icon: <Book sx={{ fontSize: 40, color: '#9c27b0' }} />,
    texts: [
      'It was the best of times, it was the worst of times.',
      'Call me Ishmael.',
      'In a hole in the ground there lived a hobbit.'
    ]
  }
];

const TextSelection = ({ onSelectText }) => {
  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Select Practice Text
      </Typography>
      <Grid container spacing={3}>
        {categories.map((category, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  {category.icon}
                  <Typography variant="h6" component="div">
                    {category.title}
                  </Typography>
                </Box>
                <Box display="flex" flexDirection="column" gap={1}>
                  {category.texts.map((text, idx) => (
                    <Button
                      key={idx}
                      variant="outlined"
                      size="small"
                      onClick={() => onSelectText(text)}
                      sx={{ textTransform: 'none', justifyContent: 'flex-start' }}
                    >
                      {text.substring(0, 30)}...
                    </Button>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TextSelection; 