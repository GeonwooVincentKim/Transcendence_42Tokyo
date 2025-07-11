describe('Pong Game E2E', () => {
  beforeEach(() => {
    // Visit the application before each test
    cy.visit('/')
    cy.waitForPageLoad()
  })

  it('should load the main page and display game title', () => {
    // Check if the page loads successfully
    cy.get('body').should('be.visible')
    
    // Check for game title or main heading
    cy.contains(/pong|game/i).should('be.visible')
  })

  it('should have proper game container structure', () => {
    // Check if game container exists
    cy.get('[data-testid="game-container"]').should('exist')
    
    // Check for game canvas or board
    cy.get('canvas, [data-testid="game-board"]').should('exist')
  })

  it('should have game control buttons', () => {
    // Check for start button
    cy.get('[data-testid="start-button"]').should('be.visible')
    
    // Check for pause button (if exists)
    cy.get('[data-testid="pause-button"]').should('exist')
    
    // Check for reset button
    cy.get('[data-testid="reset-button"]').should('exist')
  })

  it('should start the game when start button is clicked', () => {
    // Click start button
    cy.get('[data-testid="start-button"]').click()
    
    // Check if game state changes (this might need adjustment based on actual implementation)
    cy.get('[data-testid="game-status"]').should('contain', /playing|started/i)
  })

  it('should pause the game when pause button is clicked', () => {
    // Start the game first
    cy.get('[data-testid="start-button"]').click()
    
    // Wait a moment for game to start
    cy.wait(1000)
    
    // Click pause button
    cy.get('[data-testid="pause-button"]').click()
    
    // Check if game is paused
    cy.get('[data-testid="game-status"]').should('contain', /paused|stopped/i)
  })

  it('should reset the game when reset button is clicked', () => {
    // Start the game first
    cy.get('[data-testid="start-button"]').click()
    
    // Wait a moment for game to start
    cy.wait(1000)
    
    // Click reset button
    cy.get('[data-testid="reset-button"]').click()
    
    // Check if game is reset to initial state
    cy.get('[data-testid="game-status"]').should('contain', /ready|initial/i)
  })

  it('should display score or game information', () => {
    // Check for score display
    cy.get('[data-testid="score"], [data-testid="game-info"]').should('exist')
  })

  it('should handle keyboard input for game controls', () => {
    // Focus on the game area
    cy.get('[data-testid="game-container"]').click()
    
    // Test keyboard controls (adjust based on actual game implementation)
    cy.get('body').type(' ')
    cy.wait(500)
    
    // Check if game responds to keyboard input
    cy.get('[data-testid="game-status"]').should('exist')
  })

  it('should maintain game state across page interactions', () => {
    // Start the game
    cy.get('[data-testid="start-button"]').click()
    
    // Wait for game to be in playing state
    cy.wait(1000)
    
    // Interact with other elements (if any)
    cy.get('body').click()
    
    // Verify game is still running
    cy.get('[data-testid="game-status"]').should('contain', /playing|started/i)
  })

  it('should handle window resize gracefully', () => {
    // Start the game
    cy.get('[data-testid="start-button"]').click()
    
    // Resize viewport
    cy.viewport(800, 600)
    
    // Check if game container is still visible
    cy.get('[data-testid="game-container"]').should('be.visible')
    
    // Reset viewport
    cy.viewport(1280, 720)
  })

  it('should have responsive design for different screen sizes', () => {
    // Test mobile viewport
    cy.viewport('iphone-x')
    cy.get('[data-testid="game-container"]').should('be.visible')
    
    // Test tablet viewport
    cy.viewport('ipad-2')
    cy.get('[data-testid="game-container"]').should('be.visible')
    
    // Test desktop viewport
    cy.viewport(1280, 720)
    cy.get('[data-testid="game-container"]').should('be.visible')
  })
})
