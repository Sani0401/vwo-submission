"""
Analysis Repository
Handles analysis data operations with MongoDB
"""

import logging
import re
from datetime import datetime
from typing import List, Optional, Dict, Any
from bson import ObjectId
from fastapi import HTTPException

from app.models.schemas import AnalysisResult, AnalysisResultResponse, AnalysisOutput, ValidationStatus
from app.repositories.connection import get_sync_database

logger = logging.getLogger(__name__)


class AnalysisRepository:
    """Repository for analysis data operations"""
    
    def __init__(self):
        self.db = get_sync_database()
        self.collection = self.db['analysis_results']
        self.documents_collection = self.db['documents']
    
    def extract_financial_data_points(self, summary_text: str) -> Dict[str, Any]:
        """Extract structured financial data points from analysis summary"""
        try:
            # Enforce 200-word limit on summary
            words = summary_text.split()
            if len(words) > 200:
                summary_text = ' '.join(words[:200]) + "... [truncated to 200 words]"
            
            data_points = {
                "metrics": {},
                "insights": [],
                "key_findings": [],
                "financial_highlights": [],
                "risks": [],
                "opportunities": []
            }
            
            # Financial metrics patterns
            financial_patterns = {
                "revenue": [
                    r"(?:revenue|sales|total revenue).*?(\$[\d,]+\.?\d*[BMK]?)",
                    r"(?:revenue|sales).*?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|billion|thousand|M|B|K)"
                ],
                "operating_income": [
                    r"(?:operating income|operating profit|ebit).*?(\$[\d,]+\.?\d*[BMK]?)",
                    r"(?:operating income|operating profit).*?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|billion|thousand|M|B|K)"
                ],
                "net_income": [
                    r"(?:net income|net profit|net earnings).*?(\$[\d,]+\.?\d*[BMK]?)",
                    r"(?:net income|net profit).*?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|billion|thousand|M|B|K)"
                ],
                "cash": [
                    r"(?:cash|cash equivalents).*?(\$[\d,]+\.?\d*[BMK]?)",
                    r"(?:cash|cash equivalents).*?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|billion|thousand|M|B|K)"
                ]
            }
            
            # Extract metrics using patterns
            for metric_name, patterns in financial_patterns.items():
                for pattern in patterns:
                    matches = re.findall(pattern, summary_text, re.IGNORECASE)
                    if matches:
                        data_points["metrics"][metric_name] = matches[0]
                        break
            
            # Extract insights, findings, highlights, risks, and opportunities
            lines = summary_text.split('\n')
            current_section = None
            
            for line in lines:
                line = line.strip()
                if not line or len(line) < 5:
                    continue
                
                # Detect section headers (case insensitive)
                line_lower = line.lower()
                if 'total insights:' in line_lower:
                    current_section = 'insights'
                    continue
                elif 'key findings:' in line_lower:
                    current_section = 'key_findings'
                    continue
                elif 'financial highlights:' in line_lower:
                    current_section = 'financial_highlights'
                    continue
                elif 'risk factors:' in line_lower:
                    current_section = 'risks'
                    continue
                elif 'opportunities:' in line_lower:
                    current_section = 'opportunities'
                    continue
                elif line.startswith('INVESTMENT RECOMMENDATION') or line.startswith('KEY FINANCIAL METRICS') or line.startswith('GROWTH & CHANGES'):
                    current_section = None
                    continue
                
                # Extract bullet points based on current section
                if (line.startswith('-') or line.startswith('•')) and len(line) > 15:
                    content = line[1:].strip()
                    if len(content) > 10:  # Ensure meaningful content
                        if current_section == 'insights' and len(data_points["insights"]) < 5:
                            data_points["insights"].append(content[:150])
                        elif current_section == 'key_findings' and len(data_points["key_findings"]) < 5:
                            data_points["key_findings"].append(content[:150])
                        elif current_section == 'financial_highlights' and len(data_points["financial_highlights"]) < 5:
                            data_points["financial_highlights"].append(content[:150])
                        elif current_section == 'risks' and len(data_points["risks"]) < 5:
                            data_points["risks"].append(content[:150])
                        elif current_section == 'opportunities' and len(data_points["opportunities"]) < 5:
                            data_points["opportunities"].append(content[:150])
                
                # Fallback: extract any meaningful bullet points
                elif (line.startswith('-') or line.startswith('•')) and len(line) > 20:
                    content = line[1:].strip()
                    if any(char.isdigit() for char in content) and len(data_points["insights"]) < 3:
                        data_points["insights"].append(content[:100])
            
            # If no insights were extracted, try to extract from the summary text directly
            if not any(data_points[key] for key in ["insights", "key_findings", "financial_highlights", "risks", "opportunities"]):
                self._extract_insights_fallback(summary_text, data_points)
            
            # Calculate confidence score based on completeness
            extraction_quality = 0
            if data_points["metrics"]:
                extraction_quality += 0.2
            if data_points["insights"]:
                extraction_quality += 0.15
            if data_points["key_findings"]:
                extraction_quality += 0.15
            if data_points["financial_highlights"]:
                extraction_quality += 0.15
            if data_points["risks"]:
                extraction_quality += 0.15
            if data_points["opportunities"]:
                extraction_quality += 0.15
            if data_points["insights"] and data_points["key_findings"] and data_points["financial_highlights"] and data_points["risks"] and data_points["opportunities"]:
                extraction_quality += 0.05  # Bonus for complete analysis
            
            data_points["extraction_quality_score"] = min(extraction_quality, 1.0)
            
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
    
    def _extract_insights_fallback(self, summary_text: str, data_points: dict):
        """Fallback method to extract insights when structured parsing fails"""
        try:
            # Split by sections and extract content
            sections = {
                'insights': ['Total Insights:', 'Insights:'],
                'key_findings': ['Key Findings:', 'Findings:'],
                'financial_highlights': ['Financial Highlights:', 'Highlights:'],
                'risks': ['Risk Factors:', 'Risks:'],
                'opportunities': ['Opportunities:']
            }
            
            for section_name, section_headers in sections.items():
                for header in section_headers:
                    if header.lower() in summary_text.lower():
                        # Find the section content
                        start_idx = summary_text.lower().find(header.lower())
                        if start_idx != -1:
                            # Find the end of this section (next section or end of text)
                            section_content = summary_text[start_idx + len(header):]
                            
                            # Find the next section
                            next_section_idx = len(section_content)
                            for other_header in ['Total Insights:', 'Key Findings:', 'Financial Highlights:', 'Risk Factors:', 'Opportunities:', 'Investment Recommendation:']:
                                other_idx = section_content.lower().find(other_header.lower())
                                if other_idx != -1 and other_idx < next_section_idx:
                                    next_section_idx = other_idx
                            
                            section_content = section_content[:next_section_idx]
                            
                            # Extract bullet points from this section
                            lines = section_content.split('\n')
                            for line in lines:
                                line = line.strip()
                                if (line.startswith('-') or line.startswith('•')) and len(line) > 15:
                                    content = line[1:].strip()
                                    if len(content) > 10 and len(data_points[section_name]) < 5:
                                        data_points[section_name].append(content[:150])
                                # Also check for numbered items like "Risk 1:", "Opportunity 1:", etc.
                                elif (line.startswith('Risk ') or line.startswith('Opportunity ')) and ':' in line:
                                    content = line.split(':', 1)[1].strip()
                                    if len(content) > 10 and len(data_points[section_name]) < 5:
                                        data_points[section_name].append(content[:150])
            
            # Fallback extraction completed
            
        except Exception as e:
            logger.error(f"Error in fallback extraction: {e}")
    
    def create_analysis_result(
        self,
        document_id: str,
        user_id: str,
        analysis_type: str,
        query: str,
        summary_text: str,
        confidence_score: float,
        data_quality_score: float,
        processing_time_sec: int
    ) -> AnalysisResultResponse:
        """Create a new analysis result with extracted data points"""
        try:
            # Check if analysis already exists
            existing_analysis = self.collection.find_one({
                "document_id": ObjectId(document_id),
                "user_id": ObjectId(user_id),
                "query": query
            })
            
            if existing_analysis:
                logger.warning(f"Analysis already exists for document {document_id}, user {user_id}")
                return self._analysis_to_response(existing_analysis)
            
            # Extract structured data points
            extracted_data = self.extract_financial_data_points(summary_text)
            
            # Create enhanced output
            enhanced_output = AnalysisOutput(
                summary=summary_text,
                metrics=extracted_data["metrics"],
                insights=extracted_data["insights"],
                key_findings=extracted_data["key_findings"],
                financial_highlights=extracted_data["financial_highlights"],
                risks=extracted_data["risks"],
                opportunities=extracted_data["opportunities"],
                extraction_quality_score=extracted_data["extraction_quality_score"],
                charts=[]
            )
            
            # Adjust confidence score
            adjusted_confidence = min(confidence_score + (extracted_data["extraction_quality_score"] * 0.1), 1.0)
            
            analysis_data = {
                "document_id": ObjectId(document_id),
                "user_id": ObjectId(user_id),
                "analysis_type": analysis_type,
                "query": query,
                "output": enhanced_output.dict(),
                "confidence_score": adjusted_confidence,
                "data_quality_score": data_quality_score,
                "validation_status": ValidationStatus.PASSED,
                "error_logs": [],
                "processing_time_sec": processing_time_sec,
                "created_at": datetime.utcnow()
            }
            
            # Insert analysis result
            result = self.collection.insert_one(analysis_data)
            analysis_data["_id"] = result.inserted_id
            
            # Update document with analysis ID
            self.documents_collection.update_one(
                {"_id": ObjectId(document_id)},
                {
                    "$push": {"analysis_ids": result.inserted_id},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            return self._analysis_to_response(analysis_data)
            
        except Exception as e:
            logger.error(f"Error creating analysis result: {e}")
            raise
    
    def get_user_analyses(self, user_id: str, skip: int = 0, limit: int = 50) -> List[AnalysisResultResponse]:
        """Get all analyses for a specific user"""
        try:
            cursor = self.collection.find(
                {"user_id": ObjectId(user_id)}
            ).sort("created_at", -1).skip(skip).limit(limit)
            
            analyses = []
            for analysis in cursor:
                # Get document name
                document_name = None
                try:
                    document = self.documents_collection.find_one(
                        {"_id": analysis["document_id"]},
                        {"file_name": 1}
                    )
                    if document:
                        document_name = document.get("file_name")
                except Exception as e:
                    logger.warning(f"Could not fetch document name: {e}")
                
                analysis_response = self._analysis_to_response(analysis)
                analysis_response.document_name = document_name
                analyses.append(analysis_response)
            
            return analyses
            
        except Exception as e:
            logger.error(f"Error getting user analyses: {e}")
            return []
    
    def get_structured_analysis(self, analysis_id: str, current_user) -> dict:
        """Get structured analysis data by ID"""
        try:
            analysis_doc = self.collection.find_one({"_id": ObjectId(analysis_id)})
            if not analysis_doc:
                raise HTTPException(status_code=404, detail="Analysis not found")
            
            # Check if user has access
            if str(analysis_doc["user_id"]) != current_user.id and current_user.role != "Admin":
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Format response
            structured_response = {
                "status": "success",
                "analysis_id": str(analysis_doc["_id"]),
                "document_id": str(analysis_doc["document_id"]),
                "user_id": str(analysis_doc["user_id"]),
                "analysis_type": analysis_doc["analysis_type"],
                "query": analysis_doc["query"],
                "created_at": analysis_doc["created_at"],
                "processing_time_sec": analysis_doc["processing_time_sec"],
                "confidence_score": analysis_doc["confidence_score"],
                "data_quality_score": analysis_doc["data_quality_score"],
                "validation_status": analysis_doc["validation_status"],
                "analysis": analysis_doc["output"]
            }
            
            return structured_response
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting structured analysis: {e}")
            raise HTTPException(status_code=500, detail=f"Error retrieving structured analysis: {str(e)}")
    
    def get_analyses_by_document_id(
        self,
        document_id: str,
        current_user,
        skip: int = 0,
        limit: int = 50
    ) -> List[AnalysisResultResponse]:
        """Get all analyses for a specific document"""
        try:
            # Get the document to check ownership
            document = self.documents_collection.find_one({"_id": ObjectId(document_id)})
            if not document:
                raise HTTPException(status_code=404, detail="Document not found")
            
            # Check if user has permission
            if str(document["user_id"]) != current_user.id and current_user.role != "Admin":
                raise HTTPException(status_code=403, detail="Not enough permissions")
            
            # Get analyses
            analyses_docs = list(self.collection.find(
                {"document_id": ObjectId(document_id)}
            ).skip(skip).limit(limit).sort("created_at", -1))
            
            analyses = []
            for analysis_doc in analyses_docs:
                analysis_response = self._analysis_to_response(analysis_doc)
                analysis_response.document_name = document.get("file_name")
                analyses.append(analysis_response)
            
            return analyses
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting analyses by document ID: {e}")
            return []
    
    def get_user_analysis_count(self, user_id: str) -> int:
        """Get total analysis count for a user"""
        try:
            return self.collection.count_documents({"user_id": ObjectId(user_id)})
        except Exception as e:
            logger.error(f"Error getting user analysis count: {e}")
            return 0
    
    def get_user_completed_analysis_count(self, user_id: str) -> int:
        """Get completed analysis count for a user (based on document status)"""
        try:
            # Get all documents for this user that are completed
            completed_docs = list(self.documents_collection.find(
                {"user_id": ObjectId(user_id), "status": "completed"},
                {"analysis_ids": 1}
            ))
            
            # Count total analyses for completed documents
            total_analyses = 0
            for doc in completed_docs:
                total_analyses += len(doc.get("analysis_ids", []))
            
            return total_analyses
        except Exception as e:
            logger.error(f"Error getting user completed analysis count: {e}")
            return 0
    
    def _analysis_to_response(self, doc: dict) -> AnalysisResultResponse:
        """Convert MongoDB document to AnalysisResultResponse"""
        return AnalysisResultResponse(
            id=str(doc["_id"]),
            document_id=str(doc["document_id"]),
            user_id=str(doc["user_id"]),
            analysis_type=doc["analysis_type"],
            query=doc["query"],
            output=doc["output"],
            confidence_score=doc["confidence_score"],
            data_quality_score=doc["data_quality_score"],
            validation_status=doc["validation_status"],
            processing_time_sec=doc["processing_time_sec"],
            created_at=doc["created_at"]
        )
