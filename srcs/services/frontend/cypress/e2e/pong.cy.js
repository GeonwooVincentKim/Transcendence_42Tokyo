describe('Pong Game E2E', () => {
  const username = 'testuser';
  const password = 'testpassword';
  const email = 'testuser@example.com';

  beforeEach(() => {
    cy.visit('/');
    cy.wait(1000);
    // 회원가입 및 로그인 후 메뉴 진입
    cy.contains('Register here').click();
    cy.get('input[placeholder="Choose a username (3-20 characters)"]').type(username);
    cy.get('input[placeholder="Enter your email address"]').type(email);
    cy.get('input[placeholder="Choose a password (min 6 characters)"]').type(password);
    cy.get('input[placeholder="Confirm your password"]').type(password);
    cy.get('button').contains('Register').click();
    cy.get('body').then($body => {
      if ($body.text().includes('Already have an account?')) {
        cy.contains('Login here').click();
        cy.get('input[placeholder="Enter your username"]').type(username);
        cy.get('input[placeholder="Enter your password"]').type(password);
        cy.get('button[type="submit"]').contains(/login/i).click();
      }
    });
    cy.contains('Player vs Player (Local)').click();
  });

  it('should render the game title', () => {
    cy.contains('Player vs. Player').should('be.visible');
  });

  it('should render the game canvas', () => {
    cy.get('canvas[aria-label="Pong game canvas"]').should('exist');
  });

  it('should display control instructions', () => {
    cy.contains('Left Player: W (up) / S (down)').should('be.visible');
    cy.contains('Right Player: ARROWUP (up) / ARROWDOWN (down)').should('be.visible');
  });

  it('should render with default dimensions', () => {
    cy.get('canvas[aria-label="Pong game canvas"]')
      .should('have.attr', 'width', '800')
      .and('have.attr', 'height', '400');
  });

  it('should have proper component structure', () => {
    cy.contains('Player vs. Player')
      .closest('div')
      .should('have.class', 'flex')
      .and('have.class', 'flex-col')
      .and('have.class', 'items-center');
    cy.get('canvas[aria-label="Pong game canvas"]')
      .should('have.class', 'border')
      .and('have.class', 'border-white');
  });
});
