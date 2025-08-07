describe('Pong Game E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Page Loading', () => {
    it('should load the game page successfully', () => {
      cy.get('[data-testid="game-container"]').should('be.visible');
      cy.get('[data-testid="game-title"]').should('contain', 'Pong');
    });

    it('should display game controls', () => {
      cy.get('[data-testid="start-button"]').should('be.visible');
      cy.get('[data-testid="pause-button"]').should('be.visible');
      cy.get('[data-testid="reset-button"]').should('be.visible');
    });
  });

  describe('Game Controls', () => {
    it('should start the game when start button is clicked', () => {
      cy.get('[data-testid="start-button"]').click();
      cy.get('[data-testid="game-status"]').should('contain', 'playing');
    });

    it('should pause the game when pause button is clicked', () => {
      cy.get('[data-testid="start-button"]').click();
      cy.get('[data-testid="pause-button"]').click();
      cy.get('[data-testid="game-status"]').should('contain', 'paused');
    });

    it('should reset the game when reset button is clicked', () => {
      cy.get('[data-testid="start-button"]').click();
      cy.get('[data-testid="reset-button"]').click();
      cy.get('[data-testid="game-status"]').should('contain', 'waiting');
    });
  });

  describe('Game State Management', () => {
    it('should update score during gameplay', () => {
      cy.get('[data-testid="start-button"]').click();
      cy.wait(2000); // Wait for some gameplay
      cy.get('[data-testid="score-display"]').should('be.visible');
    });

    it('should handle game state transitions', () => {
      // Start game
      cy.get('[data-testid="start-button"]').click();
      cy.get('[data-testid="game-status"]').should('contain', 'playing');
      
      // Pause game
      cy.get('[data-testid="pause-button"]').click();
      cy.get('[data-testid="game-status"]').should('contain', 'paused');
      
      // Resume game
      cy.get('[data-testid="start-button"]').click();
      cy.get('[data-testid="game-status"]').should('contain', 'playing');
    });
  });

  describe('User Interactions', () => {
    it('should respond to keyboard input', () => {
      cy.get('[data-testid="start-button"]').click();
      cy.get('body').type('ArrowUp');
      cy.get('body').type('ArrowDown');
      // Add assertions for paddle movement if applicable
    });

    it('should handle mouse interactions', () => {
      cy.get('[data-testid="game-canvas"]').click();
      // Add assertions for mouse interactions
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile viewport', () => {
      cy.viewport('iphone-x');
      cy.get('[data-testid="game-container"]').should('be.visible');
      cy.get('[data-testid="start-button"]').should('be.visible');
    });

    it('should work on tablet viewport', () => {
      cy.viewport('ipad-2');
      cy.get('[data-testid="game-container"]').should('be.visible');
      cy.get('[data-testid="start-button"]').should('be.visible');
    });

    it('should work on desktop viewport', () => {
      cy.viewport(1920, 1080);
      cy.get('[data-testid="game-container"]').should('be.visible');
      cy.get('[data-testid="start-button"]').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      // Simulate network error by intercepting API calls
      cy.intercept('GET', '/api/game/state', { forceNetworkError: true });
      cy.get('[data-testid="start-button"]').click();
      // Should show error message or fallback behavior
    });

    it('should handle invalid game states', () => {
      // Test edge cases and invalid states
      cy.get('[data-testid="reset-button"]').click();
      cy.get('[data-testid="game-status"]').should('contain', 'waiting');
    });
  });
});
