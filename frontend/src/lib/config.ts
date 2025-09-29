// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      FORGOT_PASSWORD: '/auth/forgot-password',
      RESET_PASSWORD: '/auth/reset-password',
      VERIFY_EMAIL: '/auth/verify-email',
    },
    DOCUMENTS: {
      UPLOAD: '/upload',
      LIST: '/documents',
      GET: '/documents/:id',
      DELETE: '/documents/:id',
      DOWNLOAD: '/documents/:id/download',
    },
    ANALYSIS: {
      ANALYZE: '/analyses/analyze',
      GET: '/analyses/:id',
      LIST: '/analyses',
      RERUN: '/analyses/:id/rerun',
      EXPORT: '/analyses/:id/export',
    },
    USERS: {
      LIST: '/users',
      GET: '/users/:id',
      UPDATE: '/users/:id',
      DELETE: '/users/:id',
      INVITE: '/users/invite',
      REVOKE_SESSION: '/users/:id/revoke-session',
    },
    DASHBOARD: {
      STATS: '/dashboard/stats',
    },
  },
};

// Development settings
export const DEV_CONFIG = {
  USE_MOCK_DATA: import.meta.env.VITE_DEV_MODE === 'true' && import.meta.env.DEV,
  ENABLE_LOGGING: import.meta.env.DEV,
};
