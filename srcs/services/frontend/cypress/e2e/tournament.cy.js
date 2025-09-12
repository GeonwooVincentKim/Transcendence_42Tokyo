/**
 * Tournament E2E Tests
 * 
 * End-to-end tests for tournament functionality
 */

describe('Tournament System', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/');
    
    // Wait for the application to load
    cy.get('[data-testid="app"]').should('be.visible');
  });

  describe('Tournament List View', () => {
    it('should display tournament list', () => {
      // Navigate to tournaments
      cy.get('[data-testid="tournament-button"]').click();
      
      // Check if tournament list is displayed
      cy.get('[data-testid="tournament-list"]').should('be.visible');
      cy.get('h2').should('contain', 'Tournaments');
    });

    it('should show tournament statistics', () => {
      // Navigate to tournaments
      cy.get('[data-testid="tournament-button"]').click();
      
      // Check if stats are displayed
      cy.get('[data-testid="tournament-stats"]').should('be.visible');
      cy.get('[data-testid="total-tournaments"]').should('be.visible');
      cy.get('[data-testid="active-tournaments"]').should('be.visible');
      cy.get('[data-testid="completed-tournaments"]').should('be.visible');
    });

    it('should show create tournament button', () => {
      // Navigate to tournaments
      cy.get('[data-testid="tournament-button"]').click();
      
      // Check if create button is visible
      cy.get('button').should('contain', 'Create Tournament');
    });
  });

  describe('Create Tournament', () => {
    it('should open create tournament form', () => {
      // Navigate to tournaments
      cy.get('[data-testid="tournament-button"]').click();
      
      // Click create tournament button
      cy.get('button').contains('Create Tournament').click();
      
      // Check if form is displayed
      cy.get('h2').should('contain', 'Create Tournament');
      cy.get('input[placeholder="Enter tournament name"]').should('be.visible');
      cy.get('textarea[placeholder="Enter tournament description (optional)"]').should('be.visible');
    });

    it('should create tournament with valid input', () => {
      // Navigate to create form
      cy.get('[data-testid="tournament-button"]').click();
      cy.get('button').contains('Create Tournament').click();
      
      // Fill form
      cy.get('input[placeholder="Enter tournament name"]').type('E2E Test Tournament');
      cy.get('textarea[placeholder="Enter tournament description (optional)"]').type('A tournament created by E2E tests');
      cy.get('input[type="number"]').clear().type('8');
      cy.get('select').select('single_elimination');
      
      // Submit form
      cy.get('button').contains('Create Tournament').click();
      
      // Check for success message
      cy.get('[data-testid="success-message"]').should('contain', 'Tournament created successfully!');
      
      // Should return to tournament list
      cy.get('h2').should('contain', 'Tournaments');
    });

    it('should show validation error for empty name', () => {
      // Navigate to create form
      cy.get('[data-testid="tournament-button"]').click();
      cy.get('button').contains('Create Tournament').click();
      
      // Submit form without filling name
      cy.get('button').contains('Create Tournament').click();
      
      // Check for validation error
      cy.get('[data-testid="error-message"]').should('contain', 'Tournament name is required');
    });

    it('should show validation error for invalid participant count', () => {
      // Navigate to create form
      cy.get('[data-testid="tournament-button"]').click();
      cy.get('button').contains('Create Tournament').click();
      
      // Fill form with invalid participant count
      cy.get('input[placeholder="Enter tournament name"]').type('Test Tournament');
      cy.get('input[type="number"]').clear().type('1');
      
      // Submit form
      cy.get('button').contains('Create Tournament').click();
      
      // Check for validation error
      cy.get('[data-testid="error-message"]').should('contain', 'Tournament must have at least 2 participants');
    });
  });

  describe('Tournament Details', () => {
    beforeEach(() => {
      // Create a tournament first
      cy.get('[data-testid="tournament-button"]').click();
      cy.get('button').contains('Create Tournament').click();
      cy.get('input[placeholder="Enter tournament name"]').type('Test Tournament for Details');
      cy.get('button').contains('Create Tournament').click();
      
      // Wait for success message and return to list
      cy.get('[data-testid="success-message"]').should('be.visible');
    });

    it('should display tournament details', () => {
      // Click view details on the created tournament
      cy.get('button').contains('View Details').click();
      
      // Check if details are displayed
      cy.get('h2').should('contain', 'Test Tournament for Details');
      cy.get('[data-testid="tournament-participants"]').should('be.visible');
      cy.get('h3').should('contain', 'Participants');
    });

    it('should show join tournament button for guest users', () => {
      // Click view details
      cy.get('button').contains('View Details').click();
      
      // Check if join button is visible
      cy.get('button').contains('Join Tournament').should('be.visible');
    });

    it('should open join tournament form', () => {
      // Navigate to tournament details
      cy.get('button').contains('View Details').click();
      
      // Click join tournament
      cy.get('button').contains('Join Tournament').click();
      
      // Check if join form is displayed
      cy.get('h2').should('contain', 'Join Tournament');
      cy.get('input[placeholder="Enter your display name"]').should('be.visible');
      cy.get('input[placeholder="Enter a unique alias"]').should('be.visible');
    });

    it('should join tournament with valid input', () => {
      // Navigate to join form
      cy.get('button').contains('View Details').click();
      cy.get('button').contains('Join Tournament').click();
      
      // Fill join form
      cy.get('input[placeholder="Enter your display name"]').type('E2E Test Player');
      cy.get('input[placeholder="Enter a unique alias"]').type('e2e_test_player');
      
      // Submit form
      cy.get('button').contains('Join Tournament').click();
      
      // Check for success message
      cy.get('[data-testid="success-message"]').should('contain', 'Successfully joined tournament!');
      
      // Should return to tournament details
      cy.get('h2').should('contain', 'Test Tournament for Details');
    });

    it('should show validation error for empty display name', () => {
      // Navigate to join form
      cy.get('button').contains('View Details').click();
      cy.get('button').contains('Join Tournament').click();
      
      // Submit form without filling display name
      cy.get('button').contains('Join Tournament').click();
      
      // Check for validation error
      cy.get('[data-testid="error-message"]').should('contain', 'Display name is required');
    });

    it('should show validation error for invalid guest alias', () => {
      // Navigate to join form
      cy.get('button').contains('View Details').click();
      cy.get('button').contains('Join Tournament').click();
      
      // Fill form with invalid guest alias
      cy.get('input[placeholder="Enter your display name"]').type('Test Player');
      cy.get('input[placeholder="Enter a unique alias"]').type('invalid alias!');
      
      // Submit form
      cy.get('button').contains('Join Tournament').click();
      
      // Check for validation error
      cy.get('[data-testid="error-message"]').should('contain', 'Guest alias can only contain letters, numbers, underscores, and hyphens');
    });
  });

  describe('Tournament Bracket', () => {
    beforeEach(() => {
      // Create and start a tournament with participants
      cy.get('[data-testid="tournament-button"]').click();
      cy.get('button').contains('Create Tournament').click();
      cy.get('input[placeholder="Enter tournament name"]').type('Bracket Test Tournament');
      cy.get('button').contains('Create Tournament').click();
      
      // Wait for success and join tournament
      cy.get('[data-testid="success-message"]').should('be.visible');
      cy.get('button').contains('View Details').click();
      cy.get('button').contains('Join Tournament').click();
      cy.get('input[placeholder="Enter your display name"]').type('Player 1');
      cy.get('input[placeholder="Enter a unique alias"]').type('player1');
      cy.get('button').contains('Join Tournament').click();
      
      // Add more participants (simulate multiple users)
      cy.get('button').contains('Join Tournament').click();
      cy.get('input[placeholder="Enter your display name"]').type('Player 2');
      cy.get('input[placeholder="Enter a unique alias"]').type('player2');
      cy.get('button').contains('Join Tournament').click();
      
      // Start tournament
      cy.get('button').contains('Start Tournament').click();
    });

    it('should display tournament bracket after starting', () => {
      // Check if bracket is displayed
      cy.get('[data-testid="tournament-bracket"]').should('be.visible');
      cy.get('button').contains('View Full Bracket').should('be.visible');
    });

    it('should open full bracket view', () => {
      // Click view full bracket
      cy.get('button').contains('View Full Bracket').click();
      
      // Check if full bracket is displayed
      cy.get('h2').should('contain', 'Bracket Test Tournament - Bracket');
      cy.get('[data-testid="bracket-container"]').should('be.visible');
    });

    it('should show bracket controls', () => {
      // Open bracket view
      cy.get('button').contains('View Full Bracket').click();
      
      // Check if controls are visible
      cy.get('button').contains('+').should('be.visible'); // Zoom in
      cy.get('button').contains('-').should('be.visible'); // Zoom out
      cy.get('button').contains('Reset').should('be.visible');
    });
  });

  describe('Navigation', () => {
    it('should navigate back to game from tournament list', () => {
      // Navigate to tournaments
      cy.get('[data-testid="tournament-button"]').click();
      
      // Click back to game
      cy.get('button').contains('Back to Game').click();
      
      // Should return to main game interface
      cy.get('[data-testid="app"]').should('be.visible');
    });

    it('should navigate back from create form', () => {
      // Navigate to create form
      cy.get('[data-testid="tournament-button"]').click();
      cy.get('button').contains('Create Tournament').click();
      
      // Click back to list
      cy.get('button').contains('Back to List').click();
      
      // Should return to tournament list
      cy.get('h2').should('contain', 'Tournaments');
    });

    it('should navigate back from tournament details', () => {
      // Create and view tournament
      cy.get('[data-testid="tournament-button"]').click();
      cy.get('button').contains('Create Tournament').click();
      cy.get('input[placeholder="Enter tournament name"]').type('Navigation Test');
      cy.get('button').contains('Create Tournament').click();
      cy.get('button').contains('View Details').click();
      
      // Click back to list
      cy.get('button').contains('Back to List').click();
      
      // Should return to tournament list
      cy.get('h2').should('contain', 'Tournaments');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      // Mock API error
      cy.intercept('GET', '/api/tournaments', { statusCode: 500, body: { error: 'Server error' } });
      
      // Navigate to tournaments
      cy.get('[data-testid="tournament-button"]').click();
      
      // Check if error message is displayed
      cy.get('[data-testid="error-message"]').should('contain', 'Server error');
    });

    it('should clear error messages when closed', () => {
      // Mock API error
      cy.intercept('GET', '/api/tournaments', { statusCode: 500, body: { error: 'Server error' } });
      
      // Navigate to tournaments
      cy.get('[data-testid="tournament-button"]').click();
      
      // Check if error is displayed
      cy.get('[data-testid="error-message"]').should('be.visible');
      
      // Click close button
      cy.get('[data-testid="error-message"]').within(() => {
        cy.get('button').contains('×').click();
      });
      
      // Error should be cleared
      cy.get('[data-testid="error-message"]').should('not.exist');
    });
  });

  describe('Loading States', () => {
    it('should show loading state during API calls', () => {
      // Mock slow API response
      cy.intercept('GET', '/api/tournaments', (req) => {
        req.reply((res) => {
          res.delay(1000);
          res.send({ success: true, data: [] });
        });
      });
      
      // Navigate to tournaments
      cy.get('[data-testid="tournament-button"]').click();
      
      // Check if loading is shown
      cy.get('[data-testid="loading-overlay"]').should('be.visible');
      cy.get('[data-testid="loading-overlay"]').should('contain', 'Loading...');
    });
  });
});
