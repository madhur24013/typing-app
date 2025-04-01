import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { AnimatePresence } from 'framer-motion';
import StreakBattles from '../StreakBattles';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  getActiveBattles, 
  getPendingBattles, 
  createBattle, 
  respondToBattle,
  trackStreakEvent
} from '../../../services/streakService';

// Mock dependencies
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../services/streakService');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }) => children
}));

describe('StreakBattles Component', () => {
  const mockUser = {
    id: 1,
    name: 'Test User'
  };

  const mockActiveBattles = [
    {
      id: 1,
      challenger_id: 1,
      challenger_name: 'Test User',
      opponent_id: 2,
      opponent_name: 'Friend 1',
      challenger_streak: 5,
      opponent_streak: 3,
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const mockPendingBattles = [
    {
      id: 2,
      challenger_id: 2,
      challenger_name: 'Friend 2',
      opponent_id: 1,
      opponent_name: 'Test User',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      xp_reward: 100
    }
  ];

  const mockFriends = [
    {
      id: 2,
      name: 'Friend 1',
      currentStreak: 3
    },
    {
      id: 3,
      name: 'Friend 2',
      currentStreak: 5
    }
  ];

  beforeEach(() => {
    useAuth.mockReturnValue({ user: mockUser });
    getActiveBattles.mockResolvedValue(mockActiveBattles);
    getPendingBattles.mockResolvedValue(mockPendingBattles);
    createBattle.mockResolvedValue({ id: 3, ...mockActiveBattles[0] });
    respondToBattle.mockResolvedValue({ success: true });
    trackStreakEvent.mockResolvedValue({ success: true });
    
    // Mock fetch for friends list
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ friends: mockFriends })
      })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<StreakBattles />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders active battles correctly', async () => {
    render(<StreakBattles />);
    
    await waitFor(() => {
      expect(screen.getByText('Active Challenges')).toBeInTheDocument();
      expect(screen.getByText('Friend 1')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('renders pending battles correctly', async () => {
    render(<StreakBattles />);
    
    await waitFor(() => {
      expect(screen.getByText('Pending Challenges')).toBeInTheDocument();
      expect(screen.getByText('Challenge from Friend 2')).toBeInTheDocument();
      expect(screen.getByText('Accept')).toBeInTheDocument();
      expect(screen.getByText('Decline')).toBeInTheDocument();
    });
  });

  it('opens new battle modal when clicking challenge button', async () => {
    render(<StreakBattles />);
    
    await waitFor(() => {
      expect(screen.getByText('Challenge Friend')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Challenge Friend'));
    
    expect(screen.getByText('Select an opponent')).toBeInTheDocument();
    expect(screen.getByText('Friend 1')).toBeInTheDocument();
    expect(screen.getByText('Friend 2')).toBeInTheDocument();
  });

  it('creates new battle when selecting friend and duration', async () => {
    render(<StreakBattles />);
    
    await waitFor(() => {
      expect(screen.getByText('Challenge Friend')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Challenge Friend'));
    fireEvent.click(screen.getByText('Friend 1'));
    
    const durationInput = screen.getByRole('slider');
    fireEvent.change(durationInput, { target: { value: '7' } });
    
    fireEvent.click(screen.getByText('Challenge'));
    
    await waitFor(() => {
      expect(createBattle).toHaveBeenCalledWith(2, 7);
      expect(trackStreakEvent).toHaveBeenCalledWith('streak_battle_created', {
        opponentId: 2,
        duration: 7
      });
    });
  });

  it('handles battle response correctly', async () => {
    render(<StreakBattles />);
    
    await waitFor(() => {
      expect(screen.getByText('Accept')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Accept'));
    
    await waitFor(() => {
      expect(respondToBattle).toHaveBeenCalledWith(2, true);
      expect(trackStreakEvent).toHaveBeenCalledWith('streak_battle_response', {
        battleId: 2,
        accepted: true
      });
    });
  });

  it('handles errors gracefully', async () => {
    getActiveBattles.mockRejectedValue(new Error('Failed to load battles'));
    
    render(<StreakBattles />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load battles')).toBeInTheDocument();
    });
  });

  it('shows empty state when no battles exist', async () => {
    getActiveBattles.mockResolvedValue([]);
    getPendingBattles.mockResolvedValue([]);
    
    render(<StreakBattles />);
    
    await waitFor(() => {
      expect(screen.getByText(/No active streak battles/)).toBeInTheDocument();
    });
  });

  it('handles friend selection and duration changes', async () => {
    render(<StreakBattles />);
    
    await waitFor(() => {
      expect(screen.getByText('Challenge Friend')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Challenge Friend'));
    
    const friendOption = screen.getByText('Friend 1');
    fireEvent.click(friendOption);
    
    expect(screen.getByText('7 days')).toBeInTheDocument();
    
    const durationInput = screen.getByRole('slider');
    fireEvent.change(durationInput, { target: { value: '14' } });
    
    expect(screen.getByText('14 days')).toBeInTheDocument();
  });

  it('disables challenge button when no friends available', async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ friends: [] })
      })
    );
    
    render(<StreakBattles />);
    
    await waitFor(() => {
      const challengeButton = screen.getByText('Challenge Friend');
      expect(challengeButton).toBeDisabled();
    });
  });
}); 