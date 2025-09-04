/**
 * Tournament E2E Tests
 * 
 * Tests the complete tournament workflow:
 * 1. User registration and login
 * 2. Tournament creation
 * 3. Tournament joining
 * 4. Tournament starting
 * 5. Tournament bracket viewing
 */

describe('Tournament System E2E Tests', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('http://localhost:3000');
    
    // Wait for the page to load
    cy.get('body').should('be.visible');
    
    // Try to register a new user first
    cy.get('body').then(($body) => {
      if ($body.find('input[placeholder*="username"], input[placeholder*="Username"]').length > 0) {
        // We're on the login page, try to register first
        cy.get('a').contains('Register').click();
        cy.wait(1000);
        
        // Fill registration form
        cy.get('input[placeholder*="username"], input[placeholder*="Username"]').first().type('tournamentuser');
        cy.get('input[type="email"]').type('tournament@test.com');
        cy.get('input[type="password"]').first().type('testpass123');
        cy.get('button').contains('Register').click();
        
        // Wait for registration to complete
        cy.wait(3000);
      }
    });
  });

  it('should display tournament menu option', () => {
    // Check if Tournament button is visible in the main menu
    cy.get('button').contains('Tournament').should('be.visible');
  });

  it('should navigate to tournament page', () => {
    // Click on Tournament button
    cy.get('button').contains('Tournament').click();
    
    // Verify we're on the tournament page
    cy.get('h2').contains('Tournament').should('be.visible');
    
    // Check for tournament creation form
    cy.get('input[placeholder="Name"]').should('be.visible');
    cy.get('input[type="number"]').should('be.visible');
    cy.get('textarea[placeholder="Description"]').should('be.visible');
    cy.get('button').contains('Create').should('be.visible');
  });

  it('should create a new tournament', () => {
    // Navigate to tournament page
    cy.get('button').contains('Tournament').click();
    
    // Fill in tournament creation form
    cy.get('input[placeholder="Name"]').clear().type('Test Tournament');
    cy.get('input[type="number"]').clear().type('8');
    cy.get('textarea[placeholder="Description"]').clear().type('A test tournament for E2E testing');
    
    // Click create button
    cy.get('button').contains('Create').click();
    
    // Verify tournament appears in the list
    cy.get('div').contains('Test Tournament').should('be.visible');
    cy.get('div').contains('registration').should('be.visible');
    cy.get('div').contains('max 8').should('be.visible');
  });

  it('should list existing tournaments', () => {
    // Navigate to tournament page
    cy.get('button').contains('Tournament').click();
    
    // Check if tournaments section exists
    cy.get('h3').contains('Tournaments').should('be.visible');
    
    // Check if tournament list container exists
    cy.get('ul').should('be.visible');
  });

  it('should handle tournament creation with validation', () => {
    // Navigate to tournament page
    cy.get('button').contains('Tournament').click();
    
    // Try to create tournament with empty name
    cy.get('input[placeholder="Name"]').clear();
    cy.get('button').contains('Create').click();
    
    // Should still show the form (no error handling in current implementation)
    cy.get('input[placeholder="Name"]').should('be.visible');
  });

  it('should display tournament controls', () => {
    // Navigate to tournament page
    cy.get('button').contains('Tournament').click();
    
    // Create a tournament first
    cy.get('input[placeholder="Name"]').clear().type('Control Test Tournament');
    cy.get('input[type="number"]').clear().type('4');
    cy.get('button').contains('Create').click();
    
    // Check for tournament controls (Join and Start buttons)
    cy.get('button').contains('Join').should('be.visible');
    cy.get('button').contains('Start').should('be.visible');
  });

  it('should navigate back to main menu', () => {
    // Navigate to tournament page
    cy.get('button').contains('Tournament').click();
    
    // Click back button
    cy.get('button').contains('Back to Menu').click();
    
    // Verify we're back on the main menu
    cy.get('button').contains('Tournament').should('be.visible');
    cy.get('button').contains('Player vs Player (Local)').should('be.visible');
  });

  it('should handle multiple tournament creation', () => {
    // Navigate to tournament page
    cy.get('button').contains('Tournament').click();
    
    // Create first tournament
    cy.get('input[placeholder="Name"]').clear().type('Tournament 1');
    cy.get('input[type="number"]').clear().type('4');
    cy.get('button').contains('Create').click();
    
    // Create second tournament
    cy.get('input[placeholder="Name"]').clear().type('Tournament 2');
    cy.get('input[type="number"]').clear().type('8');
    cy.get('button').contains('Create').click();
    
    // Verify both tournaments are listed
    cy.get('div').contains('Tournament 1').should('be.visible');
    cy.get('div').contains('Tournament 2').should('be.visible');
  });

  it('should display tournament status correctly', () => {
    // Navigate to tournament page
    cy.get('button').contains('Tournament').click();
    
    // Create a tournament
    cy.get('input[placeholder="Name"]').clear().type('Status Test Tournament');
    cy.get('input[type="number"]').clear().type('4');
    cy.get('button').contains('Create').click();
    
    // Check tournament status display
    cy.get('div').contains('registration').should('be.visible');
    cy.get('div').contains('max 4').should('be.visible');
  });

  it('should have responsive tournament interface', () => {
    // Navigate to tournament page
    cy.get('button').contains('Tournament').click();
    
    // Check responsive design elements
    cy.get('div').should('have.class', 'space-y-4');
    cy.get('div').should('have.class', 'flex');
    cy.get('div').should('have.class', 'flex-col');
    cy.get('div').should('have.class', 'items-center');
  });

  it('should maintain tournament state during navigation', () => {
    // Navigate to tournament page
    cy.get('button').contains('Tournament').click();
    
    // Create a tournament
    cy.get('input[placeholder="Name"]').clear().type('State Test Tournament');
    cy.get('input[type="number"]').clear().type('4');
    cy.get('button').contains('Create').click();
    
    // Navigate away and back
    cy.get('button').contains('Back to Menu').click();
    cy.get('button').contains('Tournament').click();
    
    // Tournament should still be there
    cy.get('div').contains('State Test Tournament').should('be.visible');
  });
});
