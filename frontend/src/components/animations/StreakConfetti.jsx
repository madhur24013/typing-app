import { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';

/**
 * StreakConfetti component
 * Displays celebratory confetti animations for streak milestones and achievements
 * Uses canvas-confetti library for performant particle animations
 * 
 * @param {Object} props
 * @param {boolean} props.trigger - Controls when to trigger the confetti animation
 * @param {string} props.type - Type of celebration animation ('milestone', 'achievement', 'streak')
 * @param {number} props.duration - How long the animation should last in milliseconds
 */
const StreakConfetti = ({ 
  trigger = false, 
  type = 'milestone', 
  duration = 3000 
}) => {
  const canvasRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  
  // Different animation presets based on celebration type
  const animationPresets = {
    milestone: {
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#9C27B0', '#673AB7', '#3F51B5', '#2196F3']
    },
    achievement: {
      particleCount: 200,
      spread: 160,
      origin: { y: 0.7 },
      colors: ['#FFC107', '#FF9800', '#FF5722', '#F44336']
    },
    streak: {
      particleCount: 80,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B']
    }
  };

  useEffect(() => {
    // Only activate confetti when triggered
    if (trigger && !isActive) {
      setIsActive(true);
      
      // Create canvas if it doesn't exist
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
        canvasRef.current.style.position = 'fixed';
        canvasRef.current.style.top = '0';
        canvasRef.current.style.left = '0';
        canvasRef.current.style.width = '100%';
        canvasRef.current.style.height = '100%';
        canvasRef.current.style.pointerEvents = 'none';
        canvasRef.current.style.zIndex = '9999';
        document.body.appendChild(canvasRef.current);
      }
      
      // Get confetti instance for this canvas
      const myConfetti = confetti.create(canvasRef.current, { 
        resize: true,
        useWorker: true 
      });
      
      // Get the preset configuration based on type
      const preset = animationPresets[type] || animationPresets.milestone;
      
      // Simple one-shot confetti
      if (type === 'milestone') {
        myConfetti({
          particleCount: preset.particleCount,
          spread: preset.spread,
          origin: preset.origin,
          colors: preset.colors,
          ticks: 200
        });
        
        setTimeout(() => {
          setIsActive(false);
          if (canvasRef.current) {
            document.body.removeChild(canvasRef.current);
            canvasRef.current = null;
          }
        }, duration);
      }
      
      // Achievement confetti (more elaborate)
      else if (type === 'achievement') {
        // First burst
        myConfetti({
          particleCount: preset.particleCount / 2,
          spread: preset.spread,
          origin: preset.origin,
          colors: preset.colors,
          ticks: 300
        });
        
        // Second burst after a delay
        setTimeout(() => {
          myConfetti({
            particleCount: preset.particleCount / 2,
            spread: preset.spread / 1.5,
            origin: { y: 0.7, x: 0.1 },
            colors: preset.colors,
            ticks: 200
          });
        }, 250);
        
        // Third burst after another delay
        setTimeout(() => {
          myConfetti({
            particleCount: preset.particleCount / 2,
            spread: preset.spread / 1.5,
            origin: { y: 0.7, x: 0.9 },
            colors: preset.colors,
            ticks: 200
          });
        }, 500);
        
        setTimeout(() => {
          setIsActive(false);
          if (canvasRef.current) {
            document.body.removeChild(canvasRef.current);
            canvasRef.current = null;
          }
        }, duration);
      }
      
      // Streak confetti (from sides)
      else if (type === 'streak') {
        // Left side
        myConfetti({
          particleCount: preset.particleCount,
          angle: 60,
          spread: preset.spread,
          origin: { x: 0 },
          colors: preset.colors,
          ticks: 200
        });
        
        // Right side
        setTimeout(() => {
          myConfetti({
            particleCount: preset.particleCount,
            angle: 120,
            spread: preset.spread,
            origin: { x: 1 },
            colors: preset.colors,
            ticks: 200
          });
        }, 100);
        
        setTimeout(() => {
          setIsActive(false);
          if (canvasRef.current) {
            document.body.removeChild(canvasRef.current);
            canvasRef.current = null;
          }
        }, duration);
      }
    }
    
    // Cleanup function
    return () => {
      if (canvasRef.current) {
        document.body.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
    };
  }, [trigger, type, duration]);

  // This component doesn't render anything visible
  // It just manages the canvas element added to the body
  return null;
};

export default StreakConfetti; 