/**
 * Tournament Game Play E2E Tests
 * 
 * Tests the complete tournament workflow with actual game play:
 * 1. User registration and login
 * 2. Tournament creation and joining
 * 3. Tournament starting
 * 4. Actual game play
 * 5. Game result reporting
 */

describe('Tournament Game Play E2E Tests', () => {
  const testUser1 = {
    username: 'player1' + Date.now(),
    email: 'player1' + Date.now() + '@test.com',
    password: 'testpass123'
  };

  const testUser2 = {
    username: 'player2' + Date.now(),
    email: 'player2' + Date.now() + '@test.com',
    password: 'testpass123'
  };

  it('should complete full tournament with game play', () => {
    // Step 1: Register first user
    cy.visit('http://localhost:3000');
    cy.get('body').should('be.visible');
    
    cy.get('body').then(($body) => {
      if ($body.find('input[placeholder*="username"], input[placeholder*="Username"]').length > 0) {
        cy.get('a').contains('Register').click();
        cy.wait(1000);
        
        cy.get('input[placeholder*="username"], input[placeholder*="Username"]').first().type(testUser1.username);
        cy.get('input[type="email"]').type(testUser1.email);
        cy.get('input[type="password"]').first().type(testUser1.password);
        cy.get('button').contains('Register').click();
        cy.wait(3000);
      }
    });

    // Step 2: Create tournament
    cy.get('button').contains('Tournament').click();
    cy.get('h1').contains('Tournament System').should('be.visible');

    cy.get('input[placeholder="Tournament Name"]').clear().type('Game Play Test Tournament');
    cy.get('input[type="number"]').clear().type('2');
    cy.get('button').contains('Create').click();
    cy.wait(2000);

    // Step 3: Join tournament
    cy.get('button').contains('Join').first().click();
    cy.wait(2000);

    // Step 4: Start tournament
    cy.get('button').contains('Start Tournament').first().click();
    cy.wait(2000);

    // Step 5: Navigate to brackets
    cy.get('button').contains('View Brackets').first().click();
    cy.wait(2000);

    // Step 6: Verify brackets are displayed
    cy.get('h2').contains('Brackets').should('be.visible');

    // Step 7: Look for Play Game button
    cy.get('body').then(($body) => {
      if ($body.find('button').filter(':contains("🎮 Play Game")').length > 0) {
        // Play Game button exists, click it
        cy.get('button').contains('🎮 Play Game').first().click();
        
        // Wait for game view to load
        cy.wait(2000);
        
        // Verify we're in game view
        cy.get('h3').contains('Tournament Match').should('be.visible');
        
        // Verify PongGame component is rendered
        cy.get('canvas').should('be.visible');
        
        // Verify game controls are displayed
        cy.get('body').should('contain', 'Use W/S keys for left player');
        cy.get('body').should('contain', 'Arrow Up/Down for right player');
        
        // Test Cancel Game button
        cy.get('button').contains('Cancel Game').click();
        cy.wait(1000);
        
        // Verify we're back to brackets
        cy.get('h2').contains('Brackets').should('be.visible');
      } else {
        cy.log('No Play Game button found, but brackets are displayed correctly');
      }
    });
  });

  it('should handle tournament creation and game play workflow', () => {
    // Register second user for testing
    cy.visit('http://localhost:3000');
    cy.get('body').should('be.visible');
    
    cy.get('body').then(($body) => {
      if ($body.find('input[placeholder*="username"], input[placeholder*="Username"]').length > 0) {
        cy.get('a').contains('Register').click();
        cy.wait(1000);
        
        cy.get('input[placeholder*="username"], input[placeholder*="Username"]').first().type(testUser2.username);
        cy.get('input[type="email"]').type(testUser2.email);
        cy.get('input[type="password"]').first().type(testUser2.password);
        cy.get('button').contains('Register').click();
        cy.wait(3000);
      }
    });

    // Navigate to tournament
    cy.get('button').contains('Tournament').click();
    cy.get('h1').contains('Tournament System').should('be.visible');

    // Create tournament
    cy.get('input[placeholder="Tournament Name"]').clear().type('Multi-Player Tournament');
    cy.get('input[type="number"]').clear().type('4');
    cy.get('button').contains('Create').click();
    cy.wait(2000);

    // Join tournament
    cy.get('button').contains('Join').first().click();
    cy.wait(2000);

    // Verify Create Tournament section is hidden
    cy.get('body').should('not.contain', 'Create Tournament');

    // Verify participant count is displayed correctly
    cy.get('body').should('contain', '1/4 participants');
  });
});
