// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add custom commands for the Pong Game Project
Cypress.Commands.add('checkServiceStatus', () => {
  cy.visit('http://localhost:8080')
  cy.get('.btn').contains('🔄 Refresh Status').click()
  cy.get('#service-status').should('be.visible')
})

Cypress.Commands.add('runUnitTests', () => {
  cy.visit('http://localhost:8080')
  cy.get('.btn').contains('⚡ Unit Tests').click()
  cy.get('#test-results', { timeout: 10000 }).should('be.visible')
  cy.get('#test-output').should('contain', 'Unit tests completed successfully')
})

Cypress.Commands.add('switchLanguage', (language) => {
  const languageIndex = {
    'en': 0,
    'ko': 1,
    'jp': 2
  }
  cy.get('.language-btn').eq(languageIndex[language]).click()
})
