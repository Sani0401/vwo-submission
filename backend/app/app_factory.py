"""
Application Factory
Creates and configures the FastAPI application with proper dependency injection
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import logging
from pathlib import Path

from app.config import get_settings


def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    settings = get_settings()
    
    # Create FastAPI app
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="AI-powered financial document analysis system",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )
    
    # Configure logging
    _setup_logging(settings)
    
    # Add middleware
    _add_middleware(app, settings)
    
    # Include routers
    _include_routers(app)
    
    # Add startup and shutdown events
    _add_lifecycle_events(app, settings)
    
    return app


def _setup_logging(settings):
    """Configure application logging"""
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(settings.LOG_FILE) if settings.LOG_FILE else logging.NullHandler()
        ]
    )


def _add_middleware(app: FastAPI, settings):
    """Add middleware to the application"""
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    
    # Trusted host middleware
    if not settings.DEBUG:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=["localhost", "127.0.0.1", "*.yourdomain.com"]
        )
    
    # Custom middleware will be added later when modules are ready


def _include_routers(app: FastAPI):
    """Include API routers"""
    from app.api.v1.api import api_router
    
    # Include the main API router with version prefix
    app.include_router(api_router, prefix="/api/v1")
    
    # Also include endpoints at root level for backward compatibility
    app.include_router(api_router, prefix="")
    
    # Health check endpoint
    @app.get("/")
    def root():
        """Health check endpoint"""
        return {"message": "Financial Document Analyzer API is running", "version": "1.0.0"}
    
    @app.get("/health")
    def health_check():
        """Health check with system status"""
        return {"status": "healthy", "version": "1.0.0"}


def _add_lifecycle_events(app: FastAPI, settings):
    """Add application lifecycle events"""
    
    @app.on_event("startup")
    def startup_event():
        """Application startup event"""
        logger = logging.getLogger(__name__)
        logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
        logger.info(f"Environment: {settings.ENVIRONMENT}")
        logger.info(f"Application started in {'debug' if settings.DEBUG else 'production'} mode")
        
        # Ensure upload directory exists
        upload_dir = Path(settings.UPLOAD_DIR)
        upload_dir.mkdir(exist_ok=True)
        
        # Initialize database connections
        try:
            from app.repositories.connection import init_database
            init_database()
        except Exception as e:
            logger.warning(f"Database initialization failed: {e}")
        
        # Initialize Redis connection
        try:
            from app.utils.redis_client import init_redis
            init_redis()
        except Exception as e:
            logger.warning(f"Redis initialization failed: {e}")
    
    @app.on_event("shutdown")
    def shutdown_event():
        """Application shutdown event"""
        logger = logging.getLogger(__name__)
        logger.info("Shutting down application")
        
        # Close database connections
        try:
            from app.repositories.connection import close_database
            close_database()
        except Exception as e:
            logger.warning(f"Database shutdown failed: {e}")
        
        # Close Redis connection
        try:
            from app.utils.redis_client import close_redis
            close_redis()
        except Exception as e:
            logger.warning(f"Redis shutdown failed: {e}")
