describe('Real Tournament Synchronization Test', () => {
  let user1Token, user2Token;
  let tournamentId, matchId;

  before(() => {
    // Clean up any existing data - skip if cleanup endpoint doesn't exist
    cy.request({
      method: 'DELETE',
      url: 'http://localhost:8000/api/tournaments/cleanup',
      failOnStatusCode: false
    });
  });

  it('should test real tournament and game synchronization with two browsers', () => {
    // Step 1: Register and login two users
    cy.request({
      method: 'POST',
      url: 'http://localhost:8000/api/auth/register',
      body: {
        username: 'cypressuser1',
        email: 'cypressuser1@test.com',
        password: 'password123'
      }
    });

    cy.request({
      method: 'POST',
      url: 'http://localhost:8000/api/auth/register',
      body: {
        username: 'cypressuser2',
        email: 'cypressuser2@test.com',
        password: 'password123'
      }
    });

    // Login user 1
    cy.request({
      method: 'POST',
      url: 'http://localhost:8000/api/auth/login',
      body: {
        username: 'cypressuser1',
        password: 'password123'
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      user1Token = response.body.token;
      cy.log('User 1 token:', user1Token);
    });

    // Login user 2
    cy.request({
      method: 'POST',
      url: 'http://localhost:8000/api/auth/login',
      body: {
        username: 'cypressuser2',
        password: 'password123'
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      user2Token = response.body.token;
      cy.log('User 2 token:', user2Token);
    });

    // Step 2: Create tournament
    cy.request({
      method: 'POST',
      url: 'http://localhost:8000/api/tournaments',
      headers: {
        'Authorization': `Bearer ${user1Token}`
      },
      body: {
        name: 'Cypress Sync Test Tournament',
        maxParticipants: 2
      }
    }).then((response) => {
      tournamentId = response.body.tournament.id;
      expect(response.status).to.eq(201);
      cy.log(`Tournament created with ID: ${tournamentId}`);
    });

    // Step 3: User 2 joins tournament
    cy.request({
      method: 'POST',
      url: `http://localhost:8000/api/tournaments/${tournamentId}/join`,
      headers: {
        'Authorization': `Bearer ${user2Token}`
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      cy.log('User 2 joined tournament');
    });

    // Step 4: Start tournament
    cy.request({
      method: 'POST',
      url: `http://localhost:8000/api/tournaments/${tournamentId}/start`,
      headers: {
        'Authorization': `Bearer ${user1Token}`
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      cy.log('Tournament started');
    });

    // Step 5: Get current match
    cy.request({
      method: 'GET',
      url: `http://localhost:8000/api/tournaments/${tournamentId}/current-match`,
      headers: {
        'Authorization': `Bearer ${user1Token}`
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      matchId = response.body.match.id;
      cy.log(`Current match ID: ${matchId}`);
    });

    // Step 6: Test game state polling
    cy.request({
      method: 'GET',
      url: `http://localhost:8000/api/game/${tournamentId}/${matchId}/state?userId=1`
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.roomState).to.exist;
      cy.log('Game state polling works');
    });

    // Step 7: Test player ready status - User 1
    cy.request({
      method: 'POST',
      url: `http://localhost:8000/api/game/${tournamentId}/${matchId}/ready`,
      body: {
        userId: '1',
        ready: true
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.roomState.player1Ready).to.be.true;
      cy.log('User 1 ready status updated');
    });

    // Step 8: Test player ready status - User 2
    cy.request({
      method: 'POST',
      url: `http://localhost:8000/api/game/${tournamentId}/${matchId}/ready`,
      body: {
        userId: '2',
        ready: true
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.roomState.player1Ready).to.be.true;
      expect(response.body.roomState.player2Ready).to.be.true;
      cy.log('User 2 ready status updated - both players ready');
    });

    // Step 9: Test game control - start
    cy.request({
      method: 'POST',
      url: `http://localhost:8000/api/game/${tournamentId}/${matchId}/control`,
      body: {
        userId: '1',
        action: 'start'
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.gameControl.isStarted).to.be.true;
      cy.log('Game started successfully');
    });

    // Step 10: Verify final game state
    cy.request({
      method: 'GET',
      url: `http://localhost:8000/api/game/${tournamentId}/${matchId}/state?userId=1`
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.roomState.player1Ready).to.be.true;
      expect(response.body.roomState.player2Ready).to.be.true;
      expect(response.body.gameControl.isStarted).to.be.true;
      cy.log('Final game state verified - synchronization working');
    });

    cy.log('✅ All synchronization tests passed!');
  });
});
