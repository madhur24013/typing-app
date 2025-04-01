import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnimatePresence } from 'framer-motion';
import AnimatedStreakCounter from '../AnimatedStreakCounter';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>
  },
  AnimatePresence: ({ children }) => <div>{children}</div>
}));

describe('AnimatedStreakCounter', () => {
  it('renders streak count correctly', () => {
    render(<AnimatedStreakCounter streak={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows label when showLabel is true', () => {
    render(<AnimatedStreakCounter streak={5} showLabel />);
    expect(screen.getByText('Day Streak')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<AnimatedStreakCounter streak={5} size="small" />);
    expect(screen.getByText('5').parentElement).toHaveClass('text-sm');

    rerender(<AnimatedStreakCounter streak={5} size="medium" />);
    expect(screen.getByText('5').parentElement).toHaveClass('text-lg');

    rerender(<AnimatedStreakCounter streak={5} size="large" />);
    expect(screen.getByText('5').parentElement).toHaveClass('text-2xl');
  });

  it('shows danger state when streak is in danger', () => {
    render(<AnimatedStreakCounter streak={5} danger hoursRemaining={2} />);
    expect(screen.getByText('2h')).toBeInTheDocument();
  });

  it('shows rank when showRank is true', () => {
    render(<AnimatedStreakCounter streak={5} showRank />);
    expect(screen.getByText('Rookie')).toBeInTheDocument();
  });

  it('updates display when streak changes', () => {
    const { rerender } = render(<AnimatedStreakCounter streak={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();

    rerender(<AnimatedStreakCounter streak={6} />);
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('handles hover state correctly', () => {
    render(<AnimatedStreakCounter streak={5} />);
    const counter = screen.getByText('5').parentElement;
    
    fireEvent.mouseEnter(counter);
    expect(counter).toHaveClass('scale-110');

    fireEvent.mouseLeave(counter);
    expect(counter).not.toHaveClass('scale-110');
  });
}); 