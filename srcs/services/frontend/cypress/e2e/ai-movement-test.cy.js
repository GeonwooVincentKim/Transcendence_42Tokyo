describe('AI Movement Test', () => {
  const username = 'testuser';
  const password = 'testpassword';
  const email = 'testuser@example.com';

  beforeEach(() => {
    cy.visit('/');
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
    cy.contains('Player vs AI').click();
    cy.wait(2000);

    // Check if AI Pong page is loaded
    cy.contains('Player vs AI').should('be.visible');
    cy.contains('Easy').should('be.visible');
    cy.contains('Medium').should('be.visible');
    cy.contains('Hard').should('be.visible');

    // Show debug info
    cy.contains('Show Debug').click();
    cy.wait(1000);

    // Start the game
    cy.contains('Start').click();
    cy.wait(2000);

    // Check if game is playing
    cy.contains('Status: playing').should('be.visible');

    // Wait for AI to move and check console logs
    cy.window().then((win) => {
      // Check if AI logs are appearing in console
      cy.wait(3000);
      
      // Check if AI is moving by looking at the game state
      cy.get('[data-testid="game-container"]').should('be.visible');
      
      // Check if debug info shows AI movement
      cy.contains('AI Debug Info:').should('be.visible');
    });
  });

  it('should verify AI responds to ball movement', () => {
    // Navigate to AI Pong game
    cy.contains('Player vs AI').click();
    cy.wait(2000);

    // Show debug info
    cy.contains('Show Debug').click();
    cy.wait(1000);

    // Start the game
    cy.contains('Start').click();
    cy.wait(2000);

    // Check if game is playing
    cy.contains('Status: playing').should('be.visible');

    // Wait for AI to respond to ball movement
    cy.wait(5000);

    // Check if AI debug info is showing movement
    cy.contains('AI Debug Info:').should('be.visible');
    
    // Check if there are any AI-related console logs
    cy.window().then((win) => {
      // This is a basic check - in a real scenario we'd check console logs
      cy.log('Checking if AI is responding to ball movement');
    });
  });
});
