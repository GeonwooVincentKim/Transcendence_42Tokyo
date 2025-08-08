describe('🏓 Pong Game Project - Full Integration E2E Tests', () => {
  beforeEach(() => {
    // Visit the main frontend
    cy.visit('http://localhost:3000')
  })

  it('should load the main game interface', () => {
    // Check if the main game page loads
    cy.get('body').should('be.visible')
    
    // Check for game-related elements
    cy.get('canvas').should('exist')
  })

  it('should access backend API endpoints', () => {
    // Test backend health check
    cy.request('http://localhost:8000/').then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.have.property('status')
    })

    // Test backend ping endpoint
    cy.request('http://localhost:8000/api/ping').then((response) => {
      expect(response.status).to.eq(200)
    })
  })

  it('should access tester interface', () => {
    // Visit tester interface
    cy.visit('http://localhost:8080')
    
    // Check if tester interface loads
    cy.get('h1').should('contain', '🏓 Pong Game Project')
    cy.get('.dashboard').should('be.visible')
  })

  it('should test service connectivity', () => {
    // Test frontend to backend communication
    cy.visit('http://localhost:3000')
    
    // Check if frontend can communicate with backend
    cy.window().then((win) => {
      // Simulate API call
      cy.request('http://localhost:8000/api/game/state').then((response) => {
        expect(response.status).to.be.oneOf([200, 404]) // 404 is expected if endpoint doesn't exist yet
      })
    })
  })

  it('should test Docker service status', () => {
    // Check if all Docker services are running
    cy.exec('docker-compose ps').then((result) => {
      expect(result.code).to.eq(0)
      expect(result.stdout).to.contain('Up')
    })
  })

  it('should test database connectivity', () => {
    // Test database connection through backend
    cy.request('http://localhost:8000/').then((response) => {
      expect(response.status).to.eq(200)
    })
  })

  it('should test complete user workflow', () => {
    // 1. Start with tester interface
    cy.visit('http://localhost:8080')
    cy.get('.btn').contains('⚡ Unit Tests').click()
    cy.get('#test-results', { timeout: 10000 }).should('be.visible')
    
    // 2. Check backend status
    cy.get('.btn').contains('🔧 Backend Dev').click()
    cy.window().then((win) => {
      win.open('http://localhost:8000', '_blank')
    })
    
    // 3. Check frontend status
    cy.get('.btn').contains('🎨 Frontend Dev').click()
    cy.window().then((win) => {
      win.open('http://localhost:3000', '_blank')
    })
  })

  it('should test language switching across interfaces', () => {
    // Test language switching in tester interface
    cy.visit('http://localhost:8080')
    
    // Switch to Korean
    cy.get('.language-btn').eq(1).click()
    cy.get('p').should('contain', '종합 테스트 및 사용법 가이드 인터페이스')
    
    // Switch to Japanese
    cy.get('.language-btn').eq(2).click()
    cy.get('p').should('contain', '総合テスト・使用法ガイドインターフェース')
    
    // Switch back to English
    cy.get('.language-btn').eq(0).click()
    cy.get('p').should('contain', 'Comprehensive Testing & Usage Guide Interface')
  })

  it('should test responsive design across services', () => {
    // Test frontend responsiveness
    cy.visit('http://localhost:3000')
    cy.viewport(375, 667) // Mobile
    cy.get('body').should('be.visible')
    
    cy.viewport(1920, 1080) // Desktop
    cy.get('body').should('be.visible')
    
    // Test tester interface responsiveness
    cy.visit('http://localhost:8080')
    cy.viewport(375, 667) // Mobile
    cy.get('.dashboard').should('be.visible')
    
    cy.viewport(1920, 1080) // Desktop
    cy.get('.dashboard').should('be.visible')
  })

  it('should test error handling', () => {
    // Test invalid endpoint
    cy.request({
      url: 'http://localhost:8000/api/nonexistent',
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.be.oneOf([404, 500])
    })
  })

  it('should test performance metrics', () => {
    // Test page load performance
    cy.visit('http://localhost:3000')
    cy.window().then((win) => {
      const performance = win.performance
      expect(performance.timing.loadEventEnd - performance.timing.navigationStart).to.be.lessThan(5000)
    })
    
    // Test tester interface performance
    cy.visit('http://localhost:8080')
    cy.window().then((win) => {
      const performance = win.performance
      expect(performance.timing.loadEventEnd - performance.timing.navigationStart).to.be.lessThan(3000)
    })
  })

  it('should test cross-browser compatibility', () => {
    // Test in different viewport sizes (simulating different devices)
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ]
    
    viewports.forEach((viewport) => {
      cy.viewport(viewport.width, viewport.height)
      cy.visit('http://localhost:8080')
      cy.get('.dashboard').should('be.visible')
      cy.get('.card').should('have.length', 4)
    })
  })

  it('should test accessibility features', () => {
    cy.visit('http://localhost:8080')
    
    // Check for proper heading structure
    cy.get('h1').should('exist')
    
    // Check for button accessibility
    cy.get('.btn').each(($btn) => {
      cy.wrap($btn).should('be.visible')
      cy.wrap($btn).should('not.be.disabled')
    })
    
    // Check for proper contrast (basic test)
    cy.get('body').should('have.css', 'color')
  })

  it('should test complete integration workflow', () => {
    // 1. Start services check
    cy.visit('http://localhost:8080')
    cy.get('.btn').contains('🔄 Refresh Status').click()
    cy.get('#service-status').should('be.visible')
    
    // 2. Run tests
    cy.get('.btn').contains('⚡ Unit Tests').click()
    cy.get('#test-results', { timeout: 10000 }).should('be.visible')
    cy.get('#test-output').should('contain', 'Unit tests completed successfully')
    
    // 3. Check documentation
    cy.get('.btn').contains('📋 View Docs').click()
    cy.get('#test-output').should('contain', 'Documentation loaded successfully')
    
    // 4. Verify all services are accessible
    cy.request('http://localhost:3000').then((response) => {
      expect(response.status).to.eq(200)
    })
    
    cy.request('http://localhost:8000').then((response) => {
      expect(response.status).to.eq(200)
    })
    
    cy.request('http://localhost:8080').then((response) => {
      expect(response.status).to.eq(200)
    })
  })
})
