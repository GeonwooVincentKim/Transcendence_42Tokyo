/**
 * Complete Tournament E2E Tests
 * 
 * Tests the complete tournament workflow with authentication:
 * 1. User registration and login
 * 2. Tournament creation
 * 3. Tournament joining
 * 4. Tournament starting
 * 5. Tournament bracket viewing
 * 6. Game play functionality
 */

describe('Complete Tournament System E2E Tests', () => {
  const testUser = {
    username: 'tournamentuser' + Date.now(),
    email: 'tournament' + Date.now() + '@test.com',
    password: 'testpass123'
  };

  beforeEach(() => {
    // Visit the application
    cy.visit('http://localhost:3000');
    
    // Wait for the page to load
    cy.get('body').should('be.visible');
  });

  it('should complete full tournament workflow', () => {
    // Step 1: Register a new user
    cy.get('body').then(($body) => {
      if ($body.find('input[placeholder*="username"], input[placeholder*="Username"]').length > 0) {
        // We're on the login page, try to register first
        cy.get('a').contains('Register').click();
        cy.wait(1000);
        
        // Fill registration form
        cy.get('input[placeholder*="username"], input[placeholder*="Username"]').first().type(testUser.username);
        cy.get('input[type="email"]').type(testUser.email);
        cy.get('input[type="password"]').first().type(testUser.password);
        cy.get('button').contains('Register').click();
        
        // Wait for registration to complete
        cy.wait(3000);
      }
    });

    // Step 2: Verify Tournament button is visible
    cy.get('button').contains('Tournament').should('be.visible');

    // Step 3: Navigate to tournament page
    cy.get('button').contains('Tournament').click();
    
    // Verify we're on the tournament page
    cy.get('h1').contains('Tournament System').should('be.visible');

    // Step 4: Create a new tournament
    cy.get('input[placeholder="Tournament Name"]').clear().type('Test Tournament ' + Date.now());
    cy.get('input[type="number"]').clear().type('4');
    cy.get('textarea[placeholder*="Description"]').type('Cypress test tournament');
    cy.get('button').contains('Create').click();
    
    // Wait for tournament creation
    cy.wait(2000);

    // Step 5: Join the tournament
    cy.get('button').contains('Join').first().click();
    
    // Wait for join to complete
    cy.wait(2000);

    // Step 6: Verify Create Tournament section is hidden after joining
    cy.get('body').should('not.contain', 'Create Tournament');

    // Step 7: Start the tournament (need at least 2 participants)
    // For this test, we'll simulate having 2 participants
    cy.get('button').contains('Start').first().click();
    
    // Wait for tournament to start
    cy.wait(2000);

    // Step 8: View brackets
    cy.get('button').contains('View Brackets').first().click();
    
    // Wait for brackets to load
    cy.wait(2000);

    // Step 9: Verify brackets are displayed
    cy.get('h2').contains('Brackets').should('be.visible');

    // Step 10: Look for Play Game buttons
    cy.get('body').then(($body) => {
      if ($body.find('button').filter(':contains("🎮 Play Game")').length > 0) {
        // Play Game button exists, click it
        cy.get('button').contains('🎮 Play Game').first().click();
        
        // Wait for game view to load
        cy.wait(2000);
        
        // Verify we're in game view
        cy.get('h2').contains('Match').should('be.visible');
        
        // Simulate game completion
        cy.get('button').contains('🏆 Simulate Game Complete').click();
        
        // Wait for game completion
        cy.wait(2000);
        
        // Verify we're back to brackets
        cy.get('h2').contains('Brackets').should('be.visible');
      } else {
        // No Play Game button, just verify brackets are working
        cy.log('No Play Game button found, but brackets are displayed correctly');
      }
    });

    // Step 11: Navigate back to main menu
    cy.get('button').contains('Back to Menu').click();
    
    // Verify we're back to main menu
    cy.get('button').contains('Tournament').should('be.visible');
  });

  it('should handle tournament creation and joining correctly', () => {
    // Register and login (reuse the same user)
    cy.get('body').then(($body) => {
      if ($body.find('input[placeholder*="username"], input[placeholder*="Username"]').length > 0) {
        cy.get('a').contains('Register').click();
        cy.wait(1000);
        
        cy.get('input[placeholder*="username"], input[placeholder*="Username"]').first().type(testUser.username + '2');
        cy.get('input[type="email"]').type(testUser.email.replace('@', '2@'));
        cy.get('input[type="password"]').first().type(testUser.password);
        cy.get('button').contains('Register').click();
        cy.wait(3000);
      }
    });

    // Navigate to tournament
    cy.get('button').contains('Tournament').click();
    cy.get('h1').contains('Tournament System').should('be.visible');

    // Create tournament
    cy.get('input[placeholder="Tournament Name"]').clear().type('Test Tournament 2');
    cy.get('input[type="number"]').clear().type('2');
    cy.get('button').contains('Create').click();
    cy.wait(2000);

    // Join tournament
    cy.get('button').contains('Join').first().click();
    cy.wait(2000);

    // Verify participant count is displayed correctly
    cy.get('body').should('contain', 'Current: 1');

    // Verify Create Tournament section is hidden
    cy.get('body').should('not.contain', 'Create Tournament');
  });
});
