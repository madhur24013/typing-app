import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  LinearProgress,
  IconButton,
  Tooltip,
  Chip,
  useTheme,
  useMediaQuery,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Refresh,
  Speed,
  Timer,
  Keyboard,
  TrendingUp,
  EmojiEvents,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/TypingArena.css';

const TypingArena = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [text, setText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [time, setTime] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const [difficulty, setDifficulty] = useState('medium');
  const [isPaused, setIsPaused] = useState(false);
  const inputRef = useRef(null);

  const sampleTexts = {
    easy: "The quick brown fox jumps over the lazy dog. This is a simple text for beginners to practice typing.",
    medium: "Programming is the art of telling another human what one wants the computer to do. It's about solving problems and creating solutions.",
    hard: "Theoretical computer science is a subset of general computer science and mathematics that focuses on more abstract or mathematical aspects of computing."
  };

  useEffect(() => {
    setText(sampleTexts[difficulty]);
    setUserInput('');
    setTime(0);
    setWpm(0);
    setAccuracy(100);
    setErrors(0);
    setIsTyping(false);
    setIsPaused(false);
  }, [difficulty]);

  useEffect(() => {
    let interval;
    if (isTyping && !isPaused) {
      interval = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTyping, isPaused]);

  useEffect(() => {
    if (userInput.length > 0 && !isTyping) {
      setIsTyping(true);
    }
  }, [userInput, isTyping]);

  useEffect(() => {
    if (userInput.length === text.length) {
      setIsTyping(false);
      // Calculate final stats
      const timeInMinutes = time / 60;
      const wordsTyped = text.split(' ').length;
      const calculatedWpm = Math.round(wordsTyped / timeInMinutes);
      setWpm(calculatedWpm);
    }
  }, [userInput, text, time]);

  const handleInputChange = (e) => {
    const input = e.target.value;
    setUserInput(input);
    
    // Calculate accuracy
    let correctChars = 0;
    for (let i = 0; i < input.length; i++) {
      if (input[i] === text[i]) correctChars++;
    }
    const newAccuracy = Math.round((correctChars / input.length) * 100) || 100;
    setAccuracy(newAccuracy);
    
    // Calculate errors
    const newErrors = input.split('').filter((char, i) => char !== text[i]).length;
    setErrors(newErrors);
  };

  const handleReset = () => {
    setUserInput('');
    setTime(0);
    setWpm(0);
    setAccuracy(100);
    setErrors(0);
    setIsTyping(false);
    setIsPaused(false);
    inputRef.current?.focus();
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box className={`typing-arena ${theme.palette.mode === 'dark' ? 'dark' : ''}`}>
      <Grid container spacing={3}>
        {/* Stats Panel */}
        <Grid item xs={12} md={4}>
          <Paper className="stats-panel" sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Performance Stats
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box className="stat-card">
                  <Speed className="stat-icon" sx={{ color: 'primary.main' }} />
                  <Typography className="stat-value">{wpm}</Typography>
                  <Typography className="stat-label">WPM</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box className="stat-card">
                  <Timer className="stat-icon" sx={{ color: 'secondary.main' }} />
                  <Typography className="stat-value">{formatTime(time)}</Typography>
                  <Typography className="stat-label">Time</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box className="stat-card">
                  <TrendingUp className="stat-icon" sx={{ color: 'success.main' }} />
                  <Typography className="stat-value">{accuracy}%</Typography>
                  <Typography className="stat-label">Accuracy</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box className="stat-card">
                  <Keyboard className="stat-icon" sx={{ color: 'error.main' }} />
                  <Typography className="stat-value">{errors}</Typography>
                  <Typography className="stat-label">Errors</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          <Paper className="settings-panel" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Settings
            </Typography>
            <FormControl className="difficulty-select" fullWidth sx={{ mb: 2 }}>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={difficulty}
                label="Difficulty"
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <MenuItem value="easy">Easy</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="hard">Hard</MenuItem>
              </Select>
            </FormControl>
            <Box className="action-buttons">
              <Button
                className="action-button"
                variant="contained"
                startIcon={isPaused ? <PlayArrow /> : <Pause />}
                onClick={handlePause}
                fullWidth
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button
                className="action-button"
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleReset}
                fullWidth
              >
                Reset
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Typing Area */}
        <Grid item xs={12} md={8}>
          <Paper className="typing-area" sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Typing Challenge
              </Typography>
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${(userInput.length / text.length) * 100}%` }}
                />
              </div>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography className="typing-text">
                {text.split('').map((char, index) => (
                  <span
                    key={index}
                    className={userInput[index] === undefined
                      ? ''
                      : userInput[index] === char
                      ? 'correct'
                      : 'incorrect'}
                  >
                    {char}
                  </span>
                ))}
              </Typography>
            </Box>

            <Box>
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={handleInputChange}
                className="typing-input"
                placeholder="Start typing..."
                disabled={isPaused}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TypingArena; 