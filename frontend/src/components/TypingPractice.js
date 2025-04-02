import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, LinearProgress } from '@mui/material';
import { Refresh, Timer, Speed, Check } from '@mui/icons-material';

const DEFAULT_TEXT = "Select a text from above or start typing this sample text to practice your typing speed.";

const TypingPractice = ({ text = DEFAULT_TEXT }) => {
  const [userInput, setUserInput] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [isFinished, setIsFinished] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    // Reset when text changes
    setUserInput('');
    setStartTime(null);
    setWpm(0);
    setAccuracy(100);
    setIsFinished(false);
    setProgress(0);
    inputRef.current?.focus();
  }, [text]);

  useEffect(() => {
    if (userInput.length === 1 && !startTime) {
      setStartTime(Date.now());
    }

    if (userInput.length === text.length) {
      calculateResults();
    }

    // Calculate live stats
    if (startTime && !isFinished) {
      calculateResults();
    }

    // Update progress
    setProgress((userInput.length / text.length) * 100);
  }, [userInput, text]);

  const calculateResults = () => {
    if (!startTime) return;

    const timeElapsed = (Date.now() - startTime) / 1000 / 60; // in minutes
    const wordsTyped = userInput.length / 5; // standard word length
    const currentWpm = Math.round(wordsTyped / timeElapsed);

    let correctChars = 0;
    for (let i = 0; i < userInput.length; i++) {
      if (userInput[i] === text[i]) correctChars++;
    }
    const currentAccuracy = Math.round((correctChars / userInput.length) * 100);

    setWpm(currentWpm);
    setAccuracy(currentAccuracy);

    if (userInput.length === text.length) {
      setIsFinished(true);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (!isFinished) {
      setUserInput(value);
    }
  };

  const restart = () => {
    setUserInput('');
    setStartTime(null);
    setWpm(0);
    setAccuracy(100);
    setIsFinished(false);
    setProgress(0);
    inputRef.current?.focus();
  };

  const renderText = () => {
    return text.split('').map((char, index) => {
      let color;
      if (index < userInput.length) {
        color = char === userInput[index] ? '#4caf50' : '#f44336';
      }
      return (
        <span
          key={index}
          style={{
            color,
            backgroundColor: index === userInput.length ? '#e3f2fd' : 'transparent',
            padding: '0 1px',
          }}
        >
          {char}
        </span>
      );
    });
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Practice Text
        </Typography>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Speed color="primary" />
            <Typography>{wpm} WPM</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Check color="success" />
            <Typography>{accuracy}%</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={restart}
            size="small"
          >
            Restart
          </Button>
        </Box>
      </Box>

      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{ mb: 2, height: 8, borderRadius: 4 }}
      />

      <Box sx={{ 
        fontSize: '1.2rem', 
        mb: 3, 
        lineHeight: 1.8,
        p: 2,
        backgroundColor: '#f5f5f5',
        borderRadius: 1
      }}>
        {renderText()}
      </Box>

      <input
        ref={inputRef}
        type="text"
        value={userInput}
        onChange={handleInputChange}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '1.1rem',
          marginBottom: '16px',
          borderRadius: '4px',
          border: '1px solid #ccc',
        }}
        placeholder="Start typing here..."
        autoFocus
      />
    </Box>
  );
};

export default TypingPractice; 