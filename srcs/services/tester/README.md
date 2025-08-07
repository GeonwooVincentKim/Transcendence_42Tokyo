# Tester Service

Comprehensive testing framework for the Pong Game Project.

## Overview

The Tester service provides a unified testing environment for:
- **Unit Tests**: Jest-based tests for API endpoints and business logic
- **E2E Tests**: Cypress-based tests for complete user workflows
- **Integration Tests**: Tests for service interactions
- **Performance Tests**: Response time and load testing

## Quick Start

### Installation
```bash
cd srcs/services/tester
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Types
```bash
# Unit tests only
npm run test:unit

# E2E tests only
npm run test:e2e

# With coverage
npm run test:coverage
```

## Test Structure

```
srcs/services/tester/
├── src/
│   ├── tests/           # Test files
│   │   ├── api.test.ts  # API endpoint tests
│   │   ├── unit.test.ts # Unit tests
│   │   └── perf.test.ts # Performance tests
│   ├── utils/           # Test utilities
│   │   └── testHelpers.ts
│   └── setup.ts         # Test setup
├── cypress/
│   ├── e2e/            # E2E test files
│   └── support/        # Cypress support files
├── jest.config.js      # Jest configuration
├── cypress.config.js   # Cypress configuration
└── package.json        # Dependencies and scripts
```

## Test Categories

### 1. Unit Tests
- **Location**: `src/tests/`
- **Framework**: Jest
- **Purpose**: Test individual functions and components
- **Coverage**: Business logic, utilities, helpers

### 2. API Tests
- **Location**: `src/tests/api.test.ts`
- **Framework**: Jest + Axios
- **Purpose**: Test API endpoints and responses
- **Coverage**: HTTP status codes, response data, error handling

### 3. E2E Tests
- **Location**: `cypress/e2e/`
- **Framework**: Cypress
- **Purpose**: Test complete user workflows
- **Coverage**: User interactions, UI behavior, cross-browser compatibility

### 4. Performance Tests
- **Location**: `src/tests/perf.test.ts`
- **Framework**: Jest + Custom metrics
- **Purpose**: Test response times and load handling
- **Coverage**: Response time limits, concurrent requests

## Test Utilities

### TestClient
HTTP client with retry logic and error handling:
```typescript
import { TestClient } from '../utils/testHelpers';

const client = new TestClient({
  baseUrl: 'http://localhost:8000',
  timeout: 5000,
  retries: 3
});

const response = await client.get('/api/health');
```

### TestDataGenerator
Generate test data for consistent testing:
```typescript
import { TestDataGenerator } from '../utils/testHelpers';

const userData = TestDataGenerator.randomUser();
const gameState = TestDataGenerator.randomGameState();
```

### TestAssertions
Common assertion helpers:
```typescript
import { TestAssertions } from '../utils/testHelpers';

TestAssertions.expectStatus(response, 200);
TestAssertions.expectData(response);
TestAssertions.expectField(response, 'status');
```

## Configuration

### Environment Variables
Create `.env` file in the tester directory:
```env
TEST_BASE_URL=http://localhost:8000
TEST_TIMEOUT=10000
TEST_RETRIES=3
NODE_ENV=test
```

### Jest Configuration
- **Timeout**: 10 seconds per test
- **Coverage**: HTML and LCOV reports
- **Setup**: Automatic environment setup
- **Mocking**: Automatic mock restoration

### Cypress Configuration
- **Base URL**: http://localhost:3000
- **Viewport**: 1280x720
- **Video**: Enabled
- **Screenshots**: On failure
- **Timeouts**: 10 seconds

## Writing Tests

### Unit Test Example
```typescript
describe('User Service', () => {
  it('should create user successfully', async () => {
    const userData = TestDataGenerator.randomUser();
    const result = await userService.createUser(userData);
    
    expect(result).toBeDefined();
    expect(result.username).toBe(userData.username);
  });
});
```

### API Test Example
```typescript
describe('Auth API', () => {
  it('should register new user', async () => {
    const userData = TestDataGenerator.randomUser();
    const response = await client.post('/api/auth/register', userData);
    
    TestAssertions.expectStatus(response, 201);
    TestAssertions.expectField(response, 'token');
  });
});
```

### E2E Test Example
```javascript
describe('Game Flow', () => {
  it('should complete full game cycle', () => {
    cy.visit('/');
    cy.get('[data-testid="start-button"]').click();
    cy.get('[data-testid="game-status"]').should('contain', 'playing');
    cy.get('[data-testid="pause-button"]').click();
    cy.get('[data-testid="game-status"]').should('contain', 'paused');
  });
});
```

## Best Practices

### Test Organization
1. **Group related tests** using `describe` blocks
2. **Use descriptive test names** that explain the behavior
3. **Keep tests independent** and isolated
4. **Follow naming conventions** consistently

### Test Data
1. **Use TestDataGenerator** for consistent test data
2. **Clean up test data** after tests
3. **Use unique identifiers** to avoid conflicts
4. **Mock external dependencies** when appropriate

### Assertions
1. **Test behavior, not implementation**
2. **Use specific assertions** rather than generic ones
3. **Check error conditions** and edge cases
4. **Validate response structure** and data types

### Performance
1. **Set appropriate timeouts** for different test types
2. **Use parallel execution** when possible
3. **Mock slow operations** in unit tests
4. **Monitor test execution time**

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
          cd srcs/services/tester
          npm install
          npm test
```

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout in configuration
   - Check if services are running
   - Verify network connectivity

2. **E2E tests failing**
   - Ensure frontend is running on port 3000
   - Check if backend is running on port 8000
   - Verify Docker containers are up

3. **API tests failing**
   - Check if backend service is accessible
   - Verify API endpoints are correct
   - Check authentication requirements

### Debug Mode
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- --testNamePattern="should create user"

# Run with debug logging
DEBUG=* npm test
```

## Contributing

When adding new tests:

1. **Follow existing patterns** and conventions
2. **Add appropriate test data** using TestDataGenerator
3. **Use TestAssertions** for common checks
4. **Update documentation** if needed
5. **Ensure all tests pass** before submitting

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Cypress Documentation](https://docs.cypress.io/)
- [Testing Best Practices](https://testing-library.com/docs/guiding-principles)
