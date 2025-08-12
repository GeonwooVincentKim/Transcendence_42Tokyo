describe('AI Movement Test', () => {
  const username = 'testuser';
  const password = 'testpassword';
  const email = 'testuser@example.com';

  beforeEach(() => {
    cy.visit('http://localhost:3000');
    cy.wait(2000);
    
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
        cy.get('button').contains('Login').click();
      }
    });
    
    cy.wait(2000);
  });

  it('should navigate to AI Pong game and verify AI movement', () => {
    // Navigate to AI Pong game
    cy.contains('AI Pong').click();
    cy.wait(2000);

    // Check if AI Pong page is loaded
    cy.contains('Player vs AI Pong').should('be.visible');
    cy.contains('Easy').should('be.visible');
    cy.contains('Medium').should('be.visible');
    cy.contains('Hard').should('be.visible');

    // Show debug info
    cy.contains('Show Debug Info').click();
    cy.wait(1000);

    // Start the game
    cy.contains('Start Game').click();
    cy.wait(2000);

    // Check if game is playing
    cy.contains('Status: playing').should('be.visible');

    // Get initial AI position
    cy.get('[data-testid="ai-debug-info"]').then($debugInfo => {
      const initialPosition = $debugInfo.find('[data-testid="ai-position"]').text();
      cy.log(`Initial AI position: ${initialPosition}`);

      // Wait for AI to move
      cy.wait(3000);

      // Check if AI position changed
      cy.get('[data-testid="ai-debug-info"]').then($debugInfo2 => {
        const newPosition = $debugInfo2.find('[data-testid="ai-position"]').text();
        cy.log(`New AI position: ${newPosition}`);
        
        // AI should have moved (position should be different)
        expect(newPosition).to.not.equal(initialPosition);
      });
    });

    // Check movement direction
    cy.get('[data-testid="movement-direction"]').then($direction => {
      const direction = $direction.text();
      cy.log(`Movement direction: ${direction}`);
      
      // Direction should not always be 0
      expect(direction).to.not.equal('0');
    });

    // Check if AI is moving
    cy.get('[data-testid="is-moving"]').then($moving => {
      const isMoving = $moving.text();
      cy.log(`Is moving: ${isMoving}`);
      
      // Should be moving
      expect(isMoving).to.equal('Yes');
    });
  });

  it('should verify AI responds to ball movement', () => {
    // Navigate to AI Pong game
    cy.contains('AI Pong').click();
    cy.wait(2000);

    // Show debug info
    cy.contains('Show Debug Info').click();
    cy.wait(1000);

    // Start the game
    cy.contains('Start Game').click();
    cy.wait(2000);

    // Monitor AI movement for several seconds
    let movementCount = 0;
    let lastDirection = '0';

    for (let i = 0; i < 10; i++) {
      cy.wait(500);
      cy.get('[data-testid="movement-direction"]').then($direction => {
        const currentDirection = $direction.text();
        if (currentDirection !== lastDirection && currentDirection !== '0') {
          movementCount++;
        }
        lastDirection = currentDirection;
      });
    }

    // AI should have moved at least a few times
    cy.log(`AI moved ${movementCount} times`);
    expect(movementCount).to.be.greaterThan(0);
  });
});
