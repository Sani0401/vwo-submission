"""
Celery Configuration for Financial Document Analyzer
Handles background job processing for large document analysis
"""

import os
from celery import Celery
from celery.signals import task_prerun, task_postrun, task_failure
import logging

# Set up logging
logger = logging.getLogger(__name__)

# Celery configuration
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

# Create Celery app
celery_app = Celery(
    "financial_analyzer",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=[
        "financial_document_analyzer.tasks",  # Import tasks module
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Task routing
    task_routes={
        "financial_document_analyzer.tasks.process_document": {"queue": "document_processing"},
        "financial_document_analyzer.tasks.analyze_document": {"queue": "analysis"},
        "financial_document_analyzer.tasks.cleanup_files": {"queue": "maintenance"},
    },
    
    # Task execution settings
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_reject_on_worker_lost=True,
    
    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    
    # Task time limits
    task_soft_time_limit=300,  # 5 minutes soft limit
    task_time_limit=600,       # 10 minutes hard limit
    
    # Worker settings
    worker_max_tasks_per_child=1000,
    worker_disable_rate_limits=False,
    
    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
)

# Signal handlers for monitoring
@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kwds):
    """Log task start"""
    logger.info(f"Task {task.name}[{task_id}] started with args={args}, kwargs={kwargs}")

@task_postrun.connect
def task_postrun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, retval=None, state=None, **kwds):
    """Log task completion"""
    logger.info(f"Task {task.name}[{task_id}] completed with state={state}")

@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, traceback=None, einfo=None, **kwds):
    """Log task failure"""
    logger.error(f"Task {sender.name}[{task_id}] failed: {exception}")

# Health check task
@celery_app.task(bind=True)
def health_check(self):
    """Health check task to verify Celery is working"""
    return {
        "status": "healthy",
        "task_id": self.request.id,
        "worker": self.request.hostname
    }

# Get Celery app instance
def get_celery_app():
    """Get the Celery app instance"""
    return celery_app
