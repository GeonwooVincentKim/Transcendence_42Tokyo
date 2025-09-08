/**
 * Simple Tournament E2E Tests
 * 
 * Tests basic tournament functionality with proper authentication
 */

describe('Simple Tournament System E2E Tests', () => {
  const testUser = {
    username: 'testuser' + Date.now(),
    email: 'test' + Date.now() + '@test.com',
    password: 'testpass123'
  };

  it('should register, login, and access tournament system', () => {
    // Visit the application
    cy.visit('http://localhost:3000');
    
    // Wait for the page to load
    cy.get('body').should('be.visible');
    
    // Check if we need to register
    cy.get('body').then(($body) => {
      if ($body.find('input[placeholder*="username"], input[placeholder*="Username"]').length > 0) {
        // We're on the login page, register first
        cy.get('a').contains('Register').click();
        cy.wait(1000);
        
        // Fill registration form
        cy.get('input[placeholder*="username"], input[placeholder*="Username"]').first().type(testUser.username);
        cy.get('input[type="email"]').type(testUser.email);
        cy.get('input[type="password"]').first().type(testUser.password);
        cy.get('button').contains('Register').click();
        
        // Wait for registration to complete
        cy.wait(5000);
      }
    });

    // Now check for Tournament button - it should be visible after login
    cy.get('body').should('contain', 'Tournament');
    
    // Click on Tournament button
    cy.get('button').contains('Tournament').click();
    
    // Verify we're on the tournament page
    cy.get('h1').contains('Tournament System').should('be.visible');
    
    // Check if Create Tournament section is visible
    cy.get('body').should('contain', 'Create Tournament');
  });

  it('should create and join a tournament', () => {
    // Visit and login (reuse registration logic)
    cy.visit('http://localhost:3000');
    cy.get('body').should('be.visible');
    
    cy.get('body').then(($body) => {
      if ($body.find('input[placeholder*="username"], input[placeholder*="Username"]').length > 0) {
        cy.get('a').contains('Register').click();
        cy.wait(1000);
        
        cy.get('input[placeholder*="username"], input[placeholder*="Username"]').first().type(testUser.username + '2');
        cy.get('input[type="email"]').type(testUser.email.replace('@', '2@'));
        cy.get('input[type="password"]').first().type(testUser.password);
        cy.get('button').contains('Register').click();
        cy.wait(5000);
      }
    });

    // Navigate to tournament
    cy.get('button').contains('Tournament').click();
    cy.get('h1').contains('Tournament System').should('be.visible');

    // Create tournament
    cy.get('input[placeholder="Tournament Name"]').clear().type('Cypress Test Tournament');
    cy.get('input[type="number"]').clear().type('2');
    cy.get('button').contains('Create').click();
    cy.wait(3000);

    // Join tournament
    cy.get('button').contains('Join').first().click();
    cy.wait(3000);

    // Verify success message
    cy.get('body').should('contain', 'successfully');

    // Verify Create Tournament section is hidden after joining
    cy.get('body').should('not.contain', 'Create Tournament');
  });
});
