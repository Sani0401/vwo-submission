# VWO Assessment - Financial Document Analyzer

A comprehensive full-stack application for analyzing financial documents using AI-powered insights. This project demonstrates advanced React frontend development with a robust FastAPI backend.

## 🚀 Live Demo

- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI + Python
- **Database**: MongoDB
- **AI Integration**: OpenAI GPT + CrewAI
- **Authentication**: JWT-based auth system

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [API Documentation](#api-documentation)
- [Frontend Components](#frontend-components)
- [Backend Architecture](#backend-architecture)
- [Key Features Demonstrated](#key-features-demonstrated)
- [Screenshots](#screenshots)
- [Contributing](#contributing)

## ✨ Features

### Frontend Features
- **Modern UI/UX**: Glassmorphism design with smooth animations
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Authentication**: Secure login/signup with JWT tokens
- **Document Management**: Upload, view, and manage financial documents
- **Real-time Analysis**: AI-powered document analysis with progress tracking
- **Dashboard**: Comprehensive analytics and insights
- **File Upload**: Drag-and-drop interface with progress indicators
- **Search & Filter**: Advanced filtering and search capabilities

### Backend Features
- **RESTful API**: Well-structured FastAPI endpoints
- **Authentication**: JWT-based security with role-based access
- **Document Processing**: Multi-format file support (PDF, Excel, CSV, Word)
- **AI Integration**: OpenAI GPT-4 with CrewAI for document analysis
- **Database**: MongoDB with optimized queries
- **Caching**: Redis for performance optimization
- **Rate Limiting**: API protection and throttling
- **Error Handling**: Comprehensive error management
- **Logging**: Structured logging system

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations
- **React Router** - Client-side routing
- **React Hook Form** - Form management
- **Axios** - HTTP client
- **React Dropzone** - File upload handling
- **Lucide React** - Modern icon library

### Backend
- **FastAPI** - Modern Python web framework
- **Python 3.9+** - Core language
- **MongoDB** - NoSQL database
- **Redis** - Caching and session storage
- **OpenAI API** - AI document analysis
- **CrewAI** - AI agent orchestration
- **Pydantic** - Data validation
- **JWT** - Authentication tokens
- **Uvicorn** - ASGI server
- **Pillow** - Image processing

## 📁 Project Structure

```
vwo-submission/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ui/         # Base UI components
│   │   │   ├── Auth/       # Authentication components
│   │   │   └── Layout/     # Layout components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   ├── lib/           # Utility functions
│   │   └── types/         # TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── api/           # API routes and endpoints
│   │   ├── services/      # Business logic
│   │   ├── repositories/  # Data access layer
│   │   ├── models/        # Data models
│   │   ├── ai/           # AI integration
│   │   ├── middleware/    # Custom middleware
│   │   └── utils/        # Utility functions
│   ├── main.py           # Application entry point
│   ├── requirements.txt  # Python dependencies
│   └── .env.example     # Environment variables template
└── README.md
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- MongoDB (local or Atlas)
- Redis (optional, for caching)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sani0401/vwo-submission.git
   cd vwo-submission/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration:
   # - MONGODB_URL=your_mongodb_connection_string
   # - OPENAI_API_KEY=your_openai_api_key
   # - JWT_SECRET_KEY=your_secret_key
   ```

5. **Run the backend**
   ```bash
   python main.py
   ```
   Backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   Frontend will be available at `http://localhost:5173`

## 📚 API Documentation

### Authentication Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - User logout

### Document Endpoints
- `GET /documents` - List user documents
- `POST /documents` - Upload new document
- `GET /documents/{id}` - Get document details
- `DELETE /documents/{id}` - Delete document

### Analysis Endpoints
- `POST /analyses/analyze` - Analyze document
- `GET /analyses/{id}` - Get analysis results
- `GET /analyses/history` - Get analysis history

### User Endpoints
- `GET /users/{id}/documents` - Get user documents
- `GET /users/{id}/analyses` - Get user analyses
- `GET /users/{id}/stats` - Get user statistics

## 🎨 Frontend Components

### Key Components Demonstrated

1. **Authentication System**
   - Login/Signup forms with validation
   - Protected routes
   - JWT token management
   - Context-based state management

2. **Document Management**
   - Drag-and-drop file upload
   - Progress tracking
   - File type validation
   - Real-time status updates

3. **Dashboard**
   - Analytics cards
   - Recent documents
   - Analysis results
   - User statistics

4. **Analysis Results**
   - Structured data display
   - Interactive charts
   - Export functionality
   - Search and filtering

### UI/UX Features
- **Glassmorphism Design**: Modern glass-like effects
- **Smooth Animations**: Framer Motion integration
- **Responsive Layout**: Mobile-first design
- **Dark/Light Theme**: Theme switching capability
- **Loading States**: Skeleton loaders and spinners
- **Error Handling**: User-friendly error messages

## 🏗 Backend Architecture

### Architecture Patterns
- **Layered Architecture**: Controllers → Services → Repositories
- **Dependency Injection**: FastAPI's built-in DI system
- **Repository Pattern**: Data access abstraction
- **Service Layer**: Business logic separation
- **Middleware**: Request/response processing

### Key Services
1. **AuthService**: Authentication and authorization
2. **DocumentService**: Document management
3. **AnalysisService**: AI-powered analysis
4. **UserService**: User management
5. **StatsService**: Analytics and reporting

### AI Integration
- **CrewAI Agents**: Specialized AI agents for different tasks
- **OpenAI GPT-4**: Advanced language model
- **Document Processing**: Multi-format file analysis
- **Structured Output**: JSON-formatted results

## 🎯 Key Features Demonstrated

### 1. Modern React Development
- **TypeScript**: Full type safety
- **Custom Hooks**: Reusable logic
- **Context API**: State management
- **Error Boundaries**: Error handling
- **Performance**: Code splitting and lazy loading

### 2. Advanced Backend Development
- **FastAPI**: Modern Python web framework
- **Async/Await**: Asynchronous programming
- **Data Validation**: Pydantic models
- **Database Design**: Optimized MongoDB schemas
- **API Documentation**: Auto-generated OpenAPI docs

### 3. AI Integration
- **Document Analysis**: Financial document insights
- **Natural Language Processing**: Query understanding
- **Structured Data**: JSON response formatting
- **Error Handling**: Graceful AI failures

### 4. Production-Ready Features
- **Security**: JWT authentication, CORS, rate limiting
- **Performance**: Caching, database optimization
- **Monitoring**: Logging and error tracking
- **Scalability**: Modular architecture

## 📸 Screenshots

### Dashboard
- Modern glassmorphism design
- Real-time analytics
- Document management interface

### Document Upload
- Drag-and-drop functionality
- Progress tracking
- File validation

### Analysis Results
- Structured data display
- Interactive insights
- Export capabilities

## 🔧 Development

### Code Quality
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **Git Hooks**: Pre-commit validation

### Testing
- **Unit Tests**: Component testing
- **Integration Tests**: API testing
- **E2E Tests**: End-to-end testing

## 📝 Environment Variables

### Backend (.env)
```env
# Database
MONGODB_URL=mongodb://localhost:27017/financial_analyzer
MONGODB_DATABASE=financial_analyzer

# Authentication
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI
OPENAI_API_KEY=your-openai-api-key

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Application
DEBUG=True
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173
```

## 🚀 Deployment

### Backend Deployment
- **Docker**: Containerized deployment
- **Environment**: Production configuration
- **Database**: MongoDB Atlas
- **Hosting**: Railway/Heroku/AWS

### Frontend Deployment
- **Build**: `npm run build`
- **Hosting**: Vercel/Netlify
- **CDN**: Static asset optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is created for VWO assessment purposes.

## 👨‍💻 Author

**Sani Hussain Patel**
- GitHub: [@Sani0401](https://github.com/Sani0401)
- Email: sanihussain.work@gmail.com

---

**Note**: This project demonstrates full-stack development skills with modern technologies, focusing on user experience, code quality, and scalable architecture.