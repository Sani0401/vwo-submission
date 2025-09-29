# Financial Document Scanner - Frontend

A modern React application for financial document analysis with AI-powered insights.

## Features

- **User Authentication**: Secure login and registration
- **Document Management**: Upload, view, and manage financial documents
- **AI Analysis**: Get comprehensive financial insights from documents
- **Dashboard**: View analytics and statistics
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **React Router** for navigation
- **React Hook Form** for form handling
- **Axios** for API calls

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env.local
```

3. Update environment variables in `.env.local`:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Type Checking

```bash
npm run type-check
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (buttons, inputs, etc.)
│   ├── Auth/           # Authentication components
│   └── Layout/         # Layout components
├── contexts/           # React contexts for state management
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
├── pages/              # Page components
├── services/           # API services
└── types/              # TypeScript type definitions
```

## Key Components

- **ErrorBoundary**: Catches and handles React errors gracefully
- **LoadingSpinner**: Reusable loading component
- **useApi**: Custom hook for API calls with loading states
- **API Services**: Organized API calls by feature

## Environment Variables

- `VITE_API_BASE_URL`: Backend API base URL
- `VITE_DEV_MODE`: Enable development mode features

## Contributing

1. Follow the existing code style
2. Use TypeScript for type safety
3. Write meaningful component and function names
4. Keep components small and focused
5. Use the established project structure
