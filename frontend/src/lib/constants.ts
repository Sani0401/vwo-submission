/**
 * Application Constants
 * Centralized constants for better maintainability
 */

// API Configuration
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
  },
  USERS: {
    LIST: '/users',
    GET: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
  },
  DOCUMENTS: {
    USER_DOCUMENTS: (userId: string) => `/users/${userId}/documents`,
    DELETE: (id: string) => `/documents/${id}`,
  },
  ANALYSES: {
    ANALYZE: '/analyses/analyze',
    USER_ANALYSES: (userId: string) => `/users/${userId}/analyses`,
    GET_STRUCTURED: (id: string) => `/analyses/${id}/structured`,
    BY_DOCUMENT: (documentId: string) => `/documents/${documentId}/analyses`,
  },
  STATS: {
    USERS: '/stats/users',
    DOCUMENTS: '/stats/documents',
    ANALYSES: '/stats/analyses',
  },
  SYSTEM: {
    HEALTH: '/health',
    ROOT: '/',
  },
} as const;

// File Upload Configuration
export const FILE_CONFIG = {
  MAX_SIZE_MB: 100,
  ALLOWED_TYPES: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'],
  MAX_FILES: 10,
} as const;

// UI Constants
export const UI_CONFIG = {
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  },
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 5000,
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer',
} as const;

// Document Status
export const DOCUMENT_STATUS = {
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

// Analysis Status
export const ANALYSIS_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'A server error occurred. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  FILE_TOO_LARGE: 'File is too large. Maximum size is 100MB.',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload a supported file format.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Successfully logged in!',
  REGISTER_SUCCESS: 'Account created successfully!',
  DOCUMENT_UPLOADED: 'Document uploaded successfully!',
  DOCUMENT_DELETED: 'Document deleted successfully!',
  ANALYSIS_COMPLETED: 'Analysis completed successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
} as const;
