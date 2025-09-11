describe('Simple API Test', () => {
  it('should test basic API functionality', () => {
    // Test 1: Register a user
    cy.request({
      method: 'POST',
      url: 'http://localhost:8000/api/auth/register',
      body: {
        username: 'testuser1',
        email: 'testuser1@test.com',
        password: 'password123'
      }
    }).then((response) => {
      expect(response.status).to.eq(201);
      cy.log('User registration successful');
    });

    // Test 2: Login
    cy.request({
      method: 'POST',
      url: 'http://localhost:8000/api/auth/login',
      body: {
        username: 'testuser1',
        password: 'password123'
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.token).to.exist;
      const token = response.body.token;
      cy.log('Login successful, token:', token);

      // Test 3: Create tournament
      cy.request({
        method: 'POST',
        url: 'http://localhost:8000/api/tournaments',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: {
          name: 'Test Tournament',
          maxParticipants: 2
        }
      }).then((response) => {
        expect(response.status).to.eq(201);
        const tournamentId = response.body.id;
        cy.log('Tournament created with ID:', tournamentId);

        // Test 4: Start tournament
        cy.request({
          method: 'POST',
          url: `http://localhost:8000/api/tournaments/${tournamentId}/start`,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200);
          cy.log('Tournament started successfully');

          // Test 5: Get current match
          cy.request({
            method: 'GET',
            url: `http://localhost:8000/api/tournaments/${tournamentId}/current-match`,
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }).then((response) => {
            expect(response.status).to.eq(200);
            const matchId = response.body.match.id;
            cy.log('Current match ID:', matchId);

            // Test 6: Test game state API
            cy.request({
              method: 'GET',
              url: `http://localhost:8000/api/game/${tournamentId}/${matchId}/state?userId=1`
            }).then((response) => {
              expect(response.status).to.eq(200);
              expect(response.body.roomState).to.exist;
              cy.log('Game state API working');

              // Test 7: Test ready API
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
                cy.log('Ready API working - player1 ready');

                // Test 8: Test game control API
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
                  cy.log('Game control API working - game started');
                });
              });
            });
          });
        });
      });
    });
  });
});
