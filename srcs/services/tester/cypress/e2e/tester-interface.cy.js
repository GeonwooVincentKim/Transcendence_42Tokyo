describe('🏓 Pong Game Project - Tester Interface E2E Tests', () => {
  beforeEach(() => {
    // Visit the tester interface
    cy.visit('http://localhost:8080')
  })

  it('should load the tester interface successfully', () => {
    // Check if the main page loads
    cy.get('h1').should('contain', '🏓 Pong Game Project')
    cy.get('p').should('contain', 'Comprehensive Testing & Usage Guide Interface')
  })

  it('should display all dashboard cards', () => {
    // Check if all dashboard cards are present
    cy.get('.card').should('have.length', 4)
    
    // Check specific cards
    cy.get('.card').eq(0).should('contain', '📊 Service Status')
    cy.get('.card').eq(1).should('contain', '🧪 Test Runner')
    cy.get('.card').eq(2).should('contain', '📚 Usage Examples')
    cy.get('.card').eq(3).should('contain', '🔧 Quick Actions')
  })

  it('should have language selector buttons', () => {
    // Check language selector buttons
    cy.get('.language-btn').should('have.length', 3)
    cy.get('.language-btn').eq(0).should('contain', 'English')
    cy.get('.language-btn').eq(1).should('contain', '한국어')
    cy.get('.language-btn').eq(2).should('contain', '日本語')
  })

  it('should switch languages correctly', () => {
    // Test Korean language switch
    cy.get('.language-btn').eq(1).click()
    cy.get('h1').should('contain', '🏓 Pong Game Project')
    cy.get('p').should('contain', '종합 테스트 및 사용법 가이드 인터페이스')
    
    // Test Japanese language switch
    cy.get('.language-btn').eq(2).click()
    cy.get('h1').should('contain', '🏓 Pong Game Project')
    cy.get('p').should('contain', '総合テスト・使用法ガイドインターフェース')
    
    // Switch back to English
    cy.get('.language-btn').eq(0).click()
    cy.get('p').should('contain', 'Comprehensive Testing & Usage Guide Interface')
  })

  it('should display service status', () => {
    // Check if service status is displayed
    cy.get('#service-status').should('be.visible')
    cy.get('.status-item').should('have.length.at.least', 1)
  })

  it('should have test runner buttons', () => {
    // Check test runner buttons
    cy.get('.btn').should('contain', '🚀 Run All Tests')
    cy.get('.btn').should('contain', '⚡ Unit Tests')
    cy.get('.btn').should('contain', '🔗 Integration Tests')
  })

  it('should run unit tests simulation', () => {
    // Click unit tests button
    cy.get('.btn').contains('⚡ Unit Tests').click()
    
    // Check loading spinner
    cy.get('#loading').should('be.visible')
    cy.get('.spinner').should('be.visible')
    
    // Wait for results
    cy.get('#test-results', { timeout: 10000 }).should('be.visible')
    cy.get('#test-output').should('contain', 'Unit tests completed successfully')
  })

  it('should run integration tests simulation', () => {
    // Click integration tests button
    cy.get('.btn').contains('🔗 Integration Tests').click()
    
    // Check loading spinner
    cy.get('#loading').should('be.visible')
    
    // Wait for results
    cy.get('#test-results', { timeout: 10000 }).should('be.visible')
    cy.get('#test-output').should('contain', 'Integration tests completed successfully')
  })

  it('should run examples simulation', () => {
    // Click run examples button
    cy.get('.btn').contains('📖 Run Examples').click()
    
    // Check loading spinner
    cy.get('#loading').should('be.visible')
    
    // Wait for results
    cy.get('#test-results', { timeout: 10000 }).should('be.visible')
    cy.get('#test-output').should('contain', 'Usage examples executed successfully')
  })

  it('should show documentation', () => {
    // Click view docs button
    cy.get('.btn').contains('📋 View Docs').click()
    
    // Check results
    cy.get('#test-results').should('be.visible')
    cy.get('#test-output').should('contain', 'Documentation loaded successfully')
  })

  it('should open backend and frontend links', () => {
    // Test backend link (should open in new tab)
    cy.get('.btn').contains('🔧 Backend Dev').should('be.visible')
    
    // Test frontend link (should open in new tab)
    cy.get('.btn').contains('🎨 Frontend Dev').should('be.visible')
  })

  it('should show Docker status', () => {
    // Click Docker status button
    cy.get('.btn').contains('🐳 Docker Status').click()
    
    // Check results
    cy.get('#test-results').should('be.visible')
    cy.get('#test-output').should('contain', 'Docker services status')
  })

  it('should refresh service status', () => {
    // Click refresh status button
    cy.get('.btn').contains('🔄 Refresh Status').click()
    
    // Check if status is updated
    cy.get('#service-status').should('be.visible')
  })

  it('should have responsive design', () => {
    // Test on different viewport sizes
    cy.viewport(375, 667) // Mobile
    cy.get('.dashboard').should('be.visible')
    
    cy.viewport(768, 1024) // Tablet
    cy.get('.dashboard').should('be.visible')
    
    cy.viewport(1920, 1080) // Desktop
    cy.get('.dashboard').should('be.visible')
  })

  it('should handle test results display correctly', () => {
    // Run a test to generate results
    cy.get('.btn').contains('⚡ Unit Tests').click()
    
    // Wait for results
    cy.get('#test-results', { timeout: 10000 }).should('be.visible')
    
    // Check result styling
    cy.get('#test-output').should('have.css', 'color', 'rgb(21, 87, 36)') // Green for success
    cy.get('#test-output').should('have.css', 'background-color', 'rgb(212, 237, 218)') // Light green background
  })

  it('should have proper button interactions', () => {
    // Test button hover effects
    cy.get('.btn').first().trigger('mouseover')
    cy.get('.btn').first().should('have.css', 'transform', 'matrix(1, 0, 0, 1, 0, -2)')
    
    // Test button click effects
    cy.get('.btn').first().click()
    cy.get('.btn').first().should('be.visible')
  })
})
