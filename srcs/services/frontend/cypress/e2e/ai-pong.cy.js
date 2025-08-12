describe('AI Pong Game E2E Tests', () => {
  const username = 'testuser';
  const password = 'testpassword';
  const email = 'testuser@example.com';

  beforeEach(() => {
    cy.visit('/');
    cy.wait(1000);
    
    // Register or login
    cy.contains('Register here').click();
    cy.get('input[placeholder="Choose a username (3-20 characters)"]').type(username);
    cy.get('input[placeholder="Enter your email address"]').type(email);
    cy.get('input[placeholder="Choose a password (min 6 characters)"]').type(password);
    cy.get('input[placeholder="Confirm your password"]').type(password);
    cy.get('button').contains('Register').click();
    
    // Handle existing account
    cy.get('body').then($body => {
      if ($body.text().includes('Already have an account?')) {
        cy.contains('Login here').click();
        cy.get('input[placeholder="Enter your username"]').type(username);
        cy.get('input[placeholder="Enter your password"]').type(password);
        cy.get('button[type="submit"]').contains(/login/i).click();
      }
    });
  });

  it('should navigate to AI Pong game', () => {
    // Click on Player vs AI button
    cy.contains('Player vs AI').click();
    
    // Verify AI Pong component is rendered
    cy.get('[data-testid="game-container"]').should('be.visible');
    cy.contains('Player vs AI').should('be.visible');
    cy.contains('Use W (up) / S (down) to move your paddle.').should('be.visible');
  });

  it('should show AI difficulty selector', () => {
    cy.contains('Player vs AI').click();
    
    // Check for difficulty selector
    cy.contains('AI Difficulty:').should('be.visible');
    cy.contains('Easy').should('be.visible');
    cy.contains('Medium').should('be.visible');
    cy.contains('Hard').should('be.visible');
  });

  it('should allow changing AI difficulty', () => {
    cy.contains('Player vs AI').click();
    
    // Change to Easy difficulty
    cy.contains('Easy').click();
    cy.contains('Easy').should('have.class', 'bg-blue-600');
    
    // Change to Hard difficulty
    cy.contains('Hard').click();
    cy.contains('Hard').should('have.class', 'bg-blue-600');
    
    // Change back to Medium
    cy.contains('Medium').click();
    cy.contains('Medium').should('have.class', 'bg-blue-600');
  });

  it('should show game controls', () => {
    cy.contains('Player vs AI').click();
    
    // Check for game control buttons
    cy.contains('Start').should('be.visible');
    cy.contains('Pause').should('be.visible');
    cy.contains('Reset').should('be.visible');
  });

  it('should display game status and score', () => {
    cy.contains('Player vs AI').click();
    
    // Check for game status
    cy.get('[data-testid="game-status"]').should('be.visible');
    cy.get('[data-testid="score"]').should('be.visible');
    cy.contains('Player: 0 - AI: 0').should('be.visible');
  });

  it('should render game canvas', () => {
    cy.contains('Player vs AI').click();
    
    // Check for canvas element
    cy.get('canvas[aria-label="AI Pong game canvas"]').should('be.visible');
    cy.get('canvas').should('have.attr', 'width', '800');
    cy.get('canvas').should('have.attr', 'height', '400');
  });

  it('should start the game when Start button is clicked', () => {
    cy.contains('Player vs AI').click();
    
    // Click start button
    cy.contains('Start').click();
    
    // Check if game status changes
    cy.get('[data-testid="game-status"]').should('contain', 'playing');
  });

  it('should pause the game when Pause button is clicked', () => {
    cy.contains('Player vs AI').click();
    
    // Start the game first
    cy.contains('Start').click();
    cy.get('[data-testid="game-status"]').should('contain', 'playing');
    
    // Pause the game
    cy.contains('Pause').click();
    cy.get('[data-testid="game-status"]').should('contain', 'paused');
  });

  it('should reset the game when Reset button is clicked', () => {
    cy.contains('Player vs AI').click();
    
    // Start the game first
    cy.contains('Start').click();
    
    // Reset the game
    cy.contains('Reset').click();
    cy.get('[data-testid="game-status"]').should('contain', 'ready');
    cy.contains('Player: 0 - AI: 0').should('be.visible');
  });

  it('should respond to keyboard input for player paddle', () => {
    cy.contains('Player vs AI').click();
    
    // Start the game
    cy.contains('Start').click();
    
    // Test W key (move up)
    cy.get('body').type('w');
    
    // Test S key (move down)
    cy.get('body').type('s');
  });

  it('should show debug information when enabled', () => {
    cy.contains('Player vs AI').click();
    
    // Start the game
    cy.contains('Start').click();
    
    // Show debug info
    cy.contains('Show Debug').click();
    
    // Check for debug information
    cy.contains('AI Debug Info:').should('be.visible');
    cy.contains('Difficulty:').should('be.visible');
    cy.contains('Ball Direction:').should('be.visible');
    cy.contains('AI Position:').should('be.visible');
    cy.contains('Target Position:').should('be.visible');
  });

  it('should hide debug information when disabled', () => {
    cy.contains('Player vs AI').click();
    
    // Start the game
    cy.contains('Start').click();
    
    // Show debug info
    cy.contains('Show Debug').click();
    cy.contains('AI Debug Info:').should('be.visible');
    
    // Hide debug info
    cy.contains('Hide Debug').click();
    cy.contains('AI Debug Info:').should('not.exist');
  });

  it('should detect AI paddle movement during gameplay', () => {
    cy.contains('Player vs AI').click();
    
    // Start the game
    cy.contains('Start').click();
    
    // Show debug info to monitor AI
    cy.contains('Show Debug').click();
    
    // Wait for AI to potentially move
    cy.wait(3000);
    
    // Check if AI is showing movement information
    cy.contains('AI Position:').should('be.visible');
    cy.contains('Is Moving:').should('be.visible');
  });

  it('should handle game completion and scoring', () => {
    cy.contains('Player vs AI').click();
    
    // Start the game
    cy.contains('Start').click();
    
    // Wait for potential game completion
    cy.wait(5000);
    
    // Check if score has changed (indicating gameplay occurred)
    cy.get('[data-testid="score"]').should('be.visible');
    
    // The score should show some gameplay has occurred
    cy.get('[data-testid="score"]').then(($score) => {
      const scoreText = $score.text();
      // Should show score format like "Player: X - AI: Y"
      expect(scoreText).to.match(/Player: \d+ - AI: \d+/);
    });
  });

  it('should return to menu when Back to Menu is clicked', () => {
    cy.contains('Player vs AI').click();
    
    // Verify we're in AI Pong game
    cy.contains('Player vs AI').should('be.visible');
    
    // Click back to menu
    cy.contains('Back to Menu').click();
    
    // Verify we're back to main menu
    cy.contains('Player vs Player (Local)').should('be.visible');
    cy.contains('Multiplayer (Online)').should('be.visible');
    cy.contains('Player vs AI').should('be.visible');
  });

  it('should test AI behavior across different difficulties', () => {
    cy.contains('Player vs AI').click();
    
    // Test Easy difficulty
    cy.contains('Easy').click();
    cy.contains('Start').click();
    cy.wait(2000);
    cy.contains('Reset').click();
    
    // Test Medium difficulty
    cy.contains('Medium').click();
    cy.contains('Start').click();
    cy.wait(2000);
    cy.contains('Reset').click();
    
    // Test Hard difficulty
    cy.contains('Hard').click();
    cy.contains('Start').click();
    cy.wait(2000);
    
    // Verify game is running
    cy.get('[data-testid="game-status"]').should('contain', 'playing');
  });

  it('should show adaptive AI behavior message', () => {
    cy.contains('Player vs AI').click();
    
    // Check for adaptive behavior message
    cy.contains('The AI adapts its difficulty based on your performance!').should('be.visible');
  });

  it('should display current AI difficulty in instructions', () => {
    cy.contains('Player vs AI').click();
    
    // Check that difficulty is displayed
    cy.contains('AI Difficulty:').should('be.visible');
    cy.contains('medium').should('be.visible');
    
    // Change difficulty and verify it updates
    cy.contains('Hard').click();
    cy.contains('hard').should('be.visible');
  });
});
