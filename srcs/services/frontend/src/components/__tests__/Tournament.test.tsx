/**
 * Tournament Component Tests
 * 
 * Test suite for the Tournament component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Tournament } from '../Tournament';
import { tournamentService } from '../../services/tournamentService';
import { AuthService } from '../../services/authService';

// Mock services
jest.mock('../../services/tournamentService');
jest.mock('../../services/authService');

const mockTournamentService = tournamentService as jest.Mocked<typeof tournamentService>;
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

// Mock tournament data
const mockTournament = {
  id: 1,
  name: 'Test Tournament',
  description: 'A test tournament',
  max_participants: 8,
  status: 'registration' as const,
  tournament_type: 'single_elimination' as const,
  created_by: 1,
  created_at: '2024-01-01T00:00:00Z',
  started_at: null,
  finished_at: null,
  settings: null
};

const mockParticipant = {
  id: 1,
  tournament_id: 1,
  user_id: 1,
  guest_alias: null,
  display_name: 'Test User',
  avatar_url: null,
  joined_at: '2024-01-01T00:00:00Z',
  eliminated_at: null,
  final_rank: null,
  seed: null,
  is_ready: false
};

const mockMatch = {
  id: 1,
  tournament_id: 1,
  round: 1,
  match_number: 1,
  bracket_position: null,
  player1_id: 1,
  player2_id: 2,
  winner_id: null,
  status: 'pending' as const,
  player1_score: 0,
  player2_score: 0,
  game_session_id: null,
  created_at: '2024-01-01T00:00:00Z',
  started_at: null,
  finished_at: null,
  match_data: null
};

const mockStats = {
  total_tournaments: 10,
  active_tournaments: 3,
  completed_tournaments: 5,
  total_participants: 25,
  total_matches: 15
};

describe('Tournament Component', () => {
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockAuthService.getUser.mockReturnValue({ id: 1, username: 'testuser' });
    
    mockTournamentService.listTournaments.mockResolvedValue([mockTournament]);
    mockTournamentService.getTournamentStats.mockResolvedValue(mockStats);
    mockTournamentService.getTournament.mockResolvedValue(mockTournament);
    mockTournamentService.getTournamentParticipants.mockResolvedValue([mockParticipant]);
    mockTournamentService.getTournamentMatches.mockResolvedValue([mockMatch]);
    mockTournamentService.getTournamentBracket.mockResolvedValue([]);
  });

  it('renders tournament list by default', async () => {
    render(<Tournament onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('Tournaments')).toBeInTheDocument();
      expect(screen.getByText('Test Tournament')).toBeInTheDocument();
    });
  });

  it('displays tournament statistics', async () => {
    render(<Tournament onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // Total tournaments
      expect(screen.getByText('3')).toBeInTheDocument();  // Active tournaments
      expect(screen.getByText('5')).toBeInTheDocument();  // Completed tournaments
    });
  });

  it('shows create tournament button', async () => {
    render(<Tournament onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('Create Tournament')).toBeInTheDocument();
    });
  });

  it('navigates to create tournament form', async () => {
    render(<Tournament onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('Create Tournament')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Tournament'));

    await waitFor(() => {
      expect(screen.getByText('Create Tournament')).toBeInTheDocument();
      expect(screen.getByLabelText('Tournament Name *')).toBeInTheDocument();
    });
  });

  it('creates tournament with valid input', async () => {
    const newTournament = { ...mockTournament, id: 2, name: 'New Tournament' };
    mockTournamentService.createTournament.mockResolvedValue(newTournament);

    render(<Tournament onBack={mockOnBack} />);

    // Navigate to create form
    await waitFor(() => {
      expect(screen.getByText('Create Tournament')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Create Tournament'));

    // Fill form
    await waitFor(() => {
      expect(screen.getByLabelText('Tournament Name *')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Tournament Name *'), {
      target: { value: 'New Tournament' }
    });

    // Submit form
    fireEvent.click(screen.getByText('Create Tournament'));

    await waitFor(() => {
      expect(mockTournamentService.createTournament).toHaveBeenCalledWith({
        name: 'New Tournament',
        description: '',
        max_participants: 8,
        tournament_type: 'single_elimination',
        created_by: 1
      });
    });
  });

  it('shows validation error for empty tournament name', async () => {
    render(<Tournament onBack={mockOnBack} />);

    // Navigate to create form
    await waitFor(() => {
      expect(screen.getByText('Create Tournament')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Create Tournament'));

    // Submit form without filling name
    await waitFor(() => {
      expect(screen.getByText('Create Tournament')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Create Tournament'));

    await waitFor(() => {
      expect(screen.getByText('Tournament name is required')).toBeInTheDocument();
    });
  });

  it('navigates to tournament details', async () => {
    render(<Tournament onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('View Details'));

    await waitFor(() => {
      expect(screen.getByText('Test Tournament')).toBeInTheDocument();
      expect(screen.getByText('Participants')).toBeInTheDocument();
    });
  });

  it('shows join tournament form for guest users', async () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);

    render(<Tournament onBack={mockOnBack} />);

    // Navigate to tournament details
    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('View Details'));

    // Click join tournament
    await waitFor(() => {
      expect(screen.getByText('Join Tournament')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Join Tournament'));

    await waitFor(() => {
      expect(screen.getByLabelText('Display Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Guest Alias *')).toBeInTheDocument();
    });
  });

  it('joins tournament with valid input', async () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockTournamentService.joinTournament.mockResolvedValue(mockParticipant);

    render(<Tournament onBack={mockOnBack} />);

    // Navigate to join form
    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('View Details'));

    await waitFor(() => {
      expect(screen.getByText('Join Tournament')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Join Tournament'));

    // Fill form
    await waitFor(() => {
      expect(screen.getByLabelText('Display Name *')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Display Name *'), {
      target: { value: 'Guest Player' }
    });
    fireEvent.change(screen.getByLabelText('Guest Alias *'), {
      target: { value: 'guest123' }
    });

    // Submit form
    fireEvent.click(screen.getByText('Join Tournament'));

    await waitFor(() => {
      expect(mockTournamentService.joinTournament).toHaveBeenCalledWith(1, {
        display_name: 'Guest Player',
        guest_alias: 'guest123',
        avatar_url: ''
      });
    });
  });

  it('starts tournament when enough participants', async () => {
    const activeTournament = { ...mockTournament, status: 'active' as const };
    mockTournamentService.getTournamentParticipants.mockResolvedValue([
      mockParticipant,
      { ...mockParticipant, id: 2, user_id: 2, display_name: 'Player 2' }
    ]);
    mockTournamentService.startTournament.mockResolvedValue();

    render(<Tournament onBack={mockOnBack} />);

    // Navigate to tournament details
    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('View Details'));

    // Click start tournament
    await waitFor(() => {
      expect(screen.getByText('Start Tournament')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Start Tournament'));

    await waitFor(() => {
      expect(mockTournamentService.startTournament).toHaveBeenCalledWith(1);
    });
  });

  it('shows error message when API call fails', async () => {
    mockTournamentService.listTournaments.mockRejectedValue(new Error('API Error'));

    render(<Tournament onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('shows success message when tournament is created', async () => {
    const newTournament = { ...mockTournament, id: 2, name: 'New Tournament' };
    mockTournamentService.createTournament.mockResolvedValue(newTournament);

    render(<Tournament onBack={mockOnBack} />);

    // Navigate to create form
    await waitFor(() => {
      expect(screen.getByText('Create Tournament')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Create Tournament'));

    // Fill and submit form
    await waitFor(() => {
      expect(screen.getByLabelText('Tournament Name *')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Tournament Name *'), {
      target: { value: 'New Tournament' }
    });
    fireEvent.click(screen.getByText('Create Tournament'));

    await waitFor(() => {
      expect(screen.getByText('Tournament created successfully!')).toBeInTheDocument();
    });
  });

  it('clears error and success messages', async () => {
    mockTournamentService.listTournaments.mockRejectedValue(new Error('API Error'));

    render(<Tournament onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });

    // Click close button
    fireEvent.click(screen.getByText('×'));

    await waitFor(() => {
      expect(screen.queryByText('API Error')).not.toBeInTheDocument();
    });
  });

  it('shows loading state during API calls', async () => {
    // Mock a slow API call
    mockTournamentService.listTournaments.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve([mockTournament]), 100))
    );

    render(<Tournament onBack={mockOnBack} />);

    // Should show loading initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  it('handles back navigation correctly', async () => {
    render(<Tournament onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('Back to Game')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Back to Game'));

    expect(mockOnBack).toHaveBeenCalled();
  });
});
