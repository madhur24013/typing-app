import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import TypingPractice from './components/TypingPractice';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className="App">
          <header className="App-header" style={{ minHeight: '20vh' }}>
            <h1>Welcome to Typing App</h1>
            <p>Practice and improve your typing speed</p>
          </header>
          <main style={{ padding: '2rem' }}>
            <Routes>
              <Route path="/" element={<TypingPractice />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App; 