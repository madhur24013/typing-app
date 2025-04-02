import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';

const SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog. Practice makes perfect when learning to type quickly and accurately.";

const TypingPractice = () => {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [userInput, setUserInput] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [isFinished, setIsFinished] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (userInput.length === 1 && !startTime) {
      setStartTime(Date.now());
    }

    if (userInput.length === text.length) {
      calculateResults();
    }

    // Calculate live WPM and accuracy
    if (startTime && !isFinished) {
      calculateResults();
    }
  }, [userInput]);

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
    inputRef.current?.focus();
  };

  const renderText = () => {
    return text.split('').map((char, index) => {
      let color;
      if (index < userInput.length) {
        color = char === userInput[index] ? 'green' : 'red';
      }
      return (
        <span
          key={index}
          style={{
            color,
            backgroundColor: index === userInput.length ? '#e3f2fd' : 'transparent',
          }}
        >
          {char}
        </span>
      );
    });
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Type the text below:
        </Typography>
        <Box sx={{ fontSize: '1.2rem', mb: 3, lineHeight: 1.8 }}>
          {renderText()}
        </Box>
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={handleInputChange}
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '1.1rem',
            marginBottom: '16px',
          }}
          autoFocus
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography>WPM: {wpm}</Typography>
          <Typography>Accuracy: {accuracy}%</Typography>
        </Box>
        <Button variant="contained" onClick={restart}>
          Restart
        </Button>
      </Paper>
    </Box>
  );
};

export default TypingPractice; 