// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to wait for page load
Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('body').should('be.visible')
})

// Custom command to check if element is visible and clickable
Cypress.Commands.add('clickIfVisible', (selector) => {
  cy.get(selector).should('be.visible').and('not.be.disabled').click()
})

// Custom command to type with delay (for better test stability)
Cypress.Commands.add('typeWithDelay', (selector, text, delay = 100) => {
  cy.get(selector).clear().type(text, { delay })
})

// Custom command to wait for network requests to complete
Cypress.Commands.add('waitForNetworkIdle', (timeout = 5000) => {
  cy.wait(timeout)
}) 