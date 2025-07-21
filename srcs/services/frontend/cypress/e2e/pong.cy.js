describe('Pong Game E2E', () => {
  it('should show login form and allow login', () => {
    cy.visit('/')
    cy.get('input[placeholder="Enter your username"]').type('testuser')
    cy.get('input[placeholder="Enter your password"]').type('testpassword')
    cy.get('button').contains('Login').click()
    // 로그인 성공 후 메뉴가 보이는지 확인
    cy.contains('Player vs Player (Local)').should('be.visible')
  });

  it('should render PongGame after menu click', () => {
    cy.visit('/')
    // 로그인 과정
    cy.get('input[placeholder="Enter your username"]').type('testuser')
    cy.get('input[placeholder="Enter your password"]').type('testpassword')
    cy.get('button').contains('Login').click()
    // 메뉴에서 Player vs Player 클릭
    cy.contains('Player vs Player (Local)').click()
    // PongGame이 렌더링되는지 확인
    cy.get('[data-testid="game-container"]').should('be.visible')
    // 이후 Start, Pause, Reset 등 컨트롤 테스트
    // cy.get('[data-testid="start-button"]').should('be.visible')
    // cy.get('[data-testid="pause-button"]').should('exist')
    // cy.get('[data-testid="reset-button"]').should('exist')
    // ... 기타 게임 UI 테스트 ...
  });

  // 필요하다면 이후 테스트도 로그인/메뉴 클릭 후 진행
});
