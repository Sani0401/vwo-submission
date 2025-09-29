/**
 * API Service Layer
 * Centralized service for all API operations with proper error handling and type safety
 */

import { apiClient, ApiResponse, ApiError } from '../lib/api-client';
import { User, Document, AnalysisResponse, AnalysisListItem } from '../types';

// Auth API Service
export class AuthApiService {
  async login(credentials: { email: string; password: string }): Promise<ApiResponse<{
    user: User;
    token: string;
    refreshToken: string;
  }>> {
    const response = await apiClient.post('/auth/login', credentials);
    
    // Transform the response to match frontend expectations
    const transformedResult = {
      user: {
        id: response.data.user.id,
        email: response.data.user.email,
        firstName: response.data.user.profile?.first_name || response.data.user.name?.split(' ')[0] || '',
        lastName: response.data.user.profile?.last_name || response.data.user.name?.split(' ')[1] || '',
        role: response.data.user.role.toLowerCase() as 'admin' | 'user' | 'viewer',
        createdAt: response.data.user.created_at,
        profile: response.data.user.profile,
        account: response.data.user.account,
      },
      token: response.data.access_token,
      refreshToken: response.data.access_token,
    };
    
    return {
      ...response,
      data: transformedResult,
    };
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'user' | 'admin' | 'viewer';
    phone?: string;
    location?: string;
    website?: string;
    bio?: string;
  }): Promise<ApiResponse<{
    user: User;
    token: string;
    refreshToken: string;
  }>> {
    const response = await apiClient.post('/auth/register', {
      email: userData.email,
      password: userData.password,
      name: `${userData.firstName} ${userData.lastName}`,
      role: userData.role.charAt(0).toUpperCase() + userData.role.slice(1),
      profile: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone,
        location: userData.location,
        website: userData.website,
        bio: userData.bio,
      }
    });

    // Transform the response to match frontend expectations
    const transformedResult = {
      user: {
        id: response.data.user.id,
        email: response.data.user.email,
        firstName: response.data.user.profile?.first_name || response.data.user.name?.split(' ')[0] || '',
        lastName: response.data.user.profile?.last_name || response.data.user.name?.split(' ')[1] || '',
        role: response.data.user.role.toLowerCase() as 'admin' | 'user' | 'viewer',
        createdAt: response.data.user.created_at,
        profile: response.data.user.profile,
        account: response.data.user.account,
      },
      token: response.data.access_token,
      refreshToken: response.data.access_token,
    };
    
    return {
      ...response,
      data: transformedResult,
    };
  }

  async getCurrentUser(token: string): Promise<ApiResponse<User>> {
    apiClient.setAuthToken(token);
    return apiClient.get('/auth/me');
  }

  async logout(token: string): Promise<{ success: boolean }> {
    // For now, just return success since the backend doesn't have a logout endpoint
    return { success: true };
  }
}

// Users API Service
export class UsersApiService {
  async getAllUsers(token: string): Promise<ApiResponse<User[]>> {
    apiClient.setAuthToken(token);
    return apiClient.get('/users');
  }

  async getUserById(userId: string, token: string): Promise<ApiResponse<User>> {
    apiClient.setAuthToken(token);
    return apiClient.get(`/users/${userId}`);
  }

  async updateUser(userId: string, userData: any, token: string): Promise<ApiResponse<User>> {
    apiClient.setAuthToken(token);
    return apiClient.put(`/users/${userId}`, userData);
  }

  async deleteUser(userId: string, token: string): Promise<ApiResponse<{ status: string; message: string }>> {
    apiClient.setAuthToken(token);
    return apiClient.delete(`/users/${userId}`);
  }
}

// Documents API Service
export class DocumentsApiService {
  async getUserDocuments(userId: string, token: string): Promise<ApiResponse<Document[]>> {
    apiClient.setAuthToken(token);
    return apiClient.get(`/users/${userId}/documents`);
  }

  async deleteDocument(documentId: string, token: string): Promise<ApiResponse<{
    status: string;
    message: string;
    document_id: string;
  }>> {
    apiClient.setAuthToken(token);
    return apiClient.delete(`/documents/${documentId}`);
  }

  async deleteDocuments(documentIds: string[], token: string): Promise<{
    success: boolean;
    deletedIds: string[];
    failedDeletions: Array<{ id: string; error: any }>;
    totalRequested: number;
    totalDeleted: number;
    totalFailed: number;
  }> {
    // Delete documents one by one since the backend doesn't have a bulk delete endpoint
    const deletePromises = documentIds.map(id => this.deleteDocument(id, token));
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
  }
}

// Analyses API Service
export class AnalysesApiService {
  async analyzeDocument(
    file: File,
    query: string = "Analyze this financial document for investment insights",
    token: string
  ): Promise<ApiResponse<AnalysisResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('query', query);

    apiClient.setAuthToken(token);
    return apiClient.upload('/analyses/analyze', formData);
  }

  async getUserAnalyses(userId: string, token: string): Promise<ApiResponse<AnalysisListItem[]>> {
    apiClient.setAuthToken(token);
    return apiClient.get(`/users/${userId}/analyses`);
  }

  async getAnalysisById(analysisId: string, token: string): Promise<ApiResponse<any>> {
    apiClient.setAuthToken(token);
    return apiClient.get(`/analyses/${analysisId}/structured`);
  }

  async getAnalysesByDocumentId(
    documentId: string,
    token: string,
    skip: number = 0,
    limit: number = 50
  ): Promise<ApiResponse<AnalysisListItem[]>> {
    apiClient.setAuthToken(token);
    return apiClient.get(`/documents/${documentId}/analyses?skip=${skip}&limit=${limit}`);
  }
}

// Statistics API Service
export class StatsApiService {
  async getUserStats(token: string): Promise<ApiResponse<any>> {
    apiClient.setAuthToken(token);
    return apiClient.get('/stats/users');
  }

  async getDocumentStats(token: string): Promise<ApiResponse<any>> {
    apiClient.setAuthToken(token);
    return apiClient.get('/stats/documents');
  }

  async getAnalysisStats(token: string): Promise<ApiResponse<any>> {
    apiClient.setAuthToken(token);
    return apiClient.get('/stats/analyses');
  }

  async getUserSpecificStats(userId: string, token: string): Promise<ApiResponse<any>> {
    apiClient.setAuthToken(token);
    return apiClient.get(`/stats/user/${userId}`);
  }
}

// System API Service
export class SystemApiService {
  async healthCheck(): Promise<ApiResponse<{
    status: string;
    database: string;
    database_stats?: any;
    error?: string;
  }>> {
    return apiClient.get('/health');
  }

  async getApiInfo(): Promise<ApiResponse<{ message: string }>> {
    return apiClient.get('/');
  }
}

// Export service instances
export const authApi = new AuthApiService();
export const usersApi = new UsersApiService();
export const documentsApi = new DocumentsApiService();
export const analysesApi = new AnalysesApiService();
export const statsApi = new StatsApiService();
export const systemApi = new SystemApiService();

// Export all services as a single object for convenience
export const apiServices = {
  auth: authApi,
  users: usersApi,
  documents: documentsApi,
  analyses: analysesApi,
  stats: statsApi,
  system: systemApi,
};
