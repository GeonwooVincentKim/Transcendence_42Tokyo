describe('Simple Synchronization Test', () => {
  it('should test basic page load and login', () => {
    // Visit the application
    cy.visit('http://localhost:3000');
    
    // Check if we're on the login page
    cy.get('h1').should('contain', 'Login');
    
    // Try to login
    cy.get('input[type="text"]').type('tester');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    
    // Wait a bit for potential redirect
    cy.wait(2000);
    
    // Check current URL
    cy.url().then((url) => {
      cy.log('Current URL:', url);
    });
    
    // Take a screenshot
    cy.screenshot('after-login');
  });

  it('should test tournament page directly', () => {
    // Visit tournament page directly
    cy.visit('http://localhost:3000/tournament');
    
    // Take a screenshot
    cy.screenshot('tournament-page');
    
    // Check if we can see tournament elements
    cy.get('body').should('be.visible');
  });
});
