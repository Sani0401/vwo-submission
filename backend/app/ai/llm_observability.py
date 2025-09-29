"""
LLM Observability Service for Financial Document Analyzer
Handles monitoring, tracking, and analytics for LLM calls and tool usage
"""

import os
import time
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
from dataclasses import dataclass, asdict
import hashlib

try:
    import langsmith
    from langsmith import Client, traceable
    LANGSMITH_AVAILABLE = True
except ImportError:
    LANGSMITH_AVAILABLE = False
    logging.warning("LangSmith not available. LLM observability will be limited.")

try:
    import wandb
    WANDB_AVAILABLE = True
except ImportError:
    WANDB_AVAILABLE = False
    logging.warning("Weights & Biases not available. Advanced LLM observability will be limited.")

try:
    import tiktoken
    TIKTOKEN_AVAILABLE = True
except ImportError:
    TIKTOKEN_AVAILABLE = False
    logging.warning("Tiktoken not available. Token counting will use approximation.")

from app.core.database import get_mongodb_client
from app.models.schemas import LogLevel, LogCategory, LogAction

# Set up logging
logger = logging.getLogger(__name__)

@dataclass
class LLMCallMetrics:
    """Metrics for LLM calls"""
    call_id: str
    timestamp: datetime
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: float
    latency_ms: float
    success: bool
    error_message: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    request_type: str = "analysis"
    input_length: int = 0
    output_length: int = 0
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None
    prompt_hash: Optional[str] = None
    response_hash: Optional[str] = None

@dataclass
class ToolCallMetrics:
    """Metrics for tool calls"""
    tool_call_id: str
    timestamp: datetime
    tool_name: str
    input_size: int
    output_size: int
    execution_time_ms: float
    success: bool
    error_message: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None

class LLMObservabilityService:
    """Service for monitoring LLM and tool usage"""
    
    def __init__(self):
        self.mongodb_client = get_mongodb_client()
        self.langsmith_client = None
        self.wandb_run = None
        self.observability_enabled = False
        
        # Initialize LangSmith if available
        if LANGSMITH_AVAILABLE:
            self._initialize_langsmith()
        
        # Initialize Weights & Biases if available
        if WANDB_AVAILABLE:
            self._initialize_wandb()
        
        # Initialize MongoDB collections
        self._initialize_collections()
        
        # Initialize token encoders
        self._initialize_token_encoders()
        
        # Cost tracking (approximate costs for different models)
        self.model_costs = {
            "gpt-3.5-turbo": {"input": 0.0015, "output": 0.002},  # per 1K tokens
            "gpt-4": {"input": 0.03, "output": 0.06},
            "gpt-4-turbo": {"input": 0.01, "output": 0.03},
            "gpt-4o": {"input": 0.005, "output": 0.015},
            "claude-3-sonnet": {"input": 0.003, "output": 0.015},
            "claude-3-opus": {"input": 0.015, "output": 0.075},
            "claude-3-haiku": {"input": 0.00025, "output": 0.00125},
            "gemini-pro": {"input": 0.0005, "output": 0.0015},
            "gemini-pro-vision": {"input": 0.0005, "output": 0.0015},
        }
    
    def _initialize_langsmith(self):
        """Initialize LangSmith client"""
        try:
            # Set up LangSmith environment variables
            os.environ["LANGCHAIN_TRACING_V2"] = "true"
            os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"
            os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGSMITH_API_KEY", "")
            os.environ["LANGCHAIN_PROJECT"] = "financial-document-analyzer"
            
            if os.getenv("LANGSMITH_API_KEY"):
                self.langsmith_client = Client()
                self.observability_enabled = True
                logger.info("LangSmith client initialized successfully")
            else:
                logger.warning("LANGSMITH_API_KEY not set. LangSmith tracing disabled.")
                
        except Exception as e:
            logger.error(f"Failed to initialize LangSmith: {e}")
            self.observability_enabled = False
    
    def _initialize_wandb(self):
        """Initialize Weights & Biases"""
        try:
            if os.getenv("WANDB_API_KEY"):
                wandb.init(
                    project="financial-document-analyzer",
                    name=f"llm-observability-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}",
                    config={
                        "model_costs": self.model_costs,
                        "observability_features": ["token_tracking", "cost_monitoring", "performance_metrics"]
                    }
                )
                self.wandb_run = wandb.run
                logger.info("Weights & Biases initialized successfully")
            else:
                logger.warning("WANDB_API_KEY not set. Weights & Biases tracking disabled.")
        except Exception as e:
            logger.error(f"Failed to initialize Weights & Biases: {e}")
    
    def _initialize_token_encoders(self):
        """Initialize token encoders for accurate token counting"""
        self.token_encoders = {}
        try:
            if TIKTOKEN_AVAILABLE:
                # Initialize encoders for different models
                self.token_encoders["gpt-3.5-turbo"] = tiktoken.encoding_for_model("gpt-3.5-turbo")
                self.token_encoders["gpt-4"] = tiktoken.encoding_for_model("gpt-4")
                self.token_encoders["gpt-4-turbo"] = tiktoken.encoding_for_model("gpt-4-turbo")
                self.token_encoders["gpt-4o"] = tiktoken.encoding_for_model("gpt-4o")
                logger.info("Token encoders initialized successfully")
        except Exception as e:
            logger.warning(f"Could not initialize token encoders: {e}")
            self.token_encoders = {}
    
    def _initialize_collections(self):
        """Initialize MongoDB collections for observability"""
        try:
            if self.mongodb_client.db:
                self.llm_metrics_collection = self.mongodb_client.db['llm_metrics']
                self.tool_metrics_collection = self.mongodb_client.db['tool_metrics']
                self.observability_stats_collection = self.mongodb_client.db['observability_stats']
                
                # Create indexes
                self._create_observability_indexes()
                logger.info("Observability collections initialized")
            else:
                logger.error("MongoDB not available for observability")
        except Exception as e:
            logger.error(f"Failed to initialize observability collections: {e}")
    
    def _create_observability_indexes(self):
        """Create indexes for observability collections"""
        try:
            # LLM metrics indexes
            self.llm_metrics_collection.create_index("timestamp")
            self.llm_metrics_collection.create_index("user_id")
            self.llm_metrics_collection.create_index("model")
            self.llm_metrics_collection.create_index([("timestamp", -1), ("user_id", 1)])
            
            # Tool metrics indexes
            self.tool_metrics_collection.create_index("timestamp")
            self.tool_metrics_collection.create_index("user_id")
            self.tool_metrics_collection.create_index("tool_name")
            self.tool_metrics_collection.create_index([("timestamp", -1), ("user_id", 1)])
            
            logger.info("Observability indexes created")
        except Exception as e:
            logger.warning(f"Could not create observability indexes: {e}")
    
    def track_llm_call(
        self,
        model: str,
        prompt_tokens: int = None,
        completion_tokens: int = None,
        latency_ms: float = 0,
        success: bool = True,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        request_type: str = "analysis",
        input_text: str = "",
        output_text: str = "",
        error_message: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        frequency_penalty: Optional[float] = None,
        presence_penalty: Optional[float] = None
    ) -> str:
        """Track an LLM call with detailed metrics"""
        try:
            call_id = self._generate_call_id()
            
            # Calculate accurate token counts if not provided
            if prompt_tokens is None or completion_tokens is None:
                prompt_tokens, completion_tokens = self._count_tokens(model, input_text, output_text)
            
            total_tokens = prompt_tokens + completion_tokens
            
            # Calculate cost
            cost_usd = self._calculate_cost(model, prompt_tokens, completion_tokens)
            
            # Generate hashes for deduplication
            prompt_hash = self._generate_hash(input_text)
            response_hash = self._generate_hash(output_text)
            
            # Create metrics object
            metrics = LLMCallMetrics(
                call_id=call_id,
                timestamp=datetime.utcnow(),
                model=model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                cost_usd=cost_usd,
                latency_ms=latency_ms,
                success=success,
                error_message=error_message,
                user_id=user_id,
                session_id=session_id,
                request_type=request_type,
                input_length=len(input_text),
                output_length=len(output_text),
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p,
                frequency_penalty=frequency_penalty,
                presence_penalty=presence_penalty,
                prompt_hash=prompt_hash,
                response_hash=response_hash
            )
            
            # Store in MongoDB
            if hasattr(self, 'llm_metrics_collection'):
                self.llm_metrics_collection.insert_one(asdict(metrics))
            
            # Log to Weights & Biases
            if self.wandb_run:
                self._log_to_wandb(metrics)
            
            # Log to application logs
            self._log_llm_call(metrics)
            
            return call_id
            
        except Exception as e:
            logger.error(f"Error tracking LLM call: {e}")
            return ""
    
    def track_tool_call(
        self,
        tool_name: str,
        input_data: Any,
        output_data: Any,
        execution_time_ms: float,
        success: bool,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        error_message: Optional[str] = None
    ) -> str:
        """Track a tool call with metrics"""
        try:
            tool_call_id = self._generate_call_id()
            
            # Create metrics object
            metrics = ToolCallMetrics(
                tool_call_id=tool_call_id,
                timestamp=datetime.utcnow(),
                tool_name=tool_name,
                input_size=len(str(input_data)),
                output_size=len(str(output_data)),
                execution_time_ms=execution_time_ms,
                success=success,
                error_message=error_message,
                user_id=user_id,
                session_id=session_id
            )
            
            # Store in MongoDB
            if hasattr(self, 'tool_metrics_collection'):
                self.tool_metrics_collection.insert_one(asdict(metrics))
            
            # Log to application logs
            self._log_tool_call(metrics)
            
            return tool_call_id
            
        except Exception as e:
            logger.error(f"Error tracking tool call: {e}")
            return ""
    
    def _calculate_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> float:
        """Calculate approximate cost for LLM usage"""
        if model not in self.model_costs:
            return 0.0
        
        costs = self.model_costs[model]
        input_cost = (prompt_tokens / 1000) * costs["input"]
        output_cost = (completion_tokens / 1000) * costs["output"]
        
        return input_cost + output_cost
    
    def _generate_call_id(self) -> str:
        """Generate unique call ID"""
        timestamp = str(time.time())
        random_data = str(hash(timestamp))
        return hashlib.md5(f"{timestamp}{random_data}".encode()).hexdigest()[:16]
    
    def _count_tokens(self, model: str, input_text: str, output_text: str) -> tuple[int, int]:
        """Count tokens accurately using tiktoken or approximation"""
        try:
            if model in self.token_encoders:
                encoder = self.token_encoders[model]
                prompt_tokens = len(encoder.encode(input_text))
                completion_tokens = len(encoder.encode(output_text))
                return prompt_tokens, completion_tokens
            else:
                # Fallback to approximation
                prompt_tokens = int(len(input_text.split()) * 1.3)
                completion_tokens = int(len(output_text.split()) * 1.3)
                return prompt_tokens, completion_tokens
        except Exception as e:
            logger.warning(f"Error counting tokens: {e}")
            # Fallback to approximation
            prompt_tokens = int(len(input_text.split()) * 1.3)
            completion_tokens = int(len(output_text.split()) * 1.3)
            return prompt_tokens, completion_tokens
    
    def _generate_hash(self, text: str) -> str:
        """Generate hash for text deduplication"""
        return hashlib.md5(text.encode()).hexdigest()
    
    def _log_to_wandb(self, metrics: LLMCallMetrics):
        """Log metrics to Weights & Biases"""
        try:
            if self.wandb_run:
                wandb.log({
                    "llm_call/tokens": metrics.total_tokens,
                    "llm_call/prompt_tokens": metrics.prompt_tokens,
                    "llm_call/completion_tokens": metrics.completion_tokens,
                    "llm_call/cost_usd": metrics.cost_usd,
                    "llm_call/latency_ms": metrics.latency_ms,
                    "llm_call/success": 1 if metrics.success else 0,
                    "llm_call/model": metrics.model,
                    "llm_call/request_type": metrics.request_type,
                    "llm_call/temperature": metrics.temperature or 0,
                    "llm_call/max_tokens": metrics.max_tokens or 0,
                    "llm_call/top_p": metrics.top_p or 0,
                    "llm_call/frequency_penalty": metrics.frequency_penalty or 0,
                    "llm_call/presence_penalty": metrics.presence_penalty or 0,
                })
        except Exception as e:
            logger.error(f"Error logging to Weights & Biases: {e}")
    
    def _log_llm_call(self, metrics: LLMCallMetrics):
        """Log LLM call to application logs"""
        level = LogLevel.INFO if metrics.success else LogLevel.ERROR
        message = f"LLM Call: {metrics.model} - {metrics.total_tokens} tokens, {metrics.latency_ms:.2f}ms, ${metrics.cost_usd:.4f}"
        
        if metrics.error_message:
            message += f" - Error: {metrics.error_message}"
        
        # Log to MongoDB logs collection
        from app.core.logging import get_logging_service
        logging_service = get_logging_service()
        logging_service.log_activity(
            level=level,
            category=LogCategory.SYSTEM,
            action=LogAction.API_REQUEST,
            message=message,
            user_id=metrics.user_id,
            details={
                "call_id": metrics.call_id,
                "model": metrics.model,
                "prompt_tokens": metrics.prompt_tokens,
                "completion_tokens": metrics.completion_tokens,
                "total_tokens": metrics.total_tokens,
                "cost_usd": metrics.cost_usd,
                "latency_ms": metrics.latency_ms,
                "request_type": metrics.request_type,
                "input_length": metrics.input_length,
                "output_length": metrics.output_length
            }
        )
    
    def _log_tool_call(self, metrics: ToolCallMetrics):
        """Log tool call to application logs"""
        level = LogLevel.INFO if metrics.success else LogLevel.ERROR
        message = f"Tool Call: {metrics.tool_name} - {metrics.execution_time_ms:.2f}ms"
        
        if metrics.error_message:
            message += f" - Error: {metrics.error_message}"
        
        # Log to MongoDB logs collection
        from app.core.logging import get_logging_service
        logging_service = get_logging_service()
        logging_service.log_activity(
            level=level,
            category=LogCategory.SYSTEM,
            action=LogAction.API_REQUEST,
            message=message,
            user_id=metrics.user_id,
            details={
                "tool_call_id": metrics.tool_call_id,
                "tool_name": metrics.tool_name,
                "input_size": metrics.input_size,
                "output_size": metrics.output_size,
                "execution_time_ms": metrics.execution_time_ms
            }
        )
    
    def get_llm_usage_stats(
        self,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get LLM usage statistics"""
        try:
            if not hasattr(self, 'llm_metrics_collection'):
                return {}
            
            # Build query
            query = {}
            if user_id:
                query["user_id"] = user_id
            if start_date or end_date:
                query["timestamp"] = {}
                if start_date:
                    query["timestamp"]["$gte"] = start_date
                if end_date:
                    query["timestamp"]["$lte"] = end_date
            
            # Aggregate statistics
            pipeline = [
                {"$match": query},
                {"$group": {
                    "_id": None,
                    "total_calls": {"$sum": 1},
                    "total_tokens": {"$sum": "$total_tokens"},
                    "total_cost": {"$sum": "$cost_usd"},
                    "avg_latency": {"$avg": "$latency_ms"},
                    "successful_calls": {"$sum": {"$cond": ["$success", 1, 0]}},
                    "failed_calls": {"$sum": {"$cond": ["$success", 0, 1]}}
                }}
            ]
            
            result = list(self.llm_metrics_collection.aggregate(pipeline))
            if result:
                stats = result[0]
                stats["success_rate"] = (stats["successful_calls"] / stats["total_calls"]) * 100 if stats["total_calls"] > 0 else 0
                return stats
            
            return {}
            
        except Exception as e:
            logger.error(f"Error getting LLM usage stats: {e}")
            return {}
    
    def get_tool_usage_stats(
        self,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get tool usage statistics"""
        try:
            if not hasattr(self, 'tool_metrics_collection'):
                return {}
            
            # Build query
            query = {}
            if user_id:
                query["user_id"] = user_id
            if start_date or end_date:
                query["timestamp"] = {}
                if start_date:
                    query["timestamp"]["$gte"] = start_date
                if end_date:
                    query["timestamp"]["$lte"] = end_date
            
            # Aggregate statistics
            pipeline = [
                {"$match": query},
                {"$group": {
                    "_id": "$tool_name",
                    "total_calls": {"$sum": 1},
                    "avg_execution_time": {"$avg": "$execution_time_ms"},
                    "successful_calls": {"$sum": {"$cond": ["$success", 1, 0]}},
                    "failed_calls": {"$sum": {"$cond": ["$success", 0, 1]}}
                }},
                {"$sort": {"total_calls": -1}}
            ]
            
            result = list(self.tool_metrics_collection.aggregate(pipeline))
            return {"tools": result}
            
        except Exception as e:
            logger.error(f"Error getting tool usage stats: {e}")
            return {}
    
    def get_cost_analysis(
        self,
        user_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get cost analysis for LLM usage"""
        try:
            if not hasattr(self, 'llm_metrics_collection'):
                return {}
            
            end_date = datetime.utcnow()
            start_date = datetime(end_date.year, end_date.month, end_date.day - days)
            
            # Build query
            query = {"timestamp": {"$gte": start_date, "$lte": end_date}}
            if user_id:
                query["user_id"] = user_id
            
            # Daily cost breakdown
            pipeline = [
                {"$match": query},
                {"$group": {
                    "_id": {
                        "year": {"$year": "$timestamp"},
                        "month": {"$month": "$timestamp"},
                        "day": {"$dayOfMonth": "$timestamp"}
                    },
                    "daily_cost": {"$sum": "$cost_usd"},
                    "daily_tokens": {"$sum": "$total_tokens"},
                    "daily_calls": {"$sum": 1}
                }},
                {"$sort": {"_id": 1}}
            ]
            
            daily_breakdown = list(self.llm_metrics_collection.aggregate(pipeline))
            
            # Model breakdown
            model_pipeline = [
                {"$match": query},
                {"$group": {
                    "_id": "$model",
                    "total_cost": {"$sum": "$cost_usd"},
                    "total_tokens": {"$sum": "$total_tokens"},
                    "total_calls": {"$sum": 1}
                }},
                {"$sort": {"total_cost": -1}}
            ]
            
            model_breakdown = list(self.llm_metrics_collection.aggregate(model_pipeline))
            
            return {
                "daily_breakdown": daily_breakdown,
                "model_breakdown": model_breakdown,
                "period_days": days
            }
            
        except Exception as e:
            logger.error(f"Error getting cost analysis: {e}")
            return {}
    
    def get_performance_metrics(
        self,
        user_id: Optional[str] = None,
        days: int = 7
    ) -> Dict[str, Any]:
        """Get comprehensive performance metrics"""
        try:
            if not hasattr(self, 'llm_metrics_collection'):
                return {}
            
            end_date = datetime.utcnow()
            start_date = datetime(end_date.year, end_date.month, end_date.day - days)
            
            query = {"timestamp": {"$gte": start_date, "$lte": end_date}}
            if user_id:
                query["user_id"] = user_id
            
            # Performance metrics pipeline
            pipeline = [
                {"$match": query},
                {"$group": {
                    "_id": None,
                    "avg_latency": {"$avg": "$latency_ms"},
                    "p95_latency": {"$percentile": {"input": "$latency_ms", "p": [0.95]}},
                    "p99_latency": {"$percentile": {"input": "$latency_ms", "p": [0.99]}},
                    "min_latency": {"$min": "$latency_ms"},
                    "max_latency": {"$max": "$latency_ms"},
                    "total_calls": {"$sum": 1},
                    "successful_calls": {"$sum": {"$cond": ["$success", 1, 0]}},
                    "failed_calls": {"$sum": {"$cond": ["$success", 0, 1]}},
                    "total_tokens": {"$sum": "$total_tokens"},
                    "total_cost": {"$sum": "$cost_usd"},
                    "avg_tokens_per_call": {"$avg": "$total_tokens"},
                    "avg_cost_per_call": {"$avg": "$cost_usd"}
                }}
            ]
            
            result = list(self.llm_metrics_collection.aggregate(pipeline))
            if result:
                metrics = result[0]
                metrics["success_rate"] = (metrics["successful_calls"] / metrics["total_calls"]) * 100 if metrics["total_calls"] > 0 else 0
                metrics["period_days"] = days
                return metrics
            
            return {}
            
        except Exception as e:
            logger.error(f"Error getting performance metrics: {e}")
            return {}
    
    def get_model_comparison(
        self,
        user_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Compare performance across different models"""
        try:
            if not hasattr(self, 'llm_metrics_collection'):
                return {}
            
            end_date = datetime.utcnow()
            start_date = datetime(end_date.year, end_date.month, end_date.day - days)
            
            query = {"timestamp": {"$gte": start_date, "$lte": end_date}}
            if user_id:
                query["user_id"] = user_id
            
            pipeline = [
                {"$match": query},
                {"$group": {
                    "_id": "$model",
                    "total_calls": {"$sum": 1},
                    "avg_latency": {"$avg": "$latency_ms"},
                    "avg_tokens": {"$avg": "$total_tokens"},
                    "avg_cost": {"$avg": "$cost_usd"},
                    "total_cost": {"$sum": "$cost_usd"},
                    "success_rate": {"$avg": {"$cond": ["$success", 1, 0]}},
                    "total_tokens": {"$sum": "$total_tokens"}
                }},
                {"$sort": {"total_calls": -1}}
            ]
            
            result = list(self.llm_metrics_collection.aggregate(pipeline))
            return {"models": result, "period_days": days}
            
        except Exception as e:
            logger.error(f"Error getting model comparison: {e}")
            return {}
    
    def get_usage_trends(
        self,
        user_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get usage trends over time"""
        try:
            if not hasattr(self, 'llm_metrics_collection'):
                return {}
            
            end_date = datetime.utcnow()
            start_date = datetime(end_date.year, end_date.month, end_date.day - days)
            
            query = {"timestamp": {"$gte": start_date, "$lte": end_date}}
            if user_id:
                query["user_id"] = user_id
            
            pipeline = [
                {"$match": query},
                {"$group": {
                    "_id": {
                        "year": {"$year": "$timestamp"},
                        "month": {"$month": "$timestamp"},
                        "day": {"$dayOfMonth": "$timestamp"}
                    },
                    "daily_calls": {"$sum": 1},
                    "daily_tokens": {"$sum": "$total_tokens"},
                    "daily_cost": {"$sum": "$cost_usd"},
                    "avg_latency": {"$avg": "$latency_ms"},
                    "success_rate": {"$avg": {"$cond": ["$success", 1, 0]}}
                }},
                {"$sort": {"_id": 1}}
            ]
            
            result = list(self.llm_metrics_collection.aggregate(pipeline))
            return {"trends": result, "period_days": days}
            
        except Exception as e:
            logger.error(f"Error getting usage trends: {e}")
            return {}
    
    def get_anomaly_detection(
        self,
        user_id: Optional[str] = None,
        days: int = 7
    ) -> Dict[str, Any]:
        """Detect anomalies in LLM usage patterns"""
        try:
            if not hasattr(self, 'llm_metrics_collection'):
                return {}
            
            end_date = datetime.utcnow()
            start_date = datetime(end_date.year, end_date.month, end_date.day - days)
            
            query = {"timestamp": {"$gte": start_date, "$lte": end_date}}
            if user_id:
                query["user_id"] = user_id
            
            # Get baseline metrics
            baseline_pipeline = [
                {"$match": query},
                {"$group": {
                    "_id": None,
                    "avg_latency": {"$avg": "$latency_ms"},
                    "std_latency": {"$stdDevPop": "$latency_ms"},
                    "avg_cost": {"$avg": "$cost_usd"},
                    "std_cost": {"$stdDevPop": "$cost_usd"},
                    "avg_tokens": {"$avg": "$total_tokens"},
                    "std_tokens": {"$stdDevPop": "$total_tokens"}
                }}
            ]
            
            baseline = list(self.llm_metrics_collection.aggregate(baseline_pipeline))
            if not baseline:
                return {}
            
            baseline = baseline[0]
            
            # Find anomalies (values > 2 standard deviations from mean)
            anomaly_query = {
                **query,
                "$or": [
                    {"latency_ms": {"$gt": baseline["avg_latency"] + 2 * baseline["std_latency"]}},
                    {"cost_usd": {"$gt": baseline["avg_cost"] + 2 * baseline["std_cost"]}},
                    {"total_tokens": {"$gt": baseline["avg_tokens"] + 2 * baseline["std_tokens"]}}
                ]
            }
            
            anomalies = list(self.llm_metrics_collection.find(anomaly_query).limit(10))
            
            return {
                "baseline": baseline,
                "anomalies": anomalies,
                "anomaly_count": len(anomalies)
            }
            
        except Exception as e:
            logger.error(f"Error detecting anomalies: {e}")
            return {}

# Global observability service instance
observability_service = None

def get_observability_service() -> LLMObservabilityService:
    """Get or create observability service instance"""
    global observability_service
    if observability_service is None:
        observability_service = LLMObservabilityService()
    return observability_service

# Decorator for automatic LLM call tracking
def track_llm_call(model: str, user_id: Optional[str] = None, session_id: Optional[str] = None):
    """Decorator to automatically track LLM calls"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            success = True
            error_message = None
            input_text = ""
            output_text = ""
            
            try:
                # Extract input text if possible
                if args:
                    input_text = str(args[0])[:1000]  # Limit to first 1000 chars
                
                result = func(*args, **kwargs)
                
                # Extract output text if possible
                if result:
                    output_text = str(result)[:1000]  # Limit to first 1000 chars
                
                return result
                
            except Exception as e:
                success = False
                error_message = str(e)
                raise
                
            finally:
                # Calculate metrics
                latency_ms = (time.time() - start_time) * 1000
                
                # Estimate token usage (rough approximation)
                prompt_tokens = len(input_text.split()) * 1.3  # Rough estimate
                completion_tokens = len(output_text.split()) * 1.3  # Rough estimate
                
                # Track the call
                service = get_observability_service()
                service.track_llm_call(
                    model=model,
                    prompt_tokens=int(prompt_tokens),
                    completion_tokens=int(completion_tokens),
                    latency_ms=latency_ms,
                    success=success,
                    user_id=user_id,
                    session_id=session_id,
                    input_text=input_text,
                    output_text=output_text,
                    error_message=error_message
                )
        
        return wrapper
    return decorator

# Convenience functions
def track_crewai_call(crew_result: Any, user_id: Optional[str] = None, session_id: Optional[str] = None):
    """Track a CrewAI call result"""
    try:
        service = get_observability_service()
        
        # Extract information from CrewAI result
        result_text = str(crew_result)
        input_text = "CrewAI Analysis Request"
        
        # Estimate metrics
        prompt_tokens = len(input_text.split()) * 1.3
        completion_tokens = len(result_text.split()) * 1.3
        latency_ms = 5000  # Default estimate for CrewAI calls
        
        service.track_llm_call(
            model="crewai-multi-agent",
            prompt_tokens=int(prompt_tokens),
            completion_tokens=int(completion_tokens),
            latency_ms=latency_ms,
            success=True,
            user_id=user_id,
            session_id=session_id,
            request_type="crewai_analysis",
            input_text=input_text,
            output_text=result_text
        )
        
    except Exception as e:
        logger.error(f"Error tracking CrewAI call: {e}")

def track_tool_usage(tool_name: str, input_data: Any, output_data: Any, execution_time_ms: float, user_id: Optional[str] = None, session_id: Optional[str] = None):
    """Track tool usage"""
    try:
        service = get_observability_service()
        service.track_tool_call(
            tool_name=tool_name,
            input_data=input_data,
            output_data=output_data,
            execution_time_ms=execution_time_ms,
            success=True,
            user_id=user_id,
            session_id=session_id
        )
    except Exception as e:
        logger.error(f"Error tracking tool usage: {e}")
