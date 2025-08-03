describe('Pong Game E2E', () => {
  const username = 'testuser';
  const password = 'testpassword';
  const email = 'testuser@example.com';

  it('should register (if needed) and login, then show menu', () => {
    cy.visit('/');
    cy.wait(1000);
    // 회원가입 시도
    cy.contains('Register here').click();
    cy.get('input[placeholder="Choose a username (3-20 characters)"]').type(username);
    cy.get('input[placeholder="Enter your email address"]').type(email);
    cy.get('input[placeholder="Choose a password (min 6 characters)"]').type(password);
    cy.get('input[placeholder="Confirm your password"]').type(password);
    cy.get('button').contains('Register').click();
    // 이미 계정이 있으면 로그인 폼으로 이동
    cy.get('body').then($body => {
      if ($body.text().includes('Already have an account?')) {
        cy.contains('Login here').click();
        cy.get('input[placeholder="Enter your username"]').type(username);
        cy.get('input[placeholder="Enter your password"]').type(password);
        cy.get('button[type="submit"]').contains(/login/i).click();
      }
    });
    // 메뉴가 보이는지 확인
    cy.contains('Player vs Player (Local)').should('be.visible');
  });

  it('should render PongGame after menu click', () => {
    cy.visit('/');
    cy.wait(1000);
    // 로그인/회원가입 과정 재사용
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
    // 메뉴에서 Player vs Player 클릭
    cy.contains('Player vs Player (Local)').click();
    cy.get('[data-testid="game-container"]').should('be.visible');
  });
});
