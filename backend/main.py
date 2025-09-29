"""
Main Application Entry Point
Creates and runs the FastAPI application
"""

import logging
from app.app_factory import create_app

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the application
app = create_app()

# Legacy function for backward compatibility
def run_financial_analysis(query: str, file_path: str):
    """Run financial analysis with only the financial analyst agent"""
    import asyncio
    from crewai import Crew, Process
    from app.ai.agents import financial_analyst
    from app.ai.tasks import financial_document_analysis_task
    
    financial_crew = Crew(
        agents=[financial_analyst],
        tasks=[financial_document_analysis_task],
        process=Process.sequential,
        verbose=False,  # Disable verbose for production
    )
    
    context = {'query': query, 'file_path': file_path}
    result = financial_crew.kickoff(context)
    
    # Handle Future objects by running them if needed
    if hasattr(result, '__await__'):
        try:
            # If it's a coroutine, run it
            result = asyncio.run(result)
        except RuntimeError:
            # If we're already in an event loop, create a new one
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(result)
            finally:
                loop.close()
    
    return result


if __name__ == "__main__":
    import uvicorn
    from app.config import get_settings
    
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )