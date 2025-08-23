describe('Simple AI Test', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.wait(2000);
  });

  it('should verify AI movement is working', () => {
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

    // Wait for AI to move
    cy.wait(3000);

    // Check if AI debug info shows movement
    cy.contains('AI Debug Info:').should('be.visible');
    
    // Check if AI is moving (should show movement direction)
    cy.get('[data-testid="movement-direction"]').should('not.have.text', '0');
    
    // Check if AI position is changing
    cy.get('[data-testid="ai-position"]').then($position => {
      const initialPosition = parseInt($position.text());
      cy.log(`Initial AI position: ${initialPosition}`);
      
      // Wait a bit more
      cy.wait(2000);
      
      // Check if position changed
      cy.get('[data-testid="ai-position"]').then($newPosition => {
        const newPosition = parseInt($newPosition.text());
        cy.log(`New AI position: ${newPosition}`);
        
        // AI should have moved
        expect(newPosition).to.not.equal(initialPosition);
      });
    });
  });
});
