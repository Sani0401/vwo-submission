import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Document, UploadFile, AnalysisResponse } from '../types';
import { documentsAPI, analysesAPI } from '../services/api';

interface DocumentsState {
  documents: Document[];
  uploadQueue: UploadFile[];
  selectedDocuments: string[];
  analysisResults: Record<string, AnalysisResponse>;
  isLoading: boolean;
  error: string | null;
}

interface DocumentsContextType extends DocumentsState {
  fetchDocuments: () => Promise<void>;
  uploadDocument: (file: File, onProgress?: (progress: number) => void) => Promise<Document>;
  analyzeDocument: (file: File, query?: string) => Promise<AnalysisResponse>;
  deleteDocument: (documentId: string) => Promise<void>;
  deleteDocuments: (documentIds: string[]) => Promise<void>;
  toggleDocumentSelection: (documentId: string) => void;
  selectAllDocuments: () => void;
  clearSelection: () => void;
  addToUploadQueue: (files: UploadFile[]) => void;
  updateUploadProgress: (id: string, progress: number, status?: string) => void;
  removeFromUploadQueue: (id: string) => void;
  clearUploadQueue: () => void;
  clearError: () => void;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

export const useDocuments = () => {
  const context = useContext(DocumentsContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentsProvider');
  }
  return context;
};

interface DocumentsProviderProps {
  children: ReactNode;
  token: string | null;
}

export const DocumentsProvider: React.FC<DocumentsProviderProps> = ({ children, token }) => {
  const [state, setState] = useState<DocumentsState>({
    documents: [],
    uploadQueue: [],
    selectedDocuments: [],
    analysisResults: {},
    isLoading: false,
    error: null,
  });

  const fetchDocuments = useCallback(async () => {
    if (!token) {
      setState(prev => ({ ...prev, error: 'No authentication token available' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Get current user ID from auth context or localStorage
      const savedAuth = localStorage.getItem('auth');
      let userId = 'current-user'; // fallback
      
      if (savedAuth) {
        try {
          const parsedAuth = JSON.parse(savedAuth);
          userId = parsedAuth.user?.id || 'current-user';
        } catch (error) {
          console.error('Failed to parse auth data:', error);
        }
      }

      // Call the real API
      const response = await documentsAPI.getUserDocuments(userId, token);
      const apiDocuments = response.data || [];
      
      // Transform API response to match frontend Document interface
      const transformedDocuments: Document[] = apiDocuments.map((doc: any) => ({
        id: doc.id,
        userId: doc.user_id,
        name: doc.file_name,
        type: doc.file_format as 'pdf' | 'csv' | 'xlsx' | 'docx',
        size: doc.file_size_mb ? doc.file_size_mb * 1024 * 1024 : 0, // Convert MB to bytes
        status: doc.status === 'completed' ? 'completed' : 
                doc.status === 'processing' ? 'processing' : 'failed',
        progress: doc.progress || (doc.status === 'completed' ? 100 : 0),
        uploadedAt: doc.created_at,
        analysisId: doc.analysis_id,
      }));
      
      setState(prev => ({
        ...prev,
        documents: transformedDocuments,
        isLoading: false,
      }));
    } catch (error: any) {
      console.error('Failed to fetch documents:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch documents',
      }));
    }
  }, [token]);

  const uploadDocument = useCallback(async (file: File, onProgress?: (progress: number) => void): Promise<Document> => {
    if (!token) {
      throw new Error('No authentication token available');
    }

    try {
      // Simulate upload progress
      if (onProgress) {
        onProgress(0);
        setTimeout(() => onProgress(50), 500);
        setTimeout(() => onProgress(100), 1000);
      }

      // Call the real analysis API which handles file upload
      const response = await analysesAPI.analyzeDocument(file, "Analyze this financial document for investment insights", token);
      const result = response.data;
      
      // Create document from analysis result
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const validTypes = ['pdf', 'csv', 'xlsx', 'docx'];
      const documentType = validTypes.includes(fileExtension || '') ? fileExtension as 'pdf' | 'csv' | 'xlsx' | 'docx' : 'pdf';
      
      const newDocument: Document = {
        id: result.document_id || Date.now().toString(),
        userId: result.user_id || 'current-user',
        name: result.file_processed || file.name,
        type: documentType,
        size: file.size,
        status: 'completed',
        progress: 100,
        uploadedAt: new Date().toISOString(),
        analysisId: result.analysis_id,
      };
      
      setState(prev => ({
        ...prev,
        documents: [newDocument, ...prev.documents],
        analysisResults: {
          ...prev.analysisResults,
          [result.analysis_id]: result.analysis,
        },
      }));
      
      return newDocument;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Upload failed',
      }));
      throw error;
    }
  }, [token]);

  const analyzeDocument = useCallback(async (file: File, query: string = "Analyze this financial document for investment insights"): Promise<AnalysisResponse> => {
    if (!token) {
      throw new Error('No authentication token available');
    }

    try {
      const response = await analysesAPI.analyzeDocument(file, query, token);
      const analysis = response.data;
      
      setState(prev => ({
        ...prev,
        analysisResults: {
          ...prev.analysisResults,
          [analysis.document_id]: analysis,
        },
      }));
      
      return analysis;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Analysis failed',
      }));
      throw error;
    }
  }, [token]);

  const deleteDocument = useCallback(async (documentId: string) => {
    if (!token) {
      throw new Error('No authentication token available');
    }

    try {
      const result = await documentsAPI.deleteDocument(documentId, token);
      
      setState(prev => ({
        ...prev,
        documents: prev.documents.filter(doc => doc.id !== documentId),
        selectedDocuments: prev.selectedDocuments.filter(id => id !== documentId),
        analysisResults: Object.fromEntries(
          Object.entries(prev.analysisResults).filter(([docId]) => docId !== documentId)
        ),
      }));

      console.log(`✅ Successfully deleted document: ${result.data.document_id}`);
      console.log(`📊 Deleted analyses count: ${result.data.deleted_analyses_count}`);
    } catch (error: any) {
      console.error('Failed to delete document:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Delete failed',
      }));
      throw error;
    }
  }, [token]);

  const deleteDocuments = useCallback(async (documentIds: string[]) => {
    if (!token) {
      throw new Error('No authentication token available');
    }

    try {
      const result = await documentsAPI.deleteDocuments(documentIds, token);
      
      // Only remove successfully deleted documents from state
      const successfullyDeletedIds = result.deletedIds || [];
      
      setState(prev => ({
        ...prev,
        documents: prev.documents.filter(doc => !successfullyDeletedIds.includes(doc.id)),
        selectedDocuments: [],
        analysisResults: Object.fromEntries(
          Object.entries(prev.analysisResults).filter(([docId]) => !successfullyDeletedIds.includes(docId))
        ),
      }));

      // Show success message with details
      if (result.totalFailed > 0) {
        console.warn(`⚠️ Some documents failed to delete: ${result.totalFailed} failed, ${result.totalDeleted} successful`);
        setState(prev => ({
          ...prev,
          error: `Some documents failed to delete. ${result.totalDeleted} deleted successfully, ${result.totalFailed} failed.`,
        }));
      } else {
        console.log(`✅ Successfully deleted ${result.totalDeleted} documents`);
      }
    } catch (error: any) {
      console.error('Failed to delete documents:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Delete failed',
      }));
      throw error;
    }
  }, [token]);

  const toggleDocumentSelection = useCallback((documentId: string) => {
    setState(prev => {
      const index = prev.selectedDocuments.indexOf(documentId);
      if (index > -1) {
        return {
          ...prev,
          selectedDocuments: prev.selectedDocuments.filter(id => id !== documentId),
        };
      } else {
        return {
          ...prev,
          selectedDocuments: [...prev.selectedDocuments, documentId],
        };
      }
    });
  }, []);

  const selectAllDocuments = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedDocuments: prev.documents.map(doc => doc.id),
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedDocuments: [],
    }));
  }, []);

  const addToUploadQueue = useCallback((files: UploadFile[]) => {
    setState(prev => ({
      ...prev,
      uploadQueue: [...prev.uploadQueue, ...files],
    }));
  }, []);

  const updateUploadProgress = useCallback((id: string, progress: number, status?: string) => {
    setState(prev => ({
      ...prev,
      uploadQueue: prev.uploadQueue.map(file =>
        file.id === id
          ? { ...file, progress, ...(status && { status: status as any }) }
          : file
      ),
    }));
  }, []);

  const removeFromUploadQueue = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      uploadQueue: prev.uploadQueue.filter(file => file.id !== id),
    }));
  }, []);

  const clearUploadQueue = useCallback(() => {
    setState(prev => ({
      ...prev,
      uploadQueue: [],
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: DocumentsContextType = {
    ...state,
    fetchDocuments,
    uploadDocument,
    analyzeDocument,
    deleteDocument,
    deleteDocuments,
    toggleDocumentSelection,
    selectAllDocuments,
    clearSelection,
    addToUploadQueue,
    updateUploadProgress,
    removeFromUploadQueue,
    clearUploadQueue,
    clearError,
  };

  return (
    <DocumentsContext.Provider value={value}>
      {children}
    </DocumentsContext.Provider>
  );
};
