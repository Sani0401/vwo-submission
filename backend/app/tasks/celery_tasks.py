"""
Background Tasks for Financial Document Analyzer
Handles long-running operations like document processing and analysis
"""

import os
import time
import uuid
from typing import Dict, Any, Optional
from datetime import datetime
import logging

from celery import current_task
from app.tasks.celery_app import celery_app
from app.utils.redis_client import get_redis_client, cache_document_analysis
from app.services.user import user_service
from app.core.logging import get_logging_service, LogLevel, LogCategory, LogAction
from app.ai.agents import financial_analyst
# Import the financial document analysis task
from app.ai.tasks import financial_document_analysis_task
from crewai import Crew, Process

# Set up logging
logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name="financial_document_analyzer.tasks.process_document")
def process_document_task(
    self, 
    file_path: str, 
    user_id: str, 
    document_id: str,
    query: str = "Analyze this financial document for investment insights"
) -> Dict[str, Any]:
    """
    Background task to process a financial document
    
    Args:
        file_path (str): Path to the document file
        user_id (str): ID of the user who uploaded the document
        document_id (str): ID of the document record
        query (str): Analysis query
        
    Returns:
        dict: Processing result
    """
    task_id = self.request.id
    logging_service = get_logging_service()
    
    try:
        # Update task progress
        self.update_state(
            state="PROGRESS",
            meta={"status": "Starting document processing", "progress": 10}
        )
        
        # Log task start
        logging_service.log_activity(
            level=LogLevel.INFO,
            category=LogCategory.ANALYSIS,
            action=LogAction.ANALYSIS_START,
            message=f"Background document processing started for {file_path}",
            user_id=user_id,
            resource_type="document",
            resource_id=document_id,
            details={"task_id": task_id, "query": query}
        )
        
        # Update document status to processing
        user_service.update_document_status(document_id, "processing", 20)
        
        # Check if file exists
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Document file not found: {file_path}")
        
        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"status": "Reading document", "progress": 30}
        )
        
        # Process the document with CrewAI
        from main import run_financial_analysis
        import asyncio
        start_time = time.time()
        
        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"status": "Analyzing document", "progress": 50}
        )
        
        # Run the analysis
        analysis_result = asyncio.run(run_financial_analysis(query=query, file_path=file_path))
        processing_time = int(time.time() - start_time)
        
        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"status": "Saving results", "progress": 80}
        )
        
        # Create analysis result in database
        analysis_record = user_service.create_analysis_result(
            document_id=document_id,
            user_id=user_id,
            analysis_type="Financial Document Analysis",
            query=query,
            summary_text=str(analysis_result),
            confidence_score=0.85,
            data_quality_score=0.90,
            processing_time_sec=processing_time
        )
        
        # Cache the analysis result
        cache_document_analysis(document_id, {
            "analysis_id": analysis_record.id,
            "result": str(analysis_result),
            "processing_time": processing_time,
            "confidence_score": 0.85,
            "data_quality_score": 0.90
        }, expire=3600)
        
        # Update document status to completed
        user_service.update_document_status(document_id, "completed", 100, processing_time)
        
        # Log successful completion
        logging_service.log_activity(
            level=LogLevel.INFO,
            category=LogCategory.ANALYSIS,
            action=LogAction.ANALYSIS_COMPLETE,
            message=f"Background document processing completed successfully",
            user_id=user_id,
            resource_type="analysis",
            resource_id=analysis_record.id,
            details={
                "document_id": document_id,
                "processing_time_sec": processing_time,
                "task_id": task_id
            }
        )
        
        # Update final progress
        self.update_state(
            state="SUCCESS",
            meta={
                "status": "Analysis completed successfully",
                "progress": 100,
                "analysis_id": analysis_record.id,
                "processing_time": processing_time
            }
        )
        
        return {
            "status": "success",
            "analysis_id": analysis_record.id,
            "processing_time": processing_time,
            "result": str(analysis_result)
        }
        
    except Exception as e:
        # Update document status to failed
        user_service.update_document_status(document_id, "failed", 0)
        
        # Log error
        logging_service.log_activity(
            level=LogLevel.ERROR,
            category=LogCategory.ANALYSIS,
            action=LogAction.ANALYSIS_FAIL,
            message=f"Background document processing failed: {str(e)}",
            user_id=user_id,
            resource_type="document",
            resource_id=document_id,
            details={"task_id": task_id, "error": str(e)}
        )
        
        # Update task state to failure
        self.update_state(
            state="FAILURE",
            meta={
                "status": "Analysis failed",
                "error": str(e),
                "progress": 0
            }
        )
        
        raise

@celery_app.task(bind=True, name="financial_document_analyzer.tasks.analyze_document")
def analyze_document_task(
    self,
    document_id: str,
    user_id: str,
    analysis_type: str,
    query: str,
    custom_parameters: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Background task for custom document analysis
    
    Args:
        document_id (str): ID of the document to analyze
        user_id (str): ID of the user requesting analysis
        analysis_type (str): Type of analysis to perform
        query (str): Analysis query
        custom_parameters (dict, optional): Custom analysis parameters
        
    Returns:
        dict: Analysis result
    """
    task_id = self.request.id
    logging_service = get_logging_service()
    
    try:
        # Get document information
        document = user_service.get_document_by_id(document_id)
        if not document:
            raise ValueError(f"Document {document_id} not found")
        
        # Check if user has access to this document
        if str(document.user_id) != user_id:
            raise PermissionError("User does not have access to this document")
        
        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"status": "Starting analysis", "progress": 10}
        )
        
        # Log analysis start
        logging_service.log_activity(
            level=LogLevel.INFO,
            category=LogCategory.ANALYSIS,
            action=LogAction.ANALYSIS_START,
            message=f"Custom analysis started for document {document.file_name}",
            user_id=user_id,
            resource_type="document",
            resource_id=document_id,
            details={
                "task_id": task_id,
                "analysis_type": analysis_type,
                "query": query,
                "custom_parameters": custom_parameters
            }
        )
        
        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"status": "Processing document", "progress": 30}
        )
        
        # Run the analysis
        start_time = time.time()
        from main import run_financial_analysis
        import asyncio
        analysis_result = asyncio.run(run_financial_analysis(query=query, file_path=document.file_path))
        processing_time = int(time.time() - start_time)
        
        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"status": "Saving results", "progress": 80}
        )
        
        # Create analysis result
        analysis_record = user_service.create_analysis_result(
            document_id=document_id,
            user_id=user_id,
            analysis_type=analysis_type,
            query=query,
            summary_text=str(analysis_result),
            confidence_score=0.85,
            data_quality_score=0.90,
            processing_time_sec=processing_time
        )
        
        # Cache the result
        cache_document_analysis(document_id, {
            "analysis_id": analysis_record.id,
            "result": str(analysis_result),
            "processing_time": processing_time,
            "analysis_type": analysis_type
        }, expire=3600)
        
        # Log successful completion
        logging_service.log_activity(
            level=LogLevel.INFO,
            category=LogCategory.ANALYSIS,
            action=LogAction.ANALYSIS_COMPLETE,
            message=f"Custom analysis completed successfully",
            user_id=user_id,
            resource_type="analysis",
            resource_id=analysis_record.id,
            details={
                "document_id": document_id,
                "analysis_type": analysis_type,
                "processing_time_sec": processing_time,
                "task_id": task_id
            }
        )
        
        # Update final progress
        self.update_state(
            state="SUCCESS",
            meta={
                "status": "Analysis completed successfully",
                "progress": 100,
                "analysis_id": analysis_record.id,
                "processing_time": processing_time
            }
        )
        
        return {
            "status": "success",
            "analysis_id": analysis_record.id,
            "processing_time": processing_time,
            "analysis_type": analysis_type,
            "result": str(analysis_result)
        }
        
    except Exception as e:
        # Log error
        logging_service.log_activity(
            level=LogLevel.ERROR,
            category=LogCategory.ANALYSIS,
            action=LogAction.ANALYSIS_FAIL,
            message=f"Custom analysis failed: {str(e)}",
            user_id=user_id,
            resource_type="document",
            resource_id=document_id,
            details={"task_id": task_id, "error": str(e)}
        )
        
        # Update task state to failure
        self.update_state(
            state="FAILURE",
            meta={
                "status": "Analysis failed",
                "error": str(e),
                "progress": 0
            }
        )
        
        raise

@celery_app.task(bind=True, name="financial_document_analyzer.tasks.cleanup_files")
def cleanup_files_task(self, older_than_hours: int = 24) -> Dict[str, Any]:
    """
    Background task to clean up old temporary files
    
    Args:
        older_than_hours (int): Delete files older than this many hours
        
    Returns:
        dict: Cleanup result
    """
    task_id = self.request.id
    logging_service = get_logging_service()
    
    try:
        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"status": "Starting cleanup", "progress": 10}
        )
        
        # Log cleanup start
        logging_service.log_activity(
            level=LogLevel.INFO,
            category=LogCategory.SYSTEM,
            action=LogAction.SYSTEM_STARTUP,  # Using existing action
            message=f"File cleanup started for files older than {older_than_hours} hours",
            details={"task_id": task_id, "older_than_hours": older_than_hours}
        )
        
        # Get data directory
        data_dir = os.path.join(os.path.dirname(__file__), "data")
        if not os.path.exists(data_dir):
            return {"status": "success", "deleted_files": 0, "message": "Data directory not found"}
        
        # Find old files
        current_time = time.time()
        cutoff_time = current_time - (older_than_hours * 3600)
        deleted_files = []
        deleted_size = 0
        
        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"status": "Scanning files", "progress": 30}
        )
        
        for filename in os.listdir(data_dir):
            file_path = os.path.join(data_dir, filename)
            
            # Skip directories and non-temp files
            if os.path.isdir(file_path) or not filename.endswith(('.pdf', '.doc', '.docx', '.xls', '.xlsx')):
                continue
            
            # Check file age
            file_mtime = os.path.getmtime(file_path)
            if file_mtime < cutoff_time:
                try:
                    file_size = os.path.getsize(file_path)
                    os.remove(file_path)
                    deleted_files.append(filename)
                    deleted_size += file_size
                except Exception as e:
                    logger.warning(f"Failed to delete file {filename}: {e}")
        
        # Update progress
        self.update_state(
            state="PROGRESS",
            meta={"status": "Cleanup completed", "progress": 90}
        )
        
        # Log cleanup completion
        logging_service.log_activity(
            level=LogLevel.INFO,
            category=LogCategory.SYSTEM,
            action=LogAction.SYSTEM_STARTUP,  # Using existing action
            message=f"File cleanup completed successfully",
            details={
                "task_id": task_id,
                "deleted_files": len(deleted_files),
                "deleted_size_mb": round(deleted_size / (1024 * 1024), 2),
                "files": deleted_files[:10]  # Log first 10 files
            }
        )
        
        # Update final progress
        self.update_state(
            state="SUCCESS",
            meta={
                "status": "Cleanup completed successfully",
                "progress": 100,
                "deleted_files": len(deleted_files),
                "deleted_size_mb": round(deleted_size / (1024 * 1024), 2)
            }
        )
        
        return {
            "status": "success",
            "deleted_files": len(deleted_files),
            "deleted_size_mb": round(deleted_size / (1024 * 1024), 2),
            "files": deleted_files
        }
        
    except Exception as e:
        # Log error
        logging_service.log_activity(
            level=LogLevel.ERROR,
            category=LogCategory.SYSTEM,
            action=LogAction.ERROR_OCCURRED,
            message=f"File cleanup failed: {str(e)}",
            details={"task_id": task_id, "error": str(e)}
        )
        
        # Update task state to failure
        self.update_state(
            state="FAILURE",
            meta={
                "status": "Cleanup failed",
                "error": str(e),
                "progress": 0
            }
        )
        
        raise

@celery_app.task(bind=True, name="financial_document_analyzer.tasks.bulk_analysis")
def bulk_analysis_task(
    self,
    document_ids: list,
    user_id: str,
    analysis_type: str,
    query: str
) -> Dict[str, Any]:
    """
    Background task for bulk document analysis
    
    Args:
        document_ids (list): List of document IDs to analyze
        user_id (str): ID of the user requesting analysis
        analysis_type (str): Type of analysis to perform
        query (str): Analysis query
        
    Returns:
        dict: Bulk analysis result
    """
    task_id = self.request.id
    logging_service = get_logging_service()
    
    try:
        total_documents = len(document_ids)
        completed_analyses = []
        failed_analyses = []
        
        # Log bulk analysis start
        logging_service.log_activity(
            level=LogLevel.INFO,
            category=LogCategory.ANALYSIS,
            action=LogAction.ANALYSIS_START,
            message=f"Bulk analysis started for {total_documents} documents",
            user_id=user_id,
            details={
                "task_id": task_id,
                "analysis_type": analysis_type,
                "query": query,
                "total_documents": total_documents
            }
        )
        
        for i, document_id in enumerate(document_ids):
            try:
                # Update progress
                progress = int((i / total_documents) * 100)
                self.update_state(
                    state="PROGRESS",
                    meta={
                        "status": f"Processing document {i+1} of {total_documents}",
                        "progress": progress,
                        "current_document": document_id
                    }
                )
                
                # Process each document
                result = analyze_document_task.apply_async(
                    args=[document_id, user_id, analysis_type, query],
                    queue="analysis"
                ).get()
                
                completed_analyses.append({
                    "document_id": document_id,
                    "analysis_id": result["analysis_id"],
                    "processing_time": result["processing_time"]
                })
                
            except Exception as e:
                failed_analyses.append({
                    "document_id": document_id,
                    "error": str(e)
                })
                logger.error(f"Failed to analyze document {document_id}: {e}")
        
        # Log bulk analysis completion
        logging_service.log_activity(
            level=LogLevel.INFO,
            category=LogCategory.ANALYSIS,
            action=LogAction.ANALYSIS_COMPLETE,
            message=f"Bulk analysis completed: {len(completed_analyses)} successful, {len(failed_analyses)} failed",
            user_id=user_id,
            details={
                "task_id": task_id,
                "total_documents": total_documents,
                "completed": len(completed_analyses),
                "failed": len(failed_analyses)
            }
        )
        
        # Update final progress
        self.update_state(
            state="SUCCESS",
            meta={
                "status": "Bulk analysis completed",
                "progress": 100,
                "completed": len(completed_analyses),
                "failed": len(failed_analyses)
            }
        )
        
        return {
            "status": "success",
            "total_documents": total_documents,
            "completed_analyses": completed_analyses,
            "failed_analyses": failed_analyses
        }
        
    except Exception as e:
        # Log error
        logging_service.log_activity(
            level=LogLevel.ERROR,
            category=LogCategory.ANALYSIS,
            action=LogAction.ANALYSIS_FAIL,
            message=f"Bulk analysis failed: {str(e)}",
            user_id=user_id,
            details={"task_id": task_id, "error": str(e)}
        )
        
        # Update task state to failure
        self.update_state(
            state="FAILURE",
            meta={
                "status": "Bulk analysis failed",
                "error": str(e),
                "progress": 0
            }
        )
        
        raise

# Utility functions for task management
def get_task_status(task_id: str) -> Dict[str, Any]:
    """Get the status of a background task"""
    try:
        task = celery_app.AsyncResult(task_id)
        return {
            "task_id": task_id,
            "status": task.status,
            "result": task.result if task.successful() else None,
            "info": task.info if task.info else {}
        }
    except Exception as e:
        return {
            "task_id": task_id,
            "status": "UNKNOWN",
            "error": str(e)
        }

def cancel_task(task_id: str) -> bool:
    """Cancel a background task"""
    try:
        celery_app.control.revoke(task_id, terminate=True)
        return True
    except Exception as e:
        logger.error(f"Failed to cancel task {task_id}: {e}")
        return False

def get_active_tasks() -> list:
    """Get list of active tasks"""
    try:
        inspect = celery_app.control.inspect()
        active_tasks = inspect.active()
        return active_tasks or {}
    except Exception as e:
        logger.error(f"Failed to get active tasks: {e}")
        return {}
