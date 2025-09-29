"""
AI Tools for Financial Document Analysis
Contains tools for processing financial documents
"""

import os
import json
from pathlib import Path
from typing import Dict, Any
from crewai.tools import BaseTool
from app.utils.file_processor import get_document_info, process_financial_document


class FinancialDocumentProcessorTool(BaseTool):
    name: str = "document_processor"
    description: str = (
        "Processes financial documents (PDF, TXT) and extracts text content. "
        "Use this tool to read and analyze financial documents before providing analysis. "
        "Input should be the file path to the document."
    )
    
    def _run(self, file_path: str) -> str:
        """
        Process a financial document and extract text content.
        
        Args:
            file_path (str): Path to the document file
            
        Returns:
            str: Extracted text content from the document
        """
        try:
            # Handle JSON input
            if isinstance(file_path, str) and file_path.startswith('{'):
                try:
                    params = json.loads(file_path)
                    file_path = params.get('file_path', file_path)
                except json.JSONDecodeError:
                    pass  # Use file_path as-is if JSON parsing fails
            
            # Handle path issues - check if file exists, if not try alternative paths
            if not os.path.exists(file_path):
                # Try with backend directory structure
                if "/backend/data/" in file_path:
                    # File path is already correct for backend structure
                    pass
                elif "/data/" in file_path:
                    # Try to find the correct data directory
                    backend_data_path = file_path.replace("/data/", "/backend/data/")
                    if os.path.exists(backend_data_path):
                        file_path = backend_data_path
            
            # Get document info first
            doc_info = get_document_info(file_path)
            
            if "error" in doc_info:
                return f"Error: {doc_info['error']}"
            
            # Extract text content
            text_content = process_financial_document(file_path)
            
            if not text_content or text_content.strip() == "":
                return f"Error: No text content could be extracted from {file_path}"
            
            # Format the response
            response = f"""
Document Information:
- File: {doc_info.get('file_name', 'Unknown')}
- Size: {doc_info.get('file_size', 'Unknown')} bytes
- Type: {doc_info.get('file_type', 'Unknown')}
- Pages: {doc_info.get('page_count', 'Unknown')}

Extracted Content:
{text_content[:5000]}{'...' if len(text_content) > 5000 else ''}
"""
            
            return response.strip()
            
        except Exception as e:
            return f"Error processing document: {str(e)}"


# Create tool instances
financial_document_tool = FinancialDocumentProcessorTool()