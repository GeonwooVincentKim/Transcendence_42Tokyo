# Testing Guide - Pong Game Project

This document provides comprehensive information about running tests for the Pong Game project, including unit tests, integration tests, and E2E tests.

## Test Overview

The project includes three types of tests:

1. **Backend Unit Tests** - Jest + Supertest for API endpoints
2. **Frontend Unit Tests** - Vitest for React components
3. **E2E Tests** - Cypress for complete user workflows

## Quick Start

### Run All Tests (Recommended)

#### Windows (PowerShell)
```powershell
# From project root
cd srcs
.\run-all-tests.ps1

# Skip E2E tests (unit tests only)
.\run-all-tests.ps1 -SkipE2E

# Run in headless mode
.\run-all-tests.ps1 -Headless
```

#### Linux/macOS (Bash)
```bash
# From project root
cd srcs
chmod +x run-all-tests.sh
./run-all-tests.sh
```

### Manual Test Execution

#### 1. Backend Tests
```bash
cd srcs/services/backend
npm test
```

#### 2. Frontend Unit Tests
```bash
cd srcs/services/frontend
npm test
```

#### 3. E2E Tests
```bash
# First, start the services
cd srcs
docker-compose up --build -d

# Wait for services to be ready (30-60 seconds)
# Then run E2E tests
cd services/frontend
npx cypress open    # Interactive mode
# OR
npx cypress run     # Headless mode
```

## Test Structure

### Backend Tests
```
srcs/services/backend/
├── tests/
│   └── index.test.ts    # API endpoint tests
├── jest.config.js       # Jest configuration
└── package.json         # Test scripts
```

**Test Coverage:**
- Health check endpoint
- API ping endpoint
- Game state endpoint
- CORS configuration
- Error handling

### Frontend Tests
```
srcs/services/frontend/
├── src/
│   └── components/
│       └── __tests__/   # Component tests
├── cypress/
│   ├── e2e/
│   │   └── pong.cy.js   # E2E tests
│   ├── support/
│   │   ├── commands.js  # Custom commands
│   │   └── e2e.js       # Support file
│   └── fixtures/        # Test data
├── cypress.config.js    # Cypress configuration
└── package.json         # Test scripts
```

**Test Coverage:**
- Component rendering
- User interactions
- Game functionality
- Responsive design
- Cross-browser compatibility

## Test Commands

### Backend
```bash
npm test              # Run all tests
npm test -- --watch   # Run tests in watch mode
npm test -- --coverage # Run tests with coverage
```

### Frontend
```bash
npm test              # Run unit tests
npm run test:ui       # Run tests with UI
npm run test:coverage # Run tests with coverage
npm run test:e2e      # Open Cypress Test Runner
npm run test:e2e:run  # Run E2E tests headless
```

## E2E Test Scenarios

The E2E tests cover the following scenarios:

1. **Page Loading**
   - Application loads successfully
   - Game title is displayed
   - Game container is visible

2. **Game Controls**
   - Start button functionality
   - Pause button functionality
   - Reset button functionality

3. **Game State Management**
   - Game state transitions
   - Score display
   - Game status updates

4. **User Interactions**
   - Keyboard input handling
   - Mouse interactions
   - Touch interactions (mobile)

5. **Responsive Design**
   - Mobile viewport testing
   - Tablet viewport testing
   - Desktop viewport testing

6. **Cross-browser Compatibility**
   - Chrome/Chromium
   - Firefox
   - Safari (if available)

## Test Data and Fixtures

### Cypress Fixtures
```
cypress/fixtures/
├── game-state.json    # Sample game state
├── user-actions.json  # User interaction data
└── test-config.json  # Test configuration
```

### Custom Commands
```javascript
// Available in all E2E tests
cy.waitForGameLoad()   // Wait for game to load
cy.startGame()         // Click start button
cy.pauseGame()         // Click pause button
cy.resetGame()         // Click reset button
cy.waitForPageLoad()   // Wait for page to load
cy.clickIfVisible()    // Click if element is visible
cy.typeWithDelay()     // Type with delay
cy.waitForNetworkIdle() // Wait for network idle
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: |
          cd srcs/services/backend
          npm install
          npm test
      - run: |
          cd srcs/services/frontend
          npm install
          npm test
      - run: |
          cd srcs
          docker-compose up --build -d
          sleep 60
          cd services/frontend
          npx cypress run
```

## Troubleshooting

### Common Issues

1. **Docker not running**
   ```bash
   # Start Docker Desktop
   # Or on Linux:
   sudo systemctl start docker
   ```

2. **Port conflicts**
   ```bash
   # Check what's using the port
   netstat -ano | findstr :3000  # Windows
   lsof -i :3000                 # Linux/macOS
   ```

3. **Cypress tests failing**
   - Ensure services are running: `docker-compose ps`
   - Check service logs: `docker-compose logs`
   - Verify base URL in `cypress.config.js`

4. **Test timeouts**
   - Increase timeout in test configuration
   - Add explicit waits for slow operations
   - Check network connectivity

### Debug Mode

#### Cypress Debug
```bash
# Run specific test file
npx cypress run --spec "cypress/e2e/pong.cy.js"

# Run with debug output
DEBUG=cypress:* npx cypress run

# Open browser with dev tools
npx cypress open --browser chrome
```

#### Jest Debug
```bash
# Run specific test
npm test -- --testNamePattern="should return pong message"

# Run with verbose output
npm test -- --verbose
```

## Best Practices

### Writing Tests
1. **Descriptive test names** - Explain what the test does
2. **Independent tests** - Each test should run in isolation
3. **Reliable selectors** - Use `data-testid` attributes
4. **Proper assertions** - Test behavior, not implementation
5. **Clean setup/teardown** - Reset state between tests

### Test Organization
1. **Group related tests** - Use `describe` blocks
2. **Follow naming conventions** - Consistent file and test names
3. **Keep tests focused** - One assertion per test
4. **Use test data** - Externalize test data to fixtures

### Performance
1. **Parallel execution** - Run tests in parallel when possible
2. **Optimize setup** - Minimize setup time
3. **Mock external dependencies** - Avoid network calls in unit tests
4. **Use appropriate timeouts** - Balance speed and reliability

## Coverage Reports

### Backend Coverage
```bash
cd srcs/services/backend
npm test -- --coverage
# Coverage report: coverage/lcov-report/index.html
```

### Frontend Coverage
```bash
cd srcs/services/frontend
npm run test:coverage
# Coverage report: coverage/index.html
```

### E2E Coverage
Cypress doesn't generate traditional coverage reports, but you can:
- View test results in Cypress Dashboard
- Generate screenshots and videos
- Export test results to CI/CD systems

## Contributing to Tests

When adding new features:

1. **Write unit tests** for new components/functions
2. **Add integration tests** for new API endpoints
3. **Create E2E tests** for new user workflows
4. **Update test documentation** if needed
5. **Ensure all tests pass** before submitting PR

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/)
- [Cypress Documentation](https://docs.cypress.io/)
- [Testing Library Documentation](https://testing-library.com/)
- [Supertest Documentation](https://github.com/visionmedia/supertest) 