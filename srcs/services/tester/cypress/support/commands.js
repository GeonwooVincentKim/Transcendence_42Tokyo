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
Cypress.Commands.add('checkElement', (selector) => {
  cy.get(selector).should('be.visible')
  cy.get(selector).should('not.be.disabled')
})

// Custom command to test responsive design
Cypress.Commands.add('testResponsive', (width, height) => {
  cy.viewport(width, height)
  cy.get('body').should('be.visible')
})

// Custom command to test API endpoint
Cypress.Commands.add('testAPI', (url, expectedStatus = 200) => {
  cy.request(url).then((response) => {
    expect(response.status).to.eq(expectedStatus)
  })
})
