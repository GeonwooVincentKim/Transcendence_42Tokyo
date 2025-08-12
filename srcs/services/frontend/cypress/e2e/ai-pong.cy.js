describe('AI Pong Game E2E', () => {
  const username = 'aitestuser';
  const password = 'aitestpassword';
  const email = 'aitestuser@example.com';

  beforeEach(() => {
    // Visit the application
    cy.visit('/');
    cy.wait(1000);
  });

  it('should register and login, then access AI game', () => {
    // Register if needed
    cy.contains('Register here').click();
    cy.get('input[placeholder="Choose a username (3-20 characters)"]').type(username);
    cy.get('input[placeholder="Enter your email address"]').type(email);
    cy.get('input[placeholder="Choose a password (min 6 characters)"]').type(password);
    cy.get('input[placeholder="Confirm your password"]').type(password);
    cy.get('button').contains('Register').click();
    
    // Handle existing account case
    cy.get('body').then($body => {
      if ($body.text().includes('Already have an account?')) {
        cy.contains('Login here').click();
        cy.get('input[placeholder="Enter your username"]').type(username);
        cy.get('input[placeholder="Enter your password"]').type(password);
        cy.get('button[type="submit"]').contains(/login/i).click();
      }
    });
    
    // Verify menu is visible
    cy.contains('Player vs AI').should('be.visible');
  });

  it('should render AI Pong game when selected', () => {
    // Login process
    cy.contains('Register here').click();
    cy.get('input[placeholder="Choose a username (3-20 characters)"]').type(username);
    cy.get('input[placeholder="Enter your email address"]').type(email);
    cy.get('input[placeholder="Choose a password (min 6 characters)"]').type(password);
    cy.get('input[placeholder="Confirm your password"]').type(password);
    cy.get('button').contains('Register').click();
    cy.get('body').then($body => {
      if ($body.text().includes('Already have an account?')) {
        cy.contains('Login here').click();
        cy.get('input[placeholder="Enter your username"]').type(username);
        cy.get('input[placeholder="Enter your password"]').type(password);
        cy.get('button[type="submit"]').contains(/login/i).click();
      }
    });
    
    // Click on AI game option
    cy.contains('Player vs AI').click();
    
    // Verify AI game components
    cy.get('[data-testid="game-container"]').should('be.visible');
    cy.contains('Player vs AI').should('be.visible');
    cy.get('canvas').should('be.visible');
    cy.contains('Player:').should('be.visible');
    cy.contains('AI:').should('be.visible');
  });

  it('should have proper game controls for AI mode', () => {
    // Login and navigate to AI game
    cy.contains('Register here').click();
    cy.get('input[placeholder="Choose a username (3-20 characters)"]').type(username);
    cy.get('input[placeholder="Enter your email address"]').type(email);
    cy.get('input[placeholder="Choose a password (min 6 characters)"]').type(password);
    cy.get('input[placeholder="Confirm your password"]').type(password);
    cy.get('button').contains('Register').click();
    cy.get('body').then($body => {
      if ($body.text().includes('Already have an account?')) {
        cy.contains('Login here').click();
        cy.get('input[placeholder="Enter your username"]').type(username);
        cy.get('input[placeholder="Enter your password"]').type(password);
        cy.get('button[type="submit"]').contains(/login/i).click();
      }
    });
    
    cy.contains('Player vs AI').click();
    
    // Check for game control buttons
    cy.contains('Start').should('be.visible');
    cy.contains('Pause').should('be.visible');
    cy.contains('Reset').should('be.visible');
    
    // Check for game status
    cy.get('[data-testid="game-status"]').should('be.visible');
    cy.contains('Status:').should('be.visible');
  });

  it('should display correct instructions for AI mode', () => {
    // Login and navigate to AI game
    cy.contains('Register here').click();
    cy.get('input[placeholder="Choose a username (3-20 characters)"]').type(username);
    cy.get('input[placeholder="Enter your email address"]').type(email);
    cy.get('input[placeholder="Choose a password (min 6 characters)"]').type(password);
    cy.get('input[placeholder="Confirm your password"]').type(password);
    cy.get('button').contains('Register').click();
    cy.get('body').then($body => {
      if ($body.text().includes('Already have an account?')) {
        cy.contains('Login here').click();
        cy.get('input[placeholder="Enter your username"]').type(username);
        cy.get('input[placeholder="Enter your password"]').type(password);
        cy.get('button[type="submit"]').contains(/login/i).click();
      }
    });
    
    cy.contains('Player vs AI').click();
    
    // Check for AI-specific instructions
    cy.contains('Use W (up) / S (down) to move your paddle.').should('be.visible');
  });

  it('should start AI game and show initial state', () => {
    // Login and navigate to AI game
    cy.contains('Register here').click();
    cy.get('input[placeholder="Choose a username (3-20 characters)"]').type(username);
    cy.get('input[placeholder="Enter your email address"]').type(email);
    cy.get('input[placeholder="Choose a password (min 6 characters)"]').type(password);
    cy.get('input[placeholder="Confirm your password"]').type(password);
    cy.get('button').contains('Register').click();
    cy.get('body').then($body => {
      if ($body.text().includes('Already have an account?')) {
        cy.contains('Login here').click();
        cy.get('input[placeholder="Enter your username"]').type(username);
        cy.get('input[placeholder="Enter your password"]').type(password);
        cy.get('button[type="submit"]').contains(/login/i).click();
      }
    });
    
    cy.contains('Player vs AI').click();
    
    // Check initial score
    cy.contains('Player: 0 - AI: 0').should('be.visible');
    
    // Check initial game status
    cy.get('[data-testid="game-status"]').should('contain', 'ready');
  });

  it('should respond to keyboard controls in AI mode', () => {
    // Login and navigate to AI game
    cy.contains('Register here').click();
    cy.get('input[placeholder="Choose a username (3-20 characters)"]').type(username);
    cy.get('input[placeholder="Enter your email address"]').type(email);
    cy.get('input[placeholder="Choose a password (min 6 characters)"]').type(password);
    cy.get('input[placeholder="Confirm your password"]').type(password);
    cy.get('button').contains('Register').click();
    cy.get('body').then($body => {
      if ($body.text().includes('Already have an account?')) {
        cy.contains('Login here').click();
        cy.get('input[placeholder="Enter your username"]').type(username);
        cy.get('input[placeholder="Enter your password"]').type(password);
        cy.get('button[type="submit"]').contains(/login/i).click();
      }
    });
    
    cy.contains('Player vs AI').click();
    
    // Start the game
    cy.contains('Start').click();
    
    // Wait for game to start
    cy.get('[data-testid="game-status"]').should('contain', 'playing');
    
    // Test keyboard controls (focus on canvas first)
    cy.get('canvas').click();
    
    // Test W key (up movement)
    cy.get('canvas').type('w');
    
    // Test S key (down movement)
    cy.get('canvas').type('s');
  });

  it('should pause and resume AI game', () => {
    // Login and navigate to AI game
    cy.contains('Register here').click();
    cy.get('input[placeholder="Choose a username (3-20 characters)"]').type(username);
    cy.get('input[placeholder="Enter your email address"]').type(email);
    cy.get('input[placeholder="Choose a password (min 6 characters)"]').type(password);
    cy.get('input[placeholder="Confirm your password"]').type(password);
    cy.get('button').contains('Register').click();
    cy.get('body').then($body => {
      if ($body.text().includes('Already have an account?')) {
        cy.contains('Login here').click();
        cy.get('input[placeholder="Enter your username"]').type(username);
        cy.get('input[placeholder="Enter your password"]').type(password);
        cy.get('button[type="submit"]').contains(/login/i).click();
      }
    });
    
    cy.contains('Player vs AI').click();
    
    // Start the game
    cy.contains('Start').click();
    cy.get('[data-testid="game-status"]').should('contain', 'playing');
    
    // Pause the game
    cy.contains('Pause').click();
    cy.get('[data-testid="game-status"]').should('contain', 'paused');
    
    // Resume the game
    cy.contains('Start').click();
    cy.get('[data-testid="game-status"]').should('contain', 'playing');
  });

  it('should reset AI game to initial state', () => {
    // Login and navigate to AI game
    cy.contains('Register here').click();
    cy.get('input[placeholder="Choose a username (3-20 characters)"]').type(username);
    cy.get('input[placeholder="Enter your email address"]').type(email);
    cy.get('input[placeholder="Choose a password (min 6 characters)"]').type(password);
    cy.get('input[placeholder="Confirm your password"]').type(password);
    cy.get('button').contains('Register').click();
    cy.get('body').then($body => {
      if ($body.text().includes('Already have an account?')) {
        cy.contains('Login here').click();
        cy.get('input[placeholder="Enter your username"]').type(username);
        cy.get('input[placeholder="Enter your password"]').type(password);
        cy.get('button[type="submit"]').contains(/login/i).click();
      }
    });
    
    cy.contains('Player vs AI').click();
    
    // Start the game
    cy.contains('Start').click();
    cy.get('[data-testid="game-status"]').should('contain', 'playing');
    
    // Reset the game
    cy.contains('Reset').click();
    cy.get('[data-testid="game-status"]').should('contain', 'ready');
    cy.contains('Player: 0 - AI: 0').should('be.visible');
  });

  it('should handle AI game navigation (back button)', () => {
    // Login and navigate to AI game
    cy.contains('Register here').click();
    cy.get('input[placeholder="Choose a username (3-20 characters)"]').type(username);
    cy.get('input[placeholder="Enter your email address"]').type(email);
    cy.get('input[placeholder="Choose a password (min 6 characters)"]').type(password);
    cy.get('input[placeholder="Confirm your password"]').type(password);
    cy.get('button').contains('Register').click();
    cy.get('body').then($body => {
      if ($body.text().includes('Already have an account?')) {
        cy.contains('Login here').click();
        cy.get('input[placeholder="Enter your username"]').type(username);
        cy.get('input[placeholder="Enter your password"]').type(password);
        cy.get('button[type="submit"]').contains(/login/i).click();
      }
    });
    
    cy.contains('Player vs AI').click();
    
    // Verify we're in AI game
    cy.contains('Player vs AI').should('be.visible');
    
    // Test browser back button
    cy.go('back');
    
    // Should return to main menu
    cy.contains('Player vs Player (Local)').should('be.visible');
    cy.contains('Player vs AI').should('be.visible');
  });

  it('should maintain game state during AI gameplay', () => {
    // Login and navigate to AI game
    cy.contains('Register here').click();
    cy.get('input[placeholder="Choose a username (3-20 characters)"]').type(username);
    cy.get('input[placeholder="Enter your email address"]').type(email);
    cy.get('input[placeholder="Choose a password (min 6 characters)"]').type(password);
    cy.get('input[placeholder="Confirm your password"]').type(password);
    cy.get('button').contains('Register').click();
    cy.get('body').then($body => {
      if ($body.text().includes('Already have an account?')) {
        cy.contains('Login here').click();
        cy.get('input[placeholder="Enter your username"]').type(username);
        cy.get('input[placeholder="Enter your password"]').type(password);
        cy.get('button[type="submit"]').contains(/login/i).click();
      }
    });
    
    cy.contains('Player vs AI').click();
    
    // Start the game
    cy.contains('Start').click();
    
    // Wait for game to be in playing state
    cy.get('[data-testid="game-status"]').should('contain', 'playing');
    
    // Game should continue running (AI should be active)
    cy.wait(2000); // Wait 2 seconds
    
    // Game should still be playing
    cy.get('[data-testid="game-status"]').should('contain', 'playing');
    
    // Canvas should still be visible and active
    cy.get('canvas').should('be.visible');
  });
});