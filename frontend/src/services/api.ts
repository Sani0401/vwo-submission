// Simple API service with clean error handling

import { API_CONFIG } from '../lib/config';

// Simple helper functions
const getAuthHeaders = (token?: string | null) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || `Request failed: ${response.statusText}`);
  }
  return response.json();
};

// Auth API - Real implementation
export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      const result = await handleApiResponse(response);
      
      // Transform the response to match frontend expectations
      const transformedResult = {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.profile?.first_name || result.user.name?.split(' ')[0] || '',
          lastName: result.user.profile?.last_name || result.user.name?.split(' ')[1] || '',
          role: result.user.role.toLowerCase(),
          createdAt: result.user.created_at,
          profile: result.user.profile,
          account: result.user.account,
        },
        token: result.access_token,
        refreshToken: result.access_token,
      };
      
      return {
        data: transformedResult,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  },
  
  register: async (userData: { 
    email: string; 
    password: string; 
    firstName: string; 
    lastName: string;
    role: 'user' | 'admin' | 'viewer';
    phone?: string;
    location?: string;
    website?: string;
    bio?: string;
  }) => {

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          name: `${userData.firstName} ${userData.lastName}`,
          role: userData.role.charAt(0).toUpperCase() + userData.role.slice(1), // Capitalize role
          profile: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone,
            location: userData.location,
            website: userData.website,
            bio: userData.bio,
          }
        }),
      });

      const result = await handleApiResponse(response);
      
      // Transform the response to match frontend expectations
      const transformedResult = {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.profile?.first_name || result.user.name?.split(' ')[0] || '',
          lastName: result.user.profile?.last_name || result.user.name?.split(' ')[1] || '',
          role: result.user.role.toLowerCase(),
          createdAt: result.user.created_at,
          profile: result.user.profile,
          account: result.user.account,
        },
        token: result.access_token,
        refreshToken: result.access_token,
      };
      
      return {
        data: transformedResult,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  },

  // Get current user info
  getCurrentUser: async (token: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/me`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Get current user error:', error);
      throw error;
    }
  },

  logout: async (_token: string) => {
    try {
      // For now, just return success since the backend doesn't have a logout endpoint
      // In a real implementation, you might want to blacklist the token
      return { success: true };
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  },
};

// User Management API
export const usersAPI = {
  // Get all users (Admin only)
  getAllUsers: async (token: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/users`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Get all users error:', error);
      throw error;
    }
  },

  // Get user by ID
  getUserById: async (userId: string, token: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/users/${userId}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Get user by ID error:', error);
      throw error;
    }
  },

  // Update user
  updateUser: async (userId: string, userData: any, token: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify(userData),
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Update user error:', error);
      throw error;
    }
  },

  // Delete user (Admin only)
  deleteUser: async (userId: string, token: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Delete user error:', error);
      throw error;
    }
  },
};

// Document Management API
export const documentsAPI = {
  // Get user documents
  getUserDocuments: async (userId: string, token: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/users/${userId}/documents`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Get user documents error:', error);
      throw error;
    }
  },

  // Delete a single document
  deleteDocument: async (documentId: string, token: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/documents/${documentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Delete document error:', error);
      throw error;
    }
  },

  // Delete multiple documents (bulk delete)
  deleteDocuments: async (documentIds: string[], token: string) => {
    try {
      // Delete documents one by one since the backend doesn't have a bulk delete endpoint
      const deletePromises = documentIds.map(id => documentsAPI.deleteDocument(id, token));
      const results = await Promise.allSettled(deletePromises);
      
      const successful = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value.data.document_id);
      
      const failed = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result, index) => ({ id: documentIds[index], error: result.reason }));
      
      return {
        success: true,
        deletedIds: successful,
        failedDeletions: failed,
        totalRequested: documentIds.length,
        totalDeleted: successful.length,
        totalFailed: failed.length,
      };
    } catch (error) {
      console.error('❌ Delete documents error:', error);
      throw error;
    }
  },
};

// Analysis API
export const analysesAPI = {
  // Analyze financial document (Main API)
  analyzeDocument: async (file: File, query: string = "Analyze this financial document for investment insights", token: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('query', query);

      const response = await fetch(`${API_CONFIG.BASE_URL}/analyses/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Analyze document error:', error);
      throw error;
    }
  },

  // Get user analyses
  getUserAnalyses: async (userId: string, token: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/users/${userId}/analyses`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Get user analyses error:', error);
      throw error;
    }
  },

  // Get structured analysis by ID
  getAnalysisById: async (analysisId: string, token: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/analyses/${analysisId}/structured`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Get analysis by ID error:', error);
      throw error;
    }
  },

  // Get analyses by document ID
  getAnalysesByDocumentId: async (documentId: string, token: string, skip: number = 0, limit: number = 50) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/documents/${documentId}/analyses?skip=${skip}&limit=${limit}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Get analyses by document ID error:', error);
      throw error;
    }
  },

  // Get analysis history (Legacy)
  getAnalysisHistory: async (token: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/analysis/history`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Get analysis history error:', error);
      throw error;
    }
  },
};

// Statistics API
export const statsAPI = {
  // Get user statistics
  getUserStats: async (token: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/stats/users`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Get user stats error:', error);
      throw error;
    }
  },

  // Get document statistics
  getDocumentStats: async (token: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/stats/documents`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Get document stats error:', error);
      throw error;
    }
  },

  // Get analysis statistics
  getAnalysisStats: async (token: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/stats/analyses`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Get analysis stats error:', error);
      throw error;
    }
  },

  // Get user-specific statistics for dashboard
  getUserSpecificStats: async (userId: string, token: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/stats/user/${userId}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Get user specific stats error:', error);
      throw error;
    }
  },
};

// Health & System API
export const systemAPI = {
  // Health check
  healthCheck: async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Health check error:', error);
      throw error;
    }
  },

  // Get API info
  getApiInfo: async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await handleApiResponse(response);
      return {
        data: result,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
    } catch (error) {
      console.error('❌ Get API info error:', error);
      throw error;
    }
  },
};