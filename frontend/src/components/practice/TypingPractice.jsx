import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { typingAPI, documentsAPI } from '../../services/api';
import { 
  emitTypingProgress, 
  emitTypingError, 
  emitSessionComplete,
  subscribeToTypingStats,
  unsubscribeFromEvent
} from '../../services/socket';
import { progressAPI } from '../../services/api';

const TypingPractice = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  
  // State for document
  const [document, setDocument] = useState(null);
  const [text, setText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for typing
  const [input, setInput] = useState('');
  const [currentPosition, setCurrentPosition] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  
  // State for stats
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const [completed, setCompleted] = useState(false);
  
  // Refs
  const inputRef = useRef(null);
  const textContainerRef = useRef(null);
  
  // Fetch document and start session
  useEffect(() => {
    const fetchDocumentAndStartSession = async () => {
      try {
        setIsLoading(true);
        
        // Fetch document metadata
        const docResponse = await documentsAPI.getDocument(documentId);
        setDocument(docResponse.data.document);
        setTotalPages(docResponse.data.document.page_count || 1);
        
        // Check if content is already available in the document response
        if (docResponse.data.document.content) {
          setText(docResponse.data.document.content);
        } else {
          // Fetch specific page content if not available
          await fetchPageContent(currentPage);
        }
        
        // Check and update user streak
        await progressAPI.checkStreak();
        
        // Start typing session
        const sessionResponse = await typingAPI.startSession();
        setSessionId(sessionResponse.data.sessionId);
        
      } catch (error) {
        console.error('Error fetching document or starting session:', error);
        navigate('/documents');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocumentAndStartSession();
    
    // Clean up function
    return () => {
      if (sessionId && !completed) {
        // If navigating away without completing, update session stats
        updateSession();
      }
    };
  }, [documentId, navigate]);
  
  // Function to fetch content for a specific page
  const fetchPageContent = async (pageNum) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/documents/${documentId}/page/${pageNum}`);
      const data = await response.json();
      
      if (data.content) {
        setText(data.content);
        setCurrentPage(data.pageNumber);
        setTotalPages(data.totalPages);
      } else {
        setText('Error loading document content. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching page content:', error);
      setText('Error loading document content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Change to a different page
  const changePage = async (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    
    // Reset typing state
    setInput('');
    setCurrentPosition(0);
    setStartTime(null);
    setWpm(0);
    setAccuracy(100);
    setErrors(0);
    setCompleted(false);
    
    // Update session if in progress
    if (sessionId && startTime) {
      await updateSession();
      
      // Start a new session for the new page
      try {
        const sessionResponse = await typingAPI.startSession();
        setSessionId(sessionResponse.data.sessionId);
      } catch (error) {
        console.error('Error starting new session:', error);
      }
    }
    
    // Fetch new page content
    await fetchPageContent(newPage);
    
    // Focus input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // Subscribe to socket events
  useEffect(() => {
    const handleTypingStats = (data) => {
      // Socket could provide updated stats from server
      console.log('Received typing stats:', data);
    };
    
    subscribeToTypingStats(handleTypingStats);
    
    return () => {
      unsubscribeFromEvent('typing_stats', handleTypingStats);
    };
  }, []);
  
  // Focus input when ready
  useEffect(() => {
    if (text && inputRef.current && !startTime && !isLoading) {
      inputRef.current.focus();
    }
  }, [text, startTime, isLoading]);
  
  // Scroll text into view as user types
  useEffect(() => {
    if (textContainerRef.current && currentPosition > 0) {
      const textElement = textContainerRef.current;
      const currentChar = textElement.querySelector(`.char-${currentPosition}`);
      
      if (currentChar) {
        currentChar.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentPosition]);
  
  // Handle typing
  const handleInputChange = (e) => {
    if (completed) return;
    
    const value = e.target.value;
    
    // Start timer on first keystroke
    if (!startTime) {
      setStartTime(Date.now());
    }
    
    // Calculate stats in real-time
    calculateStats(value);
    
    // Update input
    setInput(value);
    
    // Check for completion
    if (value.length === text.length) {
      completeSession();
    }
  };
  
  // Calculate typing statistics
  const calculateStats = (currentInput) => {
    if (!startTime) return;
    
    // Words per minute calculation
    const timeElapsed = (Date.now() - startTime) / 1000 / 60; // in minutes
    const wordsTyped = currentInput.length / 5; // average word length is 5 characters
    const currentWpm = Math.round(wordsTyped / timeElapsed);
    
    // Count errors
    let errorCount = 0;
    for (let i = 0; i < currentInput.length; i++) {
      if (currentInput[i] !== text[i]) {
        errorCount++;
        
        // Emit typing error for new errors
        if (i === currentInput.length - 1) {
          emitTypingError({
            sessionId,
            errorContent: currentInput[i],
            expectedContent: text[i],
            position: i
          });
          
          // Track error in database
          typingAPI.trackError(sessionId, {
            errorContent: currentInput[i],
            expectedContent: text[i],
            position: i
          });
        }
      }
    }
    
    // Update stats
    setErrors(errorCount);
    setCurrentPosition(currentInput.length);
    setWpm(currentWpm || 0);
    setAccuracy(Math.max(0, Math.round(((currentInput.length - errorCount) / currentInput.length) * 100)) || 100);
    
    // Emit progress via socket
    emitTypingProgress({
      sessionId,
      wpm: currentWpm || 0,
      accuracy: (currentInput.length - errorCount) / currentInput.length,
      progress: currentInput.length / text.length,
      currentTime: Date.now() - startTime
    });
    
    // Update session in database every 5 seconds
    if (timeElapsed > 0 && Math.round(timeElapsed * 60) % 5 === 0) {
      updateSession();
    }
  };
  
  // Update session in database
  const updateSession = async () => {
    if (!sessionId) return;
    
    try {
      await typingAPI.updateSession(sessionId, {
        wpm,
        accuracy: accuracy / 100,
        duration: Math.round((Date.now() - startTime) / 1000)
      });
    } catch (error) {
      console.error('Error updating session:', error);
    }
  };
  
  // Complete typing session
  const completeSession = async () => {
    if (!sessionId || completed) return;
    
    try {
      setCompleted(true);
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      // Update session as completed
      await typingAPI.completeSession(sessionId, {
        wpm,
        accuracy: accuracy / 100,
        duration
      });
      
      // Emit completion via socket
      emitSessionComplete({
        sessionId,
        wpm,
        accuracy: accuracy / 100,
        duration
      });
      
      // If we're not on the last page, show option to continue to next page
      if (currentPage < totalPages) {
        // Show completion message with option to continue
      }
      
    } catch (error) {
      console.error('Error completing session:', error);
    }
  };
  
  // Restart typing practice
  const handleRestart = async () => {
    try {
      // Start new session
      const sessionResponse = await typingAPI.startSession();
      
      // Reset state
      setInput('');
      setCurrentPosition(0);
      setStartTime(null);
      setWpm(0);
      setAccuracy(100);
      setErrors(0);
      setCompleted(false);
      setSessionId(sessionResponse.data.sessionId);
      
      // Focus input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error('Error restarting session:', error);
    }
  };
  
  // Render character with correct styling
  const renderCharacter = (char, index) => {
    let className = `char-${index} `;
    
    if (index < currentPosition) {
      className += input[index] === char ? 'correct-char' : 'incorrect-char';
    } else if (index === currentPosition) {
      className += 'current-char';
    }
    
    return (
      <span key={index} className={className}>
        {char}
      </span>
    );
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-border text-blue-500" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }
  
  if (!document || !text) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error loading document</div>
          <button
            onClick={() => navigate('/documents')}
            className="btn btn-primary"
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{document.title}</h1>
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Practice your typing skills on this document</p>
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => changePage(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => changePage(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
                className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Stats Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-8 flex justify-between items-center">
        <div className="text-center px-4">
          <p className="text-sm text-gray-600">WPM</p>
          <p className="text-2xl font-bold text-blue-600">{wpm}</p>
        </div>
        <div className="text-center px-4">
          <p className="text-sm text-gray-600">Accuracy</p>
          <p className="text-2xl font-bold text-green-600">{accuracy}%</p>
        </div>
        <div className="text-center px-4">
          <p className="text-sm text-gray-600">Errors</p>
          <p className="text-2xl font-bold text-red-600">{errors}</p>
        </div>
        <div className="text-center px-4">
          <p className="text-sm text-gray-600">Progress</p>
          <p className="text-2xl font-bold text-purple-600">
            {text ? Math.round((currentPosition / text.length) * 100) : 0}%
          </p>
        </div>
        <div className="text-center px-4">
          <p className="text-sm text-gray-600">Time</p>
          <p className="text-2xl font-bold text-yellow-600">
            {startTime ? Math.round((Date.now() - startTime) / 1000) : 0}s
          </p>
        </div>
      </div>
      
      {/* Text Display */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div 
          ref={textContainerRef}
          className="font-mono text-lg leading-relaxed mb-4 h-40 overflow-y-auto"
        >
          {text.split('').map(renderCharacter)}
        </div>
        
        {/* Input Field */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            className="w-full p-4 border-2 border-blue-300 rounded-md font-mono text-lg"
            value={input}
            onChange={handleInputChange}
            placeholder="Start typing here..."
            disabled={completed}
          />
          {completed && (
            <div className="absolute inset-0 bg-green-100 bg-opacity-90 flex items-center justify-center rounded-md">
              <div className="text-center">
                <p className="text-xl font-bold text-green-800 mb-2">Completed!</p>
                <div className="flex justify-center space-x-4">
                  <button 
                    onClick={handleRestart} 
                    className="btn btn-primary"
                  >
                    Practice Again
                  </button>
                  {currentPage < totalPages && (
                    <button 
                      onClick={() => changePage(currentPage + 1)} 
                      className="btn btn-secondary"
                    >
                      Next Page
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-between">
        <button 
          onClick={() => navigate('/documents')} 
          className="btn btn-secondary"
        >
          Back to Documents
        </button>
        <button 
          onClick={handleRestart} 
          className="btn btn-primary"
          disabled={!completed && !startTime}
        >
          {!startTime ? 'Start Typing' : 'Restart'}
        </button>
      </div>
    </div>
  );
};

export default TypingPractice;

 