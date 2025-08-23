describe('Basic Page Test', () => {
  it('should load the main page', () => {
    cy.visit('/');
    cy.wait(3000);
    
    // Check if page loaded
    cy.get('body').should('be.visible');
    
    // Take a screenshot to see what's on the page
    cy.screenshot('main-page');
    
    // Log the page content
    cy.get('body').then($body => {
      cy.log('Page content:', $body.text());
    });
  });
});
