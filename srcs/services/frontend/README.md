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

## Contributing

1. Follow TypeScript best practices
2. Use TailwindCSS for styling
3. Write meaningful component and function names
4. Add proper TypeScript interfaces for props
5. Run `npm run lint` before committing

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the port in `vite.config.ts` or kill the process using the port
2. **TypeScript errors**: Run `npm run build` to see all TypeScript errors
3. **TailwindCSS not working**: Ensure `tailwind.config.js` is properly configured

### Getting Help

- Check the browser console for errors
- Verify all dependencies are installed with `npm install`
- Ensure Node.js version is 18+ with `node -v`
