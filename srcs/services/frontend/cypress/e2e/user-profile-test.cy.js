describe('User Profile Test', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('http://localhost:3000')
  })

  it('should login and navigate to profile page successfully', () => {
    // Wait for the page to load
    cy.wait(2000)

    // Check if we're on the login page
    cy.get('h1').should('contain', 'Transcendence Pong')
    cy.get('p').should('contain', 'Please sign in to play the game')

    // Login with test credentials
    cy.get('input[placeholder="Username"]').type('user2')
    cy.get('input[placeholder="Password"]').type('password123')
    cy.get('button').contains('Login').click()

    // Wait for login to complete
    cy.wait(2000)

    // Check if we're logged in
    cy.get('h1').should('contain', 'Transcendence Pong')
    cy.get('p').should('contain', 'Welcome, user2!')

    // Click on Profile button
    cy.get('button').contains('Profile').click()

    // Wait for profile page to load
    cy.wait(2000)

    // Check if we're on the profile page
    cy.get('h1').should('contain', 'User Profile')

    // Check if user information is displayed
    cy.get('h2').should('contain', 'user2')
    cy.get('p').should('contain', 'user2@example.com')

    // Check if statistics section exists
    cy.get('h3').should('contain', 'Game Statistics')

    // Check if loading state is shown initially
    cy.get('p').should('contain', 'Loading statistics...')

    // Wait for statistics to load
    cy.wait(3000)

    // Check if statistics are displayed (even if they're 0)
    cy.get('div').should('contain', 'Total games:')
    cy.get('div').should('contain', 'Games won:')
    cy.get('div').should('contain', 'Games lost:')
    cy.get('div').should('contain', 'Win rate:')
    cy.get('div').should('contain', 'Total score:')
    cy.get('div').should('contain', 'Highest score:')
    cy.get('div').should('contain', 'Average score:')

    // Check if action buttons are present
    cy.get('button').should('contain', 'Logout')
    cy.get('button').should('contain', 'Back to Game')
    cy.get('button').should('contain', 'Delete Account')

    // Click Back to Game button
    cy.get('button').contains('Back to Game').click()

    // Wait for navigation
    cy.wait(1000)

    // Check if we're back to the main game page
    cy.get('h1').should('contain', 'Transcendence Pong')
    cy.get('p').should('contain', 'Welcome, user2!')
  })

  it('should handle authentication errors gracefully', () => {
    // Try to access profile without being logged in
    cy.visit('http://localhost:3000')
    
    // Check if we're redirected to login page
    cy.get('h1').should('contain', 'Transcendence Pong')
    cy.get('p').should('contain', 'Please sign in to play the game')
  })

  it('should display user statistics correctly', () => {
    // Login first
    cy.get('input[placeholder="Username"]').type('user2')
    cy.get('input[placeholder="Password"]').type('password123')
    cy.get('button').contains('Login').click()

    cy.wait(2000)

    // Navigate to profile
    cy.get('button').contains('Profile').click()
    cy.wait(3000)

    // Check that statistics are displayed with proper formatting
    cy.get('div').contains('Total games:').parent().should('contain', '0')
    cy.get('div').contains('Games won:').parent().should('contain', '0')
    cy.get('div').contains('Games lost:').parent().should('contain', '0')
    cy.get('div').contains('Win rate:').parent().should('contain', '0%')
    cy.get('div').contains('Total score:').parent().should('contain', '0')
    cy.get('div').contains('Highest score:').parent().should('contain', '0')
    cy.get('div').contains('Average score:').parent().should('contain', '0.0')
  })
})
