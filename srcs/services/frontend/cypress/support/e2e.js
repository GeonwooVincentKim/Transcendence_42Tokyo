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

// Add custom commands for Pong game testing
Cypress.Commands.add('waitForGameLoad', () => {
  cy.get('[data-testid="game-container"]', { timeout: 10000 }).should('be.visible')
})

Cypress.Commands.add('startGame', () => {
  cy.get('[data-testid="start-button"]').click()
})

Cypress.Commands.add('pauseGame', () => {
  cy.get('[data-testid="pause-button"]').click()
})

Cypress.Commands.add('resetGame', () => {
  cy.get('[data-testid="reset-button"]').click()
}) 