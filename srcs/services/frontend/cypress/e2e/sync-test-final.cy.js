describe('Tournament Synchronization Test', () => {
  let user1Token, user2Token;
  let tournamentId;

  before(() => {
    // Clean up any existing data
    cy.request('DELETE', 'http://localhost:8000/api/tournaments/cleanup');
  });

  it('should test tournament and game synchronization', () => {
    // Step 1: Register and login two users
    cy.request({
      method: 'POST',
      url: 'http://localhost:8000/api/auth/register',
      body: {
        username: 'syncuser1',
        email: 'syncuser1@test.com',
        password: 'password123'
      }
    });

    cy.request({
      method: 'POST',
      url: 'http://localhost:8000/api/auth/register',
      body: {
        username: 'syncuser2',
        email: 'syncuser2@test.com',
        password: 'password123'
      }
    });

    // Login user 1
    cy.request({
      method: 'POST',
      url: 'http://localhost:8000/api/auth/login',
      body: {
        username: 'syncuser1',
        password: 'password123'
      }
    }).then((response) => {
      user1Token = response.body.token;
      expect(response.status).to.eq(200);
    });

    // Login user 2
    cy.request({
      method: 'POST',
      url: 'http://localhost:8000/api/auth/login',
      body: {
        username: 'syncuser2',
        password: 'password123'
      }
    }).then((response) => {
      user2Token = response.body.token;
      expect(response.status).to.eq(200);
    });

    // Step 2: Create tournament
    cy.request({
      method: 'POST',
      url: 'http://localhost:8000/api/tournaments',
      headers: {
        'Authorization': `Bearer ${user1Token}`
      },
      body: {
        name: 'Sync Test Tournament',
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

    // Step 4: Test tournament state polling
    cy.request({
      method: 'GET',
      url: `http://localhost:8000/api/tournaments/${tournamentId}/state`,
      headers: {
        'Authorization': `Bearer ${user1Token}`
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.tournament).to.exist;
      expect(response.body.participants).to.have.length(2);
      cy.log('Tournament state polling works');
    });

    // Step 5: Start tournament
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

    // Step 6: Get current match
    cy.request({
      method: 'GET',
      url: `http://localhost:8000/api/tournaments/${tournamentId}/current-match`,
      headers: {
        'Authorization': `Bearer ${user1Token}`
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      const matchId = response.body.match.id;
      cy.log(`Current match ID: ${matchId}`);

      // Step 7: Test game state polling (should create game room automatically)
      cy.request({
        method: 'GET',
        url: `http://localhost:8000/api/game/${tournamentId}/${matchId}/state?userId=1`
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.roomState).to.exist;
        expect(response.body.gameControl).to.exist;
        cy.log('Game state polling works - game room created automatically');
      });

      // Step 8: Test player ready status
      cy.request({
        method: 'POST',
        url: `http://localhost:8000/api/game/${tournamentId}/${matchId}/ready`,
        body: {
          userId: '1',
          ready: true
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.roomState).to.exist;
        cy.log('Player ready status updated');
      });

      // Step 9: Test game control
      cy.request({
        method: 'POST',
        url: `http://localhost:8000/api/game/${tournamentId}/${matchId}/control`,
        body: {
          userId: '1',
          action: 'start'
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.message).to.include('Game control updated');
        cy.log('Game control (start) works');
      });

      // Step 10: Test pause
      cy.request({
        method: 'POST',
        url: `http://localhost:8000/api/game/${tournamentId}/${matchId}/control`,
        body: {
          userId: '1',
          action: 'pause'
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        cy.log('Game control (pause) works');
      });

      // Step 11: Test reset
      cy.request({
        method: 'POST',
        url: `http://localhost:8000/api/game/${tournamentId}/${matchId}/control`,
        body: {
          userId: '1',
          action: 'reset'
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        cy.log('Game control (reset) works');
      });
    });

    cy.log('✅ All synchronization tests passed!');
  });
});
