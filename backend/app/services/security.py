"""
Advanced Security Service for Financial Document Analyzer
Implements 2FA, advanced input validation, and security monitoring
"""

import os
import hashlib
import secrets
import time
import re
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
import logging
import asyncio
from pathlib import Path

# 2FA dependencies
try:
    import pyotp
    import qrcode
    from io import BytesIO
    import base64
    PYOTP_AVAILABLE = True
    QRCODE_AVAILABLE = True
except ImportError:
    PYOTP_AVAILABLE = False
    QRCODE_AVAILABLE = False
    logging.warning("pyotp/qrcode not available. 2FA will be limited.")

# Security monitoring dependencies
try:
    import bcrypt
    BCRYPT_AVAILABLE = True
except ImportError:
    BCRYPT_AVAILABLE = False
    logging.warning("bcrypt not available. Password hashing will be limited.")

from app.core.database import get_mongodb_client
from app.models.schemas import LogLevel, LogCategory, LogAction

# Set up logging
logger = logging.getLogger(__name__)

class SecurityService:
    """Advanced security service with 2FA and input validation"""
    
    def __init__(self):
        self.mongodb_client = get_mongodb_client()
        self.max_login_attempts = 5
        self.lockout_duration = 15 * 60  # 15 minutes
        self.session_timeout = 24 * 60 * 60  # 24 hours
        
        # Initialize logging service
        from app.core.logging import get_logging_service
        self.logging_service = get_logging_service()
        
        # Initialize security collections
        self._initialize_security_collections()
    
    def _initialize_security_collections(self):
        """Initialize MongoDB collections for security"""
        try:
            if self.mongodb_client.db:
                self.security_events_collection = self.mongodb_client.db['security_events']
                self.twofa_secrets_collection = self.mongodb_client.db['twofa_secrets']
                self.login_attempts_collection = self.mongodb_client.db['login_attempts']
                self.suspicious_activities_collection = self.mongodb_client.db['suspicious_activities']
                
                # Create indexes
                self._create_security_indexes()
                logger.info("Security collections initialized")
        except Exception as e:
            logger.error(f"Failed to initialize security collections: {e}")
    
    def _create_security_indexes(self):
        """Create indexes for security collections"""
        try:
            # Security events indexes
            self.security_events_collection.create_index("timestamp")
            self.security_events_collection.create_index("user_id")
            self.security_events_collection.create_index("event_type")
            self.security_events_collection.create_index([("timestamp", -1), ("user_id", 1)])
            
            # 2FA secrets indexes
            self.twofa_secrets_collection.create_index("user_id", unique=True)
            self.twofa_secrets_collection.create_index("created_at")
            
            # Login attempts indexes
            self.login_attempts_collection.create_index("user_id")
            self.login_attempts_collection.create_index("ip_address")
            self.login_attempts_collection.create_index("timestamp")
            self.login_attempts_collection.create_index([("user_id", 1), ("timestamp", -1)])
            
            # Suspicious activities indexes
            self.suspicious_activities_collection.create_index("timestamp")
            self.suspicious_activities_collection.create_index("user_id")
            self.suspicious_activities_collection.create_index("activity_type")
            
            logger.info("Security indexes created")
        except Exception as e:
            logger.warning(f"Could not create security indexes: {e}")
    
    def validate_input(self, input_data: Any, input_type: str, max_length: int = None) -> Dict[str, Any]:
        """Advanced input validation with security checks"""
        validation_result = {
            'is_valid': True,
            'errors': [],
            'warnings': [],
            'sanitized_data': None
        }
        
        try:
            if input_type == "email":
                validation_result = self._validate_email(input_data, validation_result)
            elif input_type == "password":
                validation_result = self._validate_password(input_data, validation_result)
            elif input_type == "filename":
                validation_result = self._validate_filename(input_data, validation_result)
            elif input_type == "text":
                validation_result = self._validate_text(input_data, max_length, validation_result)
            elif input_type == "file_content":
                validation_result = self._validate_file_content(input_data, validation_result)
            else:
                validation_result['is_valid'] = False
                validation_result['errors'].append(f"Unknown input type: {input_type}")
            
            return validation_result
            
        except Exception as e:
            validation_result['is_valid'] = False
            validation_result['errors'].append(f"Validation error: {str(e)}")
            return validation_result
    
    def _validate_email(self, email: str, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate email address"""
        if not email or not isinstance(email, str):
            result['is_valid'] = False
            result['errors'].append("Email is required")
            return result
        
        # Basic email regex
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            result['is_valid'] = False
            result['errors'].append("Invalid email format")
            return result
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'\.{2,}',  # Multiple consecutive dots
            r'@.*@',    # Multiple @ symbols
            r'[<>"\']', # HTML/script injection attempts
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, email):
                result['warnings'].append("Email contains suspicious characters")
                break
        
        result['sanitized_data'] = email.lower().strip()
        return result
    
    def _validate_password(self, password: str, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate password strength"""
        if not password or not isinstance(password, str):
            result['is_valid'] = False
            result['errors'].append("Password is required")
            return result
        
        # Password strength requirements
        if len(password) < 8:
            result['is_valid'] = False
            result['errors'].append("Password must be at least 8 characters long")
        
        if len(password) > 128:
            result['is_valid'] = False
            result['errors'].append("Password must be less than 128 characters")
        
        # Check for required character types
        if not re.search(r'[a-z]', password):
            result['errors'].append("Password must contain at least one lowercase letter")
        
        if not re.search(r'[A-Z]', password):
            result['errors'].append("Password must contain at least one uppercase letter")
        
        if not re.search(r'\d', password):
            result['errors'].append("Password must contain at least one digit")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            result['errors'].append("Password must contain at least one special character")
        
        # Check for common weak passwords
        weak_passwords = [
            'password', '123456', 'password123', 'admin', 'qwerty',
            'letmein', 'welcome', 'monkey', 'dragon', 'master'
        ]
        
        if password.lower() in weak_passwords:
            result['warnings'].append("Password is commonly used and easily guessable")
        
        # Check for repeated characters
        if re.search(r'(.)\1{2,}', password):
            result['warnings'].append("Password contains repeated characters")
        
        if result['errors']:
            result['is_valid'] = False
        
        return result
    
    def _validate_filename(self, filename: str, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate filename for security"""
        if not filename or not isinstance(filename, str):
            result['is_valid'] = False
            result['errors'].append("Filename is required")
            return result
        
        # Check for path traversal attempts
        dangerous_patterns = [
            r'\.\./',  # Directory traversal
            r'\.\.\\', # Windows directory traversal
            r'/',      # Path separators
            r'\\',     # Windows path separators
            r'<',      # HTML/script injection
            r'>',
            r'"',
            r"'",
            r'&',
            r'|',
            r';',
            r'`',
            r'$',
            r'*',
            r'?',
            r'[',
            r']',
            r'{',
            r'}',
            r'(',
            r')',
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, filename):
                result['is_valid'] = False
                result['errors'].append(f"Filename contains dangerous characters: {pattern}")
                break
        
        # Check filename length
        if len(filename) > 255:
            result['is_valid'] = False
            result['errors'].append("Filename too long")
        
        # Check for reserved names (Windows)
        reserved_names = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
        if filename.upper().split('.')[0] in reserved_names:
            result['is_valid'] = False
            result['errors'].append("Filename is reserved")
        
        if result['is_valid']:
            result['sanitized_data'] = filename.strip()
        
        return result
    
    def _validate_text(self, text: str, max_length: int, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate text input"""
        if not isinstance(text, str):
            result['is_valid'] = False
            result['errors'].append("Text must be a string")
            return result
        
        if max_length and len(text) > max_length:
            result['is_valid'] = False
            result['errors'].append(f"Text too long (max: {max_length} characters)")
        
        # Check for script injection attempts
        script_patterns = [
            r'<script[^>]*>.*?</script>',
            r'javascript:',
            r'vbscript:',
            r'onload\s*=',
            r'onerror\s*=',
            r'onclick\s*=',
        ]
        
        for pattern in script_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                result['warnings'].append("Text contains potential script injection")
                break
        
        if result['is_valid']:
            # Basic sanitization
            sanitized = re.sub(r'[<>"\']', '', text)
            result['sanitized_data'] = sanitized.strip()
        
        return result
    
    def _validate_file_content(self, file_content: bytes, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate file content for malicious content"""
        if not isinstance(file_content, bytes):
            result['is_valid'] = False
            result['errors'].append("File content must be bytes")
            return result
        
        # Check file size
        if len(file_content) > 100 * 1024 * 1024:  # 100MB
            result['is_valid'] = False
            result['errors'].append("File too large (max: 100MB)")
            return result
        
        # Check for empty file
        if len(file_content) == 0:
            result['is_valid'] = False
            result['errors'].append("File is empty")
            return result
        
        # Detect file type using magic numbers
        try:
            # Note: This would require python-magic to be installed
            # For now, we'll skip this check if magic is not available
            result['detected_mime_type'] = 'unknown'
            
            # Check for suspicious file types
            suspicious_types = [
                'application/x-executable',
                'application/x-msdownload',
                'application/x-msdos-program',
                'application/x-sh',
                'text/x-php',
                'application/x-php',
            ]
            
            if mime_type in suspicious_types:
                result['warnings'].append(f"Suspicious file type detected: {mime_type}")
        except Exception as e:
            result['warnings'].append(f"Could not detect file type: {str(e)}")
        
        # Check for embedded scripts in file content
        content_str = file_content[:1000].decode('utf-8', errors='ignore').lower()
        script_indicators = ['<script', 'javascript:', 'vbscript:', 'eval(', 'exec(']
        
        for indicator in script_indicators:
            if indicator in content_str:
                result['warnings'].append("File content contains potential script indicators")
                break
        
        return result
    
    def setup_2fa(self, user_id: str) -> Dict[str, Any]:
        """Setup 2FA for a user"""
        try:
            if not PYOTP_AVAILABLE:
                return {
                    'success': False,
                    'error': '2FA not available - pyotp not installed'
                }
            
            # Generate secret key
            secret = pyotp.random_base32()
            
            # Create TOTP object
            totp = pyotp.TOTP(secret)
            
            # Generate provisioning URI
            provisioning_uri = totp.provisioning_uri(
                name=user_id,
                issuer_name="Financial Document Analyzer"
            )
            
            # Generate QR code
            qr_code_data = None
            if QRCODE_AVAILABLE:
                qr = qrcode.QRCode(version=1, box_size=10, border=5)
                qr.add_data(provisioning_uri)
                qr.make(fit=True)
                
                img = qr.make_image(fill_color="black", back_color="white")
                buffer = BytesIO()
                img.save(buffer, format='PNG')
                qr_code_data = base64.b64encode(buffer.getvalue()).decode()
            
            # Store secret in database
            self.twofa_secrets_collection.insert_one({
                'user_id': user_id,
                'secret': secret,
                'created_at': datetime.utcnow(),
                'is_active': True
            })
            
            # Log 2FA setup
            self.logging_service.log_activity(
                level=LogLevel.INFO,
                category=LogCategory.AUTHENTICATION,
                action=LogAction.USER_UPDATE,
                message=f"2FA setup initiated for user {user_id}",
                user_id=user_id
            )
            
            return {
                'success': True,
                'secret': secret,
                'provisioning_uri': provisioning_uri,
                'qr_code': qr_code_data
            }
            
        except Exception as e:
            logger.error(f"Error setting up 2FA: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def verify_2fa(self, user_id: str, token: str) -> Dict[str, Any]:
        """Verify 2FA token"""
        try:
            if not PYOTP_AVAILABLE:
                return {
                    'success': False,
                    'error': '2FA not available - pyotp not installed'
                }
            
            # Get user's 2FA secret
            twofa_record = self.twofa_secrets_collection.find_one({
                'user_id': user_id,
                'is_active': True
            })
            
            if not twofa_record:
                return {
                    'success': False,
                    'error': '2FA not set up for this user'
                }
            
            # Verify token
            totp = pyotp.TOTP(twofa_record['secret'])
            is_valid = totp.verify(token, valid_window=1)  # Allow 1 time step tolerance
            
            if is_valid:
                # Log successful 2FA verification
                self.logging_service.log_activity(
                    level=LogLevel.INFO,
                    category=LogCategory.AUTHENTICATION,
                    action=LogAction.USER_LOGIN,
                    message=f"2FA verification successful for user {user_id}",
                    user_id=user_id
                )
                
                return {
                    'success': True,
                    'message': '2FA verification successful'
                }
            else:
                # Log failed 2FA attempt
                self.logging_service.log_activity(
                    level=LogLevel.WARNING,
                    category=LogCategory.AUTHENTICATION,
                    action=LogAction.USER_LOGIN,
                    message=f"2FA verification failed for user {user_id}",
                    user_id=user_id
                )
                
                return {
                    'success': False,
                    'error': 'Invalid 2FA token'
                }
                
        except Exception as e:
            logger.error(f"Error verifying 2FA: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def disable_2fa(self, user_id: str) -> Dict[str, Any]:
        """Disable 2FA for a user"""
        try:
            # Deactivate 2FA secret
            result = self.twofa_secrets_collection.update_one(
                {'user_id': user_id, 'is_active': True},
                {'$set': {'is_active': False, 'disabled_at': datetime.utcnow()}}
            )
            
            if result.modified_count > 0:
                # Log 2FA disable
                self.logging_service.log_activity(
                    level=LogLevel.INFO,
                    category=LogCategory.AUTHENTICATION,
                    action=LogAction.USER_UPDATE,
                    message=f"2FA disabled for user {user_id}",
                    user_id=user_id
                )
                
                return {
                    'success': True,
                    'message': '2FA disabled successfully'
                }
            else:
                return {
                    'success': False,
                    'error': '2FA not found or already disabled'
                }
                
        except Exception as e:
            logger.error(f"Error disabling 2FA: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def check_login_attempts(self, user_id: str, ip_address: str) -> Dict[str, Any]:
        """Check if user is locked out due to failed login attempts"""
        try:
            # Check recent failed attempts
            recent_attempts = list(self.login_attempts_collection.find({
                'user_id': user_id,
                'timestamp': {'$gte': datetime.utcnow() - timedelta(minutes=15)},
                'success': False
            }))
            
            if len(recent_attempts) >= self.max_login_attempts:
                return {
                    'is_locked': True,
                    'lockout_remaining': self.lockout_duration,
                    'attempts': len(recent_attempts)
                }
            
            return {
                'is_locked': False,
                'attempts': len(recent_attempts),
                'remaining_attempts': self.max_login_attempts - len(recent_attempts)
            }
            
        except Exception as e:
            logger.error(f"Error checking login attempts: {e}")
            return {
                'is_locked': False,
                'error': str(e)
            }
    
    def record_login_attempt(self, user_id: str, ip_address: str, success: bool, user_agent: str = None):
        """Record login attempt"""
        try:
            self.login_attempts_collection.insert_one({
                'user_id': user_id,
                'ip_address': ip_address,
                'success': success,
                'timestamp': datetime.utcnow(),
                'user_agent': user_agent
            })
            
            # Log security event
            event_type = "login_success" if success else "login_failure"
            self.logging_service.log_activity(
                level=LogLevel.INFO if success else LogLevel.WARNING,
                category=LogCategory.AUTHENTICATION,
                action=LogAction.USER_LOGIN,
                message=f"Login attempt: {event_type} for user {user_id} from {ip_address}",
                user_id=user_id,
                details={
                    'ip_address': ip_address,
                    'success': success,
                    'user_agent': user_agent
                }
            )
            
        except Exception as e:
            logger.error(f"Error recording login attempt: {e}")
    
    def detect_suspicious_activity(self, user_id: str, activity_type: str, details: Dict[str, Any]) -> bool:
        """Detect suspicious user activity"""
        try:
            suspicious = False
            risk_score = 0
            
            # Check for rapid successive actions
            recent_activities = list(self.suspicious_activities_collection.find({
                'user_id': user_id,
                'timestamp': {'$gte': datetime.utcnow() - timedelta(minutes=5)}
            }))
            
            if len(recent_activities) > 10:
                suspicious = True
                risk_score += 50
            
            # Check for unusual file uploads
            if activity_type == "file_upload":
                file_size = details.get('file_size', 0)
                if file_size > 50 * 1024 * 1024:  # 50MB
                    risk_score += 20
                
                file_type = details.get('file_type', '')
                if file_type not in ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt']:
                    risk_score += 30
            
            # Check for unusual API usage
            if activity_type == "api_call":
                endpoint = details.get('endpoint', '')
                if 'admin' in endpoint.lower() and user_id != 'admin':
                    risk_score += 40
            
            # Record suspicious activity
            if suspicious or risk_score > 30:
                self.suspicious_activities_collection.insert_one({
                    'user_id': user_id,
                    'activity_type': activity_type,
                    'risk_score': risk_score,
                    'details': details,
                    'timestamp': datetime.utcnow(),
                    'flagged': True
                })
                
                # Log security event
                self.logging_service.log_activity(
                    level=LogLevel.WARNING,
                    category=LogCategory.SYSTEM,
                    action=LogAction.ERROR_OCCURRED,
                    message=f"Suspicious activity detected for user {user_id}: {activity_type}",
                    user_id=user_id,
                    details={
                        'activity_type': activity_type,
                        'risk_score': risk_score,
                        'details': details
                    }
                )
            
            return suspicious or risk_score > 30
            
        except Exception as e:
            logger.error(f"Error detecting suspicious activity: {e}")
            return False
    
    def get_security_summary(self, user_id: str = None, days: int = 7) -> Dict[str, Any]:
        """Get security summary for monitoring"""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            query = {'timestamp': {'$gte': start_date, '$lte': end_date}}
            if user_id:
                query['user_id'] = user_id
            
            # Get security events
            security_events = list(self.security_events_collection.find(query))
            
            # Get login attempts
            login_attempts = list(self.login_attempts_collection.find(query))
            
            # Get suspicious activities
            suspicious_activities = list(self.suspicious_activities_collection.find(query))
            
            # Calculate statistics
            failed_logins = len([a for a in login_attempts if not a['success']])
            successful_logins = len([a for a in login_attempts if a['success']])
            flagged_activities = len([a for a in suspicious_activities if a.get('flagged', False)])
            
            return {
                'period_days': days,
                'total_security_events': len(security_events),
                'login_attempts': {
                    'successful': successful_logins,
                    'failed': failed_logins,
                    'success_rate': (successful_logins / (successful_logins + failed_logins) * 100) if (successful_logins + failed_logins) > 0 else 0
                },
                'suspicious_activities': {
                    'total': len(suspicious_activities),
                    'flagged': flagged_activities,
                    'risk_score_avg': sum(a.get('risk_score', 0) for a in suspicious_activities) / len(suspicious_activities) if suspicious_activities else 0
                },
                'security_recommendations': self._generate_security_recommendations(failed_logins, flagged_activities)
            }
            
        except Exception as e:
            logger.error(f"Error getting security summary: {e}")
            return {'error': str(e)}
    
    def _generate_security_recommendations(self, failed_logins: int, flagged_activities: int) -> List[str]:
        """Generate security recommendations based on activity"""
        recommendations = []
        
        if failed_logins > 10:
            recommendations.append("High number of failed login attempts detected - consider implementing account lockout")
        
        if flagged_activities > 5:
            recommendations.append("Multiple suspicious activities detected - review user access patterns")
        
        if failed_logins > 5:
            recommendations.append("Consider implementing rate limiting for login attempts")
        
        if not recommendations:
            recommendations.append("Security status appears normal")
        
        return recommendations

# Global security service instance
security_service = None

def get_security_service() -> SecurityService:
    """Get or create security service instance"""
    global security_service
    if security_service is None:
        security_service = SecurityService()
    return security_service
