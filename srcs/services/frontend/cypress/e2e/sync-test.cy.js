describe('Tournament Synchronization Test', () => {
  beforeEach(() => {
    // Clear all data before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('should synchronize tournament state between two players', () => {
    // Open first browser window (Player 1)
    cy.visit('http://localhost:3000');
    
    // Login as tester
    cy.get('input[type="text"]').type('tester');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    
    // Wait for login
    cy.url().should('include', '/tournament');
    
    // Create new tournament
    cy.get('button').contains('Create Tournament').click();
    cy.get('input[placeholder*="Tournament name"]').type('Sync Test Tournament');
    cy.get('button').contains('Create').click();
    
    // Join tournament
    cy.get('button').contains('Join Tournament').click();
    
    // Open second browser window (Player 2) in new tab
    cy.window().then((win) => {
      win.open('http://localhost:3000', '_blank');
    });
    
    // Switch to new tab
    cy.window().then((win) => {
      // Get all windows
      const windows = win.parent.window;
      console.log('Windows:', windows);
    });
    
    // Alternative: Use cy.origin for cross-origin testing
    cy.origin('http://localhost:3000', () => {
      cy.visit('/');
      
      // Login as tester2
      cy.get('input[type="text"]').type('tester2');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();
      
      // Wait for login
      cy.url().should('include', '/tournament');
      
      // Join the same tournament
      cy.get('button').contains('Join Tournament').click();
    });
    
    // Go back to first window and start tournament
    cy.visit('http://localhost:3000/tournament');
    
    // Start tournament
    cy.get('button').contains('Start Tournament').click();
    
    // Check if both players see the same state
    cy.get('div').contains('First Round').should('be.visible');
    cy.get('div').contains('Match 1').should('be.visible');
    
    // Verify synchronization
    cy.get('div').should('contain', 'tester');
    cy.get('div').should('contain', 'tester2');
  });

  it('should synchronize game state between two players', () => {
    // This test will be implemented after tournament sync is fixed
    cy.log('Game sync test will be implemented after tournament sync is fixed');
  });
});
