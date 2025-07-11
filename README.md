# Frontend - Pong Game

React + TypeScript + TailwindCSS frontend for the Pong game project.

## Prerequisites

- Node.js 18+
- npm or yarn

## Quick Start

### Installation
```bash
cd srcs/services/frontend
npm install
```

### Development
```bash
npm run dev
```
The application will be available at http://localhost:3000

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check code quality
- `npm run test` - Run unit tests with Vitest
- `npm run test:e2e` - Run E2E tests with Cypress (requires running services first)

## Project Structure

```
srcs/services/frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript type definitions
│   ├── styles/         # CSS and Tailwind styles
│   ├── App.tsx         # Main App component
│   └── main.tsx        # Application entry point
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

## Technologies Used

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **ESLint** - Code linting
- **Vitest** - Unit testing framework
- **Cypress** - E2E testing framework

## Development

### Adding New Components
Create new components in `src/components/` directory:
```tsx
// src/components/Example.tsx
import React from 'react';

interface ExampleProps {
  title: string;
}

export const Example: React.FC<ExampleProps> = ({ title }) => {
  return (
    <div className="p-4 bg-blue-500 text-white rounded">
      {title}
    </div>
  );
};
```

### Adding New Pages
Create new pages in `src/pages/` directory and update routing in `App.tsx`.

### Styling
Use TailwindCSS classes for styling. Custom CSS can be added in `src/styles/`.

## Environment Variables

Create a `.env` file in the frontend directory for environment-specific variables:
```
VITE_API_URL=http://localhost:8000
VITE_APP_TITLE=Pong Game
```

## Testing

### Unit Tests
Run unit tests with Vitest:
```bash
npm run test
```

### E2E Tests
End-to-End tests are implemented using Cypress to test the complete user workflow.

#### Prerequisites
Before running E2E tests, ensure all services are running:
```bash
# From the project root directory
cd srcs
docker-compose up --build
```

#### Running E2E Tests
1. **Open Cypress Test Runner (Interactive Mode):**
   ```bash
   npx cypress open
   ```
   This opens the Cypress Test Runner where you can:
   - View all test files
   - Run tests in browser mode
   - Debug tests step by step
   - View test results and screenshots

2. **Run E2E Tests in Headless Mode:**
   ```bash
   npx cypress run
   ```
   This runs all tests in the background and generates reports.

#### E2E Test Structure
```
cypress/
├── e2e/                 # E2E test files
│   └── pong.cy.js      # Main Pong game E2E tests
├── fixtures/            # Test data files
└── support/             # Custom commands and utilities
```

#### Writing E2E Tests
Create new test files in `cypress/e2e/` with the `.cy.js` extension:
```javascript
describe('Feature Name', () => {
  it('should perform specific action', () => {
    cy.visit('http://localhost:3000');
    cy.get('[data-testid="element"]').click();
    cy.contains('Expected Text').should('be.visible');
  });
});
```

#### Best Practices for E2E Tests
- Use descriptive test names that explain the user behavior
- Test complete user workflows, not just individual components
- Use `data-testid` attributes for reliable element selection
- Avoid testing implementation details
- Keep tests independent and isolated
- Use custom commands for common operations

## Contributing

1. Follow TypeScript best practices
2. Use TailwindCSS for styling
3. Write meaningful component and function names
4. Add proper TypeScript interfaces for props
5. Run `npm run lint` before committing
6. Write unit tests for new components
7. Add E2E tests for new user workflows

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the port in `vite.config.ts` or kill the process using the port
2. **TypeScript errors**: Run `npm run build` to see all TypeScript errors
3. **TailwindCSS not working**: Ensure `tailwind.config.js` is properly configured

### Getting Help

- Check the browser console for errors
- Verify all dependencies are installed with `npm install`
- Ensure Node.js version is 18+ with `node -v`