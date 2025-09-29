"""
User Management Service
Handles user operations, document management, and analysis tracking
"""

import os
import hashlib
import re
from datetime import datetime
from typing import List, Optional, Dict, Any
import logging

from bson import ObjectId
from app.models.schemas import (
    User, UserCreate, UserUpdate, UserResponse, UserRole, UserStats,
    Document, DocumentCreate, DocumentUpdate, DocumentResponse, DocumentStatus, DocumentStats,
    AnalysisResult, AnalysisResultCreate, AnalysisResultResponse, AnalysisStats
)
from app.repositories.connection import get_sync_database

# Set up logging
logger = logging.getLogger(__name__)

class UserService:
    """Service for managing users and their related data"""
    
    def __init__(self):
        self.db = None
        self.users_collection = None
        self.documents_collection = None
        self.analysis_results_collection = None
        self._initialize_collections()
    
    def _initialize_collections(self):
        """Initialize database collections"""
        try:
            self.db = get_sync_database()
            if self.db is not None:
                self.users_collection = self.db['users']
                self.documents_collection = self.db['documents']
                self.analysis_results_collection = self.db['analysis_results']
            else:
                logger.warning("Database not available during UserService initialization")
                self.users_collection = None
                self.documents_collection = None
                self.analysis_results_collection = None
        except Exception as e:
            logger.warning(f"Could not initialize database collections: {e}")
            self.db = None
            self.users_collection = None
            self.documents_collection = None
            self.analysis_results_collection = None
    
    def calculate_file_checksum(self, file_path: str) -> str:
        """Calculate SHA256 checksum of a file"""
        try:
            sha256_hash = hashlib.sha256()
            with open(file_path, "rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            return f"sha256:{sha256_hash.hexdigest()}"
        except Exception as e:
            logger.error(f"Error calculating checksum: {e}")
            return ""
    
    def extract_financial_data_points(self, summary_text: str) -> Dict[str, Any]:
        """Extract structured financial data points from analysis summary - CONCISE and FOCUSED"""
        try:
            # Enforce 200-word limit on summary
            words = summary_text.split()
            if len(words) > 200:
                # Truncate to 200 words and add ellipsis
                summary_text = ' '.join(words[:200]) + "... [truncated to 200 words]"
                logger.warning(f"Summary exceeded 200 words ({len(words)}), truncated to 200 words")
            data_points = {
                "metrics": {},
                "insights": [],
                "key_findings": [],
                "financial_highlights": [],
                "risks": [],
                "opportunities": []
            }
            
            # FOCUSED financial metrics patterns - key metrics only
            financial_patterns = {
                # Revenue patterns - simplified
                "revenue": [
                    r"(?:revenue|sales|total revenue).*?(\$[\d,]+\.?\d*[BMK]?)",
                    r"(?:revenue|sales).*?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|billion|thousand|M|B|K)"
                ],
                # Operating Income patterns - simplified
                "operating_income": [
                    r"(?:operating income|operating profit|ebit).*?(\$[\d,]+\.?\d*[BMK]?)",
                    r"(?:operating income|operating profit).*?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|billion|thousand|M|B|K)"
                ],
                # Net Income patterns - simplified
                "net_income": [
                    r"(?:net income|net profit|net earnings).*?(\$[\d,]+\.?\d*[BMK]?)",
                    r"(?:net income|net profit).*?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|billion|thousand|M|B|K)"
                ],
                # Cash patterns - simplified
                "cash": [
                    r"(?:cash|cash equivalents).*?(\$[\d,]+\.?\d*[BMK]?)",
                    r"(?:cash|cash equivalents).*?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|billion|thousand|M|B|K)"
                ],
                # Free Cash Flow patterns - simplified
                "free_cash_flow": [
                    r"(?:free cash flow|fcf).*?(\$[\d,]+\.?\d*[BMK]?)",
                    r"(?:free cash flow|fcf).*?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|billion|thousand|M|B|K)"
                ],
                # Operating Margin patterns - simplified
                "operating_margin": [
                    r"(?:operating margin).*?(\d+(?:\.\d+)?%)",
                    r"(?:operating margin).*?(\d+(?:\.\d{2})?)\s*%"
                ],
                # Net Margin patterns - simplified
                "net_margin": [
                    r"(?:net margin).*?(\d+(?:\.\d+)?%)",
                    r"(?:net margin).*?(\d+(?:\.\d{2})?)\s*%"
                ]
            }
            
            # Extract metrics using multiple patterns for each metric
            for metric_name, patterns in financial_patterns.items():
                for pattern in patterns:
                    matches = re.findall(pattern, summary_text, re.IGNORECASE)
                    if matches:
                        data_points["metrics"][metric_name] = matches[0]
                        break  # Use first match found
            
            # FOCUSED percentage changes - key growth metrics only
            percentage_patterns = {
                "revenue_change": [
                    r"(?:revenue|sales).*?(?:growth|increase|decrease|decline).*?(\d+(?:\.\d+)?%)",
                    r"(?:revenue|sales).*?(\d+(?:\.\d+)?%)\s*(?:growth|increase|decrease|decline)"
                ],
                "income_change": [
                    r"(?:operating income|net income|profit).*?(?:growth|increase|decrease|decline).*?(\d+(?:\.\d+)?%)",
                    r"(?:operating income|net income|profit).*?(\d+(?:\.\d+)?%)\s*(?:growth|increase|decrease|decline)"
                ],
                "growth_rate": [
                    r"(?:growth|yoy|year-over-year).*?(\d+(?:\.\d+)?%)",
                    r"(\d+(?:\.\d+)?%)\s*(?:growth|yoy)"
                ]
            }
            
            for change_name, patterns in percentage_patterns.items():
                for pattern in patterns:
                    matches = re.findall(pattern, summary_text, re.IGNORECASE)
                    if matches:
                        data_points["metrics"][change_name] = matches[0]
                        break  # Use first match found
            
            # Extract FOCUSED insights - limit to most important items
            lines = summary_text.split('\n')
            max_insights = 5
            max_findings = 3
            
            for line in lines:
                line = line.strip()
                if not line or len(line) < 20:  # Skip very short lines
                    continue
                
                # Extract bullet points and key statements - more selective
                if (line.startswith('-') or line.startswith('•')) and len(line) > 30 and len(data_points["insights"]) < max_insights:
                    insight = line[1:].strip()
                    # Only include insights with numbers or specific metrics
                    if any(char.isdigit() for char in insight) or any(word in insight.lower() for word in ['revenue', 'profit', 'growth', 'margin', 'cash', 'debt']):
                        data_points["insights"].append(insight[:100])  # Limit length
                
                # Extract key findings - only quantitative or strategic
                if any(keyword in line.lower() for keyword in ['key finding', 'highlight', 'important', 'critical']) and len(data_points["key_findings"]) < max_findings:
                    if len(line) > 20 and len(line) < 200 and ('$' in line or '%' in line or any(word in line.lower() for word in ['growth', 'decline', 'increase', 'decrease'])):
                        data_points["key_findings"].append(line[:120])
            
            # Extract financial highlights - only lines with specific numbers (limit to 3)
            max_highlights = 3
            financial_keywords = ['revenue', 'profit', 'income', 'cash', 'debt', 'growth', 'decline', 'increase', 'decrease', 'margin']
            for line in lines:
                line = line.strip()
                if (len(data_points["financial_highlights"]) < max_highlights and
                    any(keyword in line.lower() for keyword in financial_keywords) and 
                    len(line) > 20 and len(line) < 200 and 
                    ('$' in line or '%' in line) and
                    any(char.isdigit() for char in line)):
                    data_points["financial_highlights"].append(line[:120])
            
            # Extract risks and opportunities - more focused (limit to 3 each)
            max_risks = 3
            max_opportunities = 3
            risk_keywords = ['risk', 'uncertainty', 'challenge', 'concern', 'volatility', 'decline', 'decrease', 'down', 'fell', 'dropped']
            opportunity_keywords = ['opportunity', 'growth', 'expansion', 'increase', 'up', 'positive', 'strong', 'robust', 'rose', 'gained']
            
            for line in lines:
                line = line.strip()
                if len(line) > 20 and len(line) < 200:
                    if (len(data_points["risks"]) < max_risks and 
                        any(keyword in line.lower() for keyword in risk_keywords)):
                        data_points["risks"].append(line[:120])
                    elif (len(data_points["opportunities"]) < max_opportunities and 
                          any(keyword in line.lower() for keyword in opportunity_keywords)):
                        data_points["opportunities"].append(line[:120])
            
            # FALLBACK EXTRACTION: If regex patterns didn't capture enough data, use advanced extraction
            if len(data_points["metrics"]) < 5:  # If we didn't extract enough metrics
                data_points = self._advanced_financial_extraction(summary_text, data_points)
            
            # Clean up and deduplicate - limit to top 5 items each for focused coverage
            for key in ["insights", "key_findings", "financial_highlights", "risks", "opportunities"]:
                data_points[key] = list(set(data_points[key]))[:5]  # Reduced limit for focused coverage
            
            # Calculate confidence score based on data extraction quality
            extraction_quality = 0
            if data_points["metrics"]:
                extraction_quality += 0.5  # Higher weight for metrics
            if data_points["insights"]:
                extraction_quality += 0.2
            if data_points["financial_highlights"]:
                extraction_quality += 0.2
            if data_points["risks"] or data_points["opportunities"]:
                extraction_quality += 0.1
            
            data_points["extraction_quality_score"] = min(extraction_quality, 1.0)
            
            logger.info(f"Extracted {len(data_points['metrics'])} metrics, {len(data_points['insights'])} insights")
            return data_points
            
        except Exception as e:
            logger.error(f"Error extracting financial data points: {e}")
            return {
                "metrics": {},
                "insights": [],
                "key_findings": [],
                "financial_highlights": [],
                "risks": [],
                "opportunities": [],
                "extraction_quality_score": 0.0
            }
    
    def _advanced_financial_extraction(self, text: str, existing_data: Dict[str, Any]) -> Dict[str, Any]:
        """Advanced fallback extraction using multiple techniques when regex patterns fail"""
        try:
            # Extract all monetary values with context
            monetary_patterns = [
                r'\$[\d,]+\.?\d*[BMK]?',  # $1.2B, $500M, $1,234.56K
                r'\$[\d,]+\.?\d*',        # $1,234.56
                r'[\d,]+\.?\d*\s*(?:million|billion|thousand|M|B|K)',  # 1.2 billion, 500M
            ]
            
            # Extract all percentages
            percentage_patterns = [
                r'\d+(?:\.\d+)?%',  # 15.5%, 100%
                r'\d+(?:\.\d+)?\s*percent',  # 15.5 percent
            ]
            
            # Extract all numbers that might be financial metrics
            number_patterns = [
                r'\d+(?:,\d{3})*(?:\.\d{2})?',  # 1,234.56
                r'\d+(?:\.\d+)?',               # 1234.56
            ]
            
            # Find all monetary values and their context
            for pattern in monetary_patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    value = match.group()
                    # Get context around the value (50 characters before and after)
                    start = max(0, match.start() - 50)
                    end = min(len(text), match.end() + 50)
                    context = text[start:end].lower()
                    
                    # Try to identify what this value represents
                    if any(word in context for word in ['revenue', 'sales', 'income']):
                        if 'revenue' not in existing_data["metrics"]:
                            existing_data["metrics"]["revenue"] = value
                    elif any(word in context for word in ['profit', 'earnings', 'net income']):
                        if 'net_income' not in existing_data["metrics"]:
                            existing_data["metrics"]["net_income"] = value
                    elif any(word in context for word in ['cash', 'liquidity']):
                        if 'cash' not in existing_data["metrics"]:
                            existing_data["metrics"]["cash"] = value
                    elif any(word in context for word in ['debt', 'liability', 'borrowing']):
                        if 'debt' not in existing_data["metrics"]:
                            existing_data["metrics"]["debt"] = value
            
            # Find all percentages and their context
            for pattern in percentage_patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    value = match.group()
                    start = max(0, match.start() - 50)
                    end = min(len(text), match.end() + 50)
                    context = text[start:end].lower()
                    
                    # Try to identify what this percentage represents
                    if any(word in context for word in ['margin', 'profitability']):
                        if 'gross_margin' not in existing_data["metrics"]:
                            existing_data["metrics"]["gross_margin"] = value
                    elif any(word in context for word in ['growth', 'increase', 'decrease']):
                        if 'growth_rate' not in existing_data["metrics"]:
                            existing_data["metrics"]["growth_rate"] = value
            
            # Extract any remaining numbers that look like financial data
            lines = text.split('\n')
            for line in lines:
                line = line.strip()
                if len(line) > 10 and len(line) < 200:
                    # Look for lines with numbers and financial keywords
                    if any(char.isdigit() for char in line) and any(word in line.lower() for word in 
                        ['revenue', 'sales', 'profit', 'income', 'cash', 'debt', 'margin', 'growth', 'earnings']):
                        
                        # Extract numbers from this line
                        numbers = re.findall(r'\d+(?:,\d{3})*(?:\.\d{2})?', line)
                        if numbers:
                            # Add as financial highlight if it contains meaningful data
                            if '$' in line or '%' in line or any(word in line.lower() for word in 
                                ['million', 'billion', 'thousand', 'M', 'B', 'K']):
                                existing_data["financial_highlights"].append(line[:150])
            
            # Extract insights from lines with multiple numbers (likely data-rich)
            for line in lines:
                line = line.strip()
                if len(line) > 30 and len(line) < 200:
                    # Count numbers in the line
                    numbers = re.findall(r'\d+(?:,\d{3})*(?:\.\d{2})?', line)
                    if len(numbers) >= 2:  # Lines with multiple numbers are likely insights
                        if any(word in line.lower() for word in 
                            ['revenue', 'profit', 'growth', 'margin', 'cash', 'debt', 'earnings', 'income']):
                            existing_data["insights"].append(line[:150])
            
            logger.info(f"Advanced extraction added {len(existing_data['metrics'])} metrics")
            return existing_data
            
        except Exception as e:
            logger.error(f"Error in advanced financial extraction: {e}")
            return existing_data
    
    def create_document(self, user_id: str, file_path: str, file_name: str, 
                       file_size_mb: float, file_format: str, 
                       category: Optional[str] = None, tags: List[str] = None) -> DocumentResponse:
        """Create a new document record"""
        try:
            # Calculate checksum
            checksum = self.calculate_file_checksum(file_path)
            
            # Check for duplicate documents (same user, same checksum)
            existing_document = self.documents_collection.find_one({
                "user_id": ObjectId(user_id),
                "checksum": checksum
            })
            
            if existing_document:
                logger.warning(f"Duplicate document detected for user {user_id} with checksum {checksum}")
                logger.info(f"Returning existing document {existing_document['_id']} instead of creating duplicate")
                # Return existing document instead of creating duplicate
                return DocumentResponse(
                    id=str(existing_document["_id"]),
                    user_id=str(existing_document["user_id"]),
                    file_name=existing_document["file_name"],
                    file_path=existing_document["file_path"],
                    file_size_mb=existing_document["file_size_mb"],
                    file_format=existing_document["file_format"],
                    checksum=existing_document["checksum"],
                    category=existing_document.get("category"),
                    tags=existing_document.get("tags", []),
                    status=existing_document["status"],
                    progress=existing_document["progress"],
                    processing_duration_sec=existing_document.get("processing_duration_sec"),
                    metadata=existing_document["metadata"],
                    analysis_ids=[str(aid) for aid in existing_document.get("analysis_ids", [])],
                    created_at=existing_document["created_at"],
                    updated_at=existing_document["updated_at"]
                )
            
            # Create document
            document_data = {
                "user_id": ObjectId(user_id),
                "file_name": file_name,
                "file_path": file_path,
                "file_size_mb": file_size_mb,
                "file_format": file_format,
                "checksum": checksum,
                "category": category,
                "tags": tags or [],
                "status": DocumentStatus.UPLOADING,
                "progress": 0,
                "processing_duration_sec": None,
                "metadata": {
                    "upload_date": datetime.utcnow(),
                    "last_modified": datetime.utcnow()
                },
                "analysis_ids": [],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Insert document
            result = self.documents_collection.insert_one(document_data)
            document_data["_id"] = result.inserted_id
            logger.info(f"New document inserted with ID: {result.inserted_id}")
            
            # Update user's document count and storage
            self.users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$inc": {
                        "account.documents_uploaded_count": 1,
                        "account.storage_used_mb": file_size_mb
                    },
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            return DocumentResponse(
                id=str(document_data["_id"]),
                user_id=str(document_data["user_id"]),
                file_name=document_data["file_name"],
                file_path=document_data["file_path"],
                file_size_mb=document_data["file_size_mb"],
                file_format=document_data["file_format"],
                category=document_data["category"],
                tags=document_data["tags"],
                status=document_data["status"],
                progress=document_data["progress"],
                processing_duration_sec=document_data["processing_duration_sec"],
                analysis_ids=[],
                created_at=document_data["created_at"],
                updated_at=document_data["updated_at"]
            )
            
        except Exception as e:
            logger.error(f"Error creating document: {e}")
            raise
    
    def update_document_status(self, document_id: str, status: DocumentStatus, 
                              progress: int = None, processing_duration: int = None) -> bool:
        """Update document processing status"""
        try:
            update_data = {
                "status": status,
                "updated_at": datetime.utcnow()
            }
            
            if progress is not None:
                update_data["progress"] = progress
            
            if processing_duration is not None:
                update_data["processing_duration_sec"] = processing_duration
            
            result = self.documents_collection.update_one(
                {"_id": ObjectId(document_id)},
                {"$set": update_data}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error updating document status: {e}")
            return False
    
    def create_analysis_result(self, document_id: str, user_id: str, 
                              analysis_type: str, query: str, summary_text: str,
                              confidence_score: float, data_quality_score: float,
                              processing_time_sec: int) -> AnalysisResultResponse:
        """Create a new analysis result with extracted data points"""
        try:
            logger.info(f"Creating analysis result for document {document_id}, user {user_id}")
            logger.info(f"Summary text length: {len(summary_text)} characters, {len(summary_text.split())} words")
            
            # Check if analysis already exists for this document and user
            existing_analysis = self.analysis_results_collection.find_one({
                "document_id": ObjectId(document_id),
                "user_id": ObjectId(user_id),
                "query": query
            })
            
            if existing_analysis:
                logger.warning(f"Analysis already exists for document {document_id}, user {user_id}, query: {query}")
                # Return existing analysis instead of creating duplicate
                return AnalysisResultResponse(
                    id=str(existing_analysis["_id"]),
                    document_id=str(existing_analysis["document_id"]),
                    user_id=str(existing_analysis["user_id"]),
                    analysis_type=existing_analysis["analysis_type"],
                    query=existing_analysis["query"],
                    output=existing_analysis["output"],
                    confidence_score=existing_analysis["confidence_score"],
                    data_quality_score=existing_analysis["data_quality_score"],
                    validation_status=existing_analysis["validation_status"],
                    processing_time_sec=existing_analysis["processing_time_sec"],
                    created_at=existing_analysis["created_at"]
                )
            
            # Extract structured data points from the summary
            extracted_data = self.extract_financial_data_points(summary_text)
            
            # Create enhanced output with extracted data
            enhanced_output = {
                "summary": summary_text,
                "metrics": extracted_data["metrics"],
                "insights": extracted_data["insights"],
                "key_findings": extracted_data["key_findings"],
                "financial_highlights": extracted_data["financial_highlights"],
                "risks": extracted_data["risks"],
                "opportunities": extracted_data["opportunities"],
                "extraction_quality_score": extracted_data["extraction_quality_score"],
                "charts": []  # Placeholder for future chart generation
            }
            
            # Adjust confidence score based on extraction quality
            adjusted_confidence = min(confidence_score + (extracted_data["extraction_quality_score"] * 0.1), 1.0)
            
            analysis_data = {
                "document_id": ObjectId(document_id),
                "user_id": ObjectId(user_id),
                "analysis_type": analysis_type,
                "query": query,
                "output": enhanced_output,
                "confidence_score": adjusted_confidence,
                "data_quality_score": data_quality_score,
                "validation_status": "passed",
                "error_logs": [],
                "processing_time_sec": processing_time_sec,
                "created_at": datetime.utcnow()
            }
            
            # Insert analysis result
            result = self.analysis_results_collection.insert_one(analysis_data)
            analysis_data["_id"] = result.inserted_id
            
            # Update document with analysis ID
            self.documents_collection.update_one(
                {"_id": ObjectId(document_id)},
                {
                    "$push": {"analysis_ids": result.inserted_id},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            # Update user's analysis count
            self.users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$inc": {"account.analyses_completed_count": 1},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            return AnalysisResultResponse(
                id=str(analysis_data["_id"]),
                document_id=str(analysis_data["document_id"]),
                user_id=str(analysis_data["user_id"]),
                analysis_type=analysis_data["analysis_type"],
                query=analysis_data["query"],
                output=analysis_data["output"],
                confidence_score=analysis_data["confidence_score"],
                data_quality_score=analysis_data["data_quality_score"],
                validation_status=analysis_data["validation_status"],
                processing_time_sec=analysis_data["processing_time_sec"],
                created_at=analysis_data["created_at"]
            )
            
        except Exception as e:
            logger.error(f"Error creating analysis result: {e}")
            raise
    
    def get_user_documents(self, user_id: str, skip: int = 0, limit: int = 50) -> List[DocumentResponse]:
        """Get documents for a specific user"""
        try:
            # Ensure collections are initialized
            if self.documents_collection is None:
                self._initialize_collections()
                if self.documents_collection is None:
                    logger.error("Could not initialize documents collection")
                    return []
            
            cursor = self.documents_collection.find(
                {"user_id": ObjectId(user_id)}
            ).sort("created_at", -1).skip(skip).limit(limit)
            
            documents = []
            for doc in cursor:
                documents.append(DocumentResponse(
                    id=str(doc["_id"]),
                    user_id=str(doc["user_id"]),
                    file_name=doc["file_name"],
                    file_path=doc["file_path"],
                    file_size_mb=doc["file_size_mb"],
                    file_format=doc["file_format"],
                    category=doc.get("category"),
                    tags=doc.get("tags", []),
                    status=doc["status"],
                    progress=doc["progress"],
                    processing_duration_sec=doc.get("processing_duration_sec"),
                    analysis_ids=[str(aid) for aid in doc.get("analysis_ids", [])],
                    created_at=doc["created_at"],
                    updated_at=doc["updated_at"]
                ))
            
            return documents
            
        except Exception as e:
            logger.error(f"Error getting user documents: {e}")
            return []
    
    def get_document_analyses(self, document_id: str) -> List[AnalysisResultResponse]:
        """Get all analyses for a specific document"""
        try:
            cursor = self.analysis_results_collection.find(
                {"document_id": ObjectId(document_id)}
            ).sort("created_at", -1)
            
            # Get document name once for all analyses
            document_name = None
            try:
                document = self.documents_collection.find_one(
                    {"_id": ObjectId(document_id)},
                    {"file_name": 1}
                )
                if document:
                    document_name = document.get("file_name")
            except Exception as e:
                logger.warning(f"Could not fetch document name for document {document_id}: {e}")
            
            analyses = []
            for analysis in cursor:
                analyses.append(AnalysisResultResponse(
                    id=str(analysis["_id"]),
                    document_id=str(analysis["document_id"]),
                    document_name=document_name,
                    user_id=str(analysis["user_id"]),
                    analysis_type=analysis["analysis_type"],
                    query=analysis["query"],
                    output=analysis["output"],
                    confidence_score=analysis["confidence_score"],
                    data_quality_score=analysis["data_quality_score"],
                    validation_status=analysis["validation_status"],
                    processing_time_sec=analysis["processing_time_sec"],
                    created_at=analysis["created_at"]
                ))
            
            return analyses
            
        except Exception as e:
            logger.error(f"Error getting document analyses: {e}")
            return []
    
    def get_user_analyses(self, user_id: str, skip: int = 0, limit: int = 50) -> List[AnalysisResultResponse]:
        """Get all analyses for a specific user"""
        try:
            # Ensure collections are initialized
            if self.analysis_results_collection is None:
                self._initialize_collections()
                if self.analysis_results_collection is None:
                    logger.error("Could not initialize analysis results collection")
                    return []
            
            cursor = self.analysis_results_collection.find(
                {"user_id": ObjectId(user_id)}
            ).sort("created_at", -1).skip(skip).limit(limit)
            
            analyses = []
            for analysis in cursor:
                # Get document name from documents collection
                document_name = None
                try:
                    document = self.documents_collection.find_one(
                        {"_id": analysis["document_id"]},
                        {"file_name": 1}
                    )
                    if document:
                        document_name = document.get("file_name")
                except Exception as e:
                    logger.warning(f"Could not fetch document name for analysis {analysis['_id']}: {e}")
                
                analyses.append(AnalysisResultResponse(
                    id=str(analysis["_id"]),
                    document_id=str(analysis["document_id"]),
                    document_name=document_name,
                    user_id=str(analysis["user_id"]),
                    analysis_type=analysis["analysis_type"],
                    query=analysis["query"],
                    output=analysis["output"],
                    confidence_score=analysis["confidence_score"],
                    data_quality_score=analysis["data_quality_score"],
                    validation_status=analysis["validation_status"],
                    processing_time_sec=analysis["processing_time_sec"],
                    created_at=analysis["created_at"]
                ))
            
            return analyses
            
        except Exception as e:
            logger.error(f"Error getting user analyses: {e}")
            return []
    
    def get_user_stats(self) -> UserStats:
        """Get user statistics"""
        try:
            total_users = self.users_collection.count_documents({})
            active_users = self.users_collection.count_documents({"account.status": "active"})
            admin_users = self.users_collection.count_documents({"role": "Admin"})
            viewer_users = self.users_collection.count_documents({"role": "Viewer"})
            
            return UserStats(
                total_users=total_users,
                active_users=active_users,
                admin_users=admin_users,
                viewer_users=viewer_users
            )
            
        except Exception as e:
            logger.error(f"Error getting user stats: {e}")
            return UserStats(total_users=0, active_users=0, admin_users=0, viewer_users=0)
    
    def get_document_stats(self) -> DocumentStats:
        """Get document statistics"""
        try:
            total_documents = self.documents_collection.count_documents({})
            
            # Documents by status
            status_pipeline = [
                {"$group": {"_id": "$status", "count": {"$sum": 1}}}
            ]
            status_results = list(self.documents_collection.aggregate(status_pipeline))
            documents_by_status = {result["_id"]: result["count"] for result in status_results}
            
            # Documents by format
            format_pipeline = [
                {"$group": {"_id": "$file_format", "count": {"$sum": 1}}}
            ]
            format_results = list(self.documents_collection.aggregate(format_pipeline))
            documents_by_format = {result["_id"]: result["count"] for result in format_results}
            
            # Total storage
            storage_pipeline = [
                {"$group": {"_id": None, "total_storage": {"$sum": "$file_size_mb"}}}
            ]
            storage_result = list(self.documents_collection.aggregate(storage_pipeline))
            total_storage_mb = storage_result[0]["total_storage"] if storage_result else 0.0
            
            return DocumentStats(
                total_documents=total_documents,
                documents_by_status=documents_by_status,
                documents_by_format=documents_by_format,
                total_storage_mb=total_storage_mb
            )
            
        except Exception as e:
            logger.error(f"Error getting document stats: {e}")
            return DocumentStats(
                total_documents=0,
                documents_by_status={},
                documents_by_format={},
                total_storage_mb=0.0
            )
    
    def get_analysis_stats(self) -> AnalysisStats:
        """Get analysis statistics"""
        try:
            total_analyses = self.analysis_results_collection.count_documents({})
            
            # Analyses by type
            type_pipeline = [
                {"$group": {"_id": "$analysis_type", "count": {"$sum": 1}}}
            ]
            type_results = list(self.analysis_results_collection.aggregate(type_pipeline))
            analyses_by_type = {result["_id"]: result["count"] for result in type_results}
            
            # Average confidence score
            confidence_pipeline = [
                {"$group": {"_id": None, "avg_confidence": {"$avg": "$confidence_score"}}}
            ]
            confidence_result = list(self.analysis_results_collection.aggregate(confidence_pipeline))
            average_confidence_score = confidence_result[0]["avg_confidence"] if confidence_result else 0.0
            
            # Average processing time
            time_pipeline = [
                {"$group": {"_id": None, "avg_time": {"$avg": "$processing_time_sec"}}}
            ]
            time_result = list(self.analysis_results_collection.aggregate(time_pipeline))
            average_processing_time = time_result[0]["avg_time"] if time_result else 0.0
            
            return AnalysisStats(
                total_analyses=total_analyses,
                analyses_by_type=analyses_by_type,
                average_confidence_score=average_confidence_score,
                average_processing_time=average_processing_time
            )
            
        except Exception as e:
            logger.error(f"Error getting analysis stats: {e}")
            return AnalysisStats(
                total_analyses=0,
                analyses_by_type={},
                average_confidence_score=0.0,
                average_processing_time=0.0
            )

    def get_document_by_id(self, document_id: str) -> Optional[DocumentResponse]:
        """Get a document by its ID"""
        try:
            if self.documents_collection is None:
                logger.warning("MongoDB not available - cannot get document")
                return None
                
            from bson import ObjectId
            document_doc = self.documents_collection.find_one({"_id": ObjectId(document_id)})
            if not document_doc:
                logger.warning(f"Document {document_id} not found")
                return None
            logger.info(f"Document {document_id} found")
            
            # Convert ObjectIds to strings for Pydantic model
            document_doc["_id"] = str(document_doc["_id"])
            document_doc["user_id"] = str(document_doc["user_id"])
            if "analysis_ids" in document_doc and document_doc["analysis_ids"]:
                document_doc["analysis_ids"] = [str(aid) for aid in document_doc["analysis_ids"]]
            
            return DocumentResponse(**document_doc, id=document_doc["_id"])
        except Exception as e:
            logger.error(f"Error getting document by ID {document_id}: {e}")
            return None

    def delete_document(self, document_id: str) -> bool:
        """Delete a document from the database"""
        try:
            if self.documents_collection is None:
                logger.warning("MongoDB not available - cannot delete document")
                return False
                
            from bson import ObjectId
            result = self.documents_collection.delete_one({"_id": ObjectId(document_id)})
            success = result.deleted_count > 0
            
            if success:
                logger.info(f"Document {document_id} deleted successfully")
            else:
                logger.warning(f"Document {document_id} not found for deletion")
                
            return success
        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {e}")
            return False

    def delete_analyses_by_document_id(self, document_id: str) -> int:
        """Delete all analyses associated with a document"""
        try:
            if self.analysis_results_collection is None:
                logger.warning("MongoDB not available - cannot delete analyses")
                return 0
                
            from bson import ObjectId
            result = self.analysis_results_collection.delete_many({"document_id": ObjectId(document_id)})
            deleted_count = result.deleted_count
            
            if deleted_count > 0:
                logger.info(f"Deleted {deleted_count} analyses for document {document_id}")
            
            return deleted_count
        except Exception as e:
            logger.error(f"Error deleting analyses for document {document_id}: {e}")
            return 0

    def get_analyses_by_document_id(self, document_id: str, skip: int = 0, limit: int = 50) -> List[AnalysisResultResponse]:
        """Get all analyses for a specific document"""
        try:
            if self.analysis_results_collection is None:
                logger.warning("MongoDB not available - cannot get analyses")
                return []
                
            from bson import ObjectId
            analyses_docs = self.analysis_results_collection.find(
                {"document_id": ObjectId(document_id)}
            ).skip(skip).limit(limit).sort("created_at", -1).to_list(length=None)
            
            # Get document name once for all analyses
            document_name = None
            try:
                document = self.documents_collection.find_one(
                    {"_id": ObjectId(document_id)},
                    {"file_name": 1}
                )
                if document:
                    document_name = document.get("file_name")
            except Exception as e:
                logger.warning(f"Could not fetch document name for document {document_id}: {e}")
            
            analyses = []
            for analysis_doc in analyses_docs:
                # Convert ObjectIds to strings for Pydantic model
                analysis_doc["_id"] = str(analysis_doc["_id"])
                analysis_doc["document_id"] = str(analysis_doc["document_id"])
                analysis_doc["user_id"] = str(analysis_doc["user_id"])
                analysis_doc["document_name"] = document_name
                
                analyses.append(AnalysisResultResponse(**analysis_doc, id=analysis_doc["_id"]))
            
            logger.info(f"Retrieved {len(analyses)} analyses for document {document_id}")
            return analyses
            
        except Exception as e:
            logger.error(f"Error getting analyses for document {document_id}: {e}")
            return []

# Global user service instance
user_service = UserService()
