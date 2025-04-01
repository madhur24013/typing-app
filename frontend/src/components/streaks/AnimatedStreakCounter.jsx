import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFire } from 'react-icons/fa';
import { GiFireRing } from 'react-icons/gi';
import { RiFireLine, RiFireFill } from 'react-icons/ri';
import PropTypes from 'prop-types';

/**
 * AnimatedStreakCounter - A visually appealing streak counter with animations
 * that change based on streak length, with microinteractions to increase engagement
 */
const AnimatedStreakCounter = ({ 
  streak = 0, 
  showLabel = true, 
  size = 'medium',
  pulseOnMount = true,
  showRank = true,
  danger = false,
  hoursRemaining = null,
  className = ''
}) => {
  const [displayStreak, setDisplayStreak] = useState(streak);
  const [prevStreak, setPrevStreak] = useState(streak);
  const [animate, setAnimate] = useState(pulseOnMount);
  const [hovered, setHovered] = useState(false);
  const intervalRef = useRef(null);
  
  // Size classes
  const sizeClasses = {
    small: {
      container: 'text-sm',
      icon: 'text-lg',
      number: 'text-lg font-bold',
      label: 'text-xs'
    },
    medium: {
      container: 'text-base',
      icon: 'text-2xl',
      number: 'text-2xl font-bold',
      label: 'text-sm'
    },
    large: {
      container: 'text-lg',
      icon: 'text-4xl',
      number: 'text-4xl font-bold',
      label: 'text-base'
    }
  };
  
  // Color and effects based on streak
  const getStreakStyle = () => {
    if (danger) return "text-red-500";
    if (streak >= 365) return "text-purple-600 dark:text-purple-400"; // Legendary
    if (streak >= 100) return "text-blue-500 dark:text-blue-300"; // Diamond
    if (streak >= 30) return "text-yellow-500 dark:text-yellow-400"; // Gold
    if (streak >= 10) return "text-gray-400 dark:text-gray-300"; // Silver
    if (streak >= 3) return "text-amber-600 dark:text-amber-500"; // Bronze
    return "text-gray-600 dark:text-gray-400"; // Default
  };

  // Get fire icon based on streak level
  const getStreakIcon = () => {
    if (streak >= 365) return <GiFireRing className={`${sizeClasses[size].icon} ${getStreakStyle()}`} />;
    if (streak >= 100) return <RiFireFill className={`${sizeClasses[size].icon} ${getStreakStyle()}`} />;
    if (streak >= 30) return <FaFire className={`${sizeClasses[size].icon} ${getStreakStyle()}`} />;
    if (streak >= 3) return <RiFireLine className={`${sizeClasses[size].icon} ${getStreakStyle()}`} />;
    return <RiFireLine className={`${sizeClasses[size].icon} ${getStreakStyle()}`} />;
  };
  
  // Get rank label
  const getRankLabel = () => {
    if (streak >= 365) return "Legendary";
    if (streak >= 100) return "Diamond";
    if (streak >= 30) return "Gold";
    if (streak >= 10) return "Silver";
    if (streak >= 3) return "Bronze";
    return "Beginner";
  };
  
  // Animation when the streak updates
  useEffect(() => {
    if (streak !== prevStreak) {
      setPrevStreak(streak);
      setAnimate(true);
      
      // Animate count up/down
      if (displayStreak !== streak) {
        clearInterval(intervalRef.current);
        
        const diff = streak - displayStreak;
        const step = diff > 0 ? 1 : -1;
        const steps = Math.abs(diff);
        let current = 0;
        
        intervalRef.current = setInterval(() => {
          if (current < steps) {
            setDisplayStreak(prev => prev + step);
            current++;
          } else {
            clearInterval(intervalRef.current);
          }
        }, 50);
      }
      
      // Reset animation state after animation completes
      const timer = setTimeout(() => {
        setAnimate(false);
      }, 1000);
      
      return () => {
        clearTimeout(timer);
        clearInterval(intervalRef.current);
      };
    }
  }, [streak, prevStreak, displayStreak]);
  
  // Danger pulse animation for low time remaining
  useEffect(() => {
    if (danger && hoursRemaining !== null && hoursRemaining <= 3) {
      const dangerInterval = setInterval(() => {
        setAnimate(prev => !prev);
      }, hoursRemaining <= 1 ? 800 : 2000);
      
      return () => clearInterval(dangerInterval);
    }
  }, [danger, hoursRemaining]);
  
  return (
    <div 
      className={`flex items-center ${className} ${sizeClasses[size].container}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        animate={{
          scale: animate ? 1.2 : 1,
          rotate: animate ? [0, -10, 10, -5, 5, 0] : 0
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 10,
          duration: 0.5
        }}
        className="relative"
      >
        {getStreakIcon()}
        
        {/* Pulse effect */}
        <AnimatePresence>
          {animate && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0.8 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={`absolute inset-0 rounded-full ${getStreakStyle()} z-0`}
              style={{ 
                background: `radial-gradient(circle, ${streak >= 100 ? '#3b82f680' : streak >= 30 ? '#eab30880' : '#9a3412'} 0%, transparent 70%)` 
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
      
      <div className="ml-2 flex flex-col">
        <motion.div 
          className={sizeClasses[size].number}
          animate={{ scale: animate ? 1.1 : 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {displayStreak}
          <span className={`ml-1 ${sizeClasses[size].label} text-gray-500 dark:text-gray-400`}>
            {showLabel && 'day streak'}
          </span>
        </motion.div>
        
        {showRank && (
          <motion.div 
            className={`${sizeClasses[size].label} font-medium ${getStreakStyle()}`}
            animate={{ opacity: hovered ? 1 : 0.8 }}
          >
            {getRankLabel()} Rank
          </motion.div>
        )}
        
        {/* Danger countdown */}
        {danger && hoursRemaining !== null && (
          <motion.div 
            className="text-xs font-medium text-red-500"
            animate={{ opacity: animate ? 1 : 0.7 }}
          >
            {hoursRemaining <= 0 ? (
              <span className="font-bold">LAST CHANCE!</span>
            ) : (
              <span>{hoursRemaining}h left today</span>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

AnimatedStreakCounter.propTypes = {
  streak: PropTypes.number,
  showLabel: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  pulseOnMount: PropTypes.bool,
  showRank: PropTypes.bool,
  danger: PropTypes.bool,
  hoursRemaining: PropTypes.number,
  className: PropTypes.string
};

export default AnimatedStreakCounter; 