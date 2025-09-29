export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'viewer';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  // Extended user profile fields to match MongoDB collection
  profile?: {
    first_name: string;
    last_name: string;
    phone?: string;
    location?: string;
    website?: string;
    bio?: string;
  };
  account?: {
    status: 'active' | 'inactive' | 'pending';
    member_since: string;
    last_login?: string;
    login_streak?: number;
    documents_uploaded_count?: number;
    analyses_completed_count?: number;
    storage_used_mb?: number;
  };
  security?: {
    password_last_changed: string;
    two_factor_enabled: boolean;
    login_history: Array<{
      device: string;
      ip: string;
      location: string;
      timestamp: string;
    }>;
  };
}

// Backend API response types
export interface BackendLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    profile: {
      first_name: string;
      last_name: string;
      phone: string;
      location: string;
      website: string;
      bio: string;
    };
    account: {
      status: string;
      member_since: string;
      last_login: string;
      login_streak: number;
      documents_uploaded_count: number;
      analyses_completed_count: number;
      storage_used_mb: number;
    };
    created_at: string;
    updated_at: string;
  };
}

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'csv' | 'xlsx' | 'docx';
  size: number;
  uploadedAt: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  analysisId?: string;
  thumbnail?: string;
  userId: string;
}

export interface Analysis {
  id: string;
  documentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
  entities: Entity[];
  insights: Insight[];
  llmCalls: LLMCall[];
  createdAt: string;
  completedAt?: string;
}

// New analysis types based on the API response
export interface AnalysisResponse {
  status: 'success' | 'error';
  query: string;
  file_processed: string;
  file_path: string;
  document_id: string;
  analysis_id: string;
  processing_time_sec: number;
  user_id: string;
  analysis: AnalysisData;
  legacy_analysis_id?: string;
}

export interface AnalysisData {
  summary: string;
  metrics: FinancialMetrics;
  insights: string[];
  key_findings: string[];
  financial_highlights: string[];
  risks: string[];
  opportunities: string[];
  extraction_quality_score: number;
  confidence_score: number;
  data_quality_score: number;
}

// Analysis list item for the document analyses endpoint
export interface AnalysisListItem {
  id: string;
  document_id: string;
  user_id: string;
  analysis_type: string;
  query: string;
  output: AnalysisData;
  confidence_score: number;
  data_quality_score: number;
  validation_status: string;
  processing_time_sec: number;
  created_at: string;
}

export interface FinancialMetrics {
  revenue: string;
  operating_income: string;
  cash: string;
  revenue_change: string;
  income_change: string;
  growth_rate: string;
}

export interface Entity {
  id: string;
  type: 'amount' | 'date' | 'person' | 'company' | 'account';
  value: string;
  confidence: number;
  position: {
    page: number;
    x: number;
    y: number;
  };
}

export interface Insight {
  id: string;
  type: 'anomaly' | 'pattern' | 'risk' | 'recommendation';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
}

export interface LLMCall {
  id: string;
  prompt: string;
  response: string;
  responseTime: number;
  confidence: number;
  timestamp: string;
}

export interface DashboardStats {
  totalDocuments: number;
  processingQueue: number;
  averageConfidence: number;
  highRiskCount: number;
  trendsData: TrendPoint[];
  riskDistribution: RiskDistributionPoint[];
  topInsights: Insight[];
}

export interface TrendPoint {
  date: string;
  documents: number;
  analyses: number;
}

export interface RiskDistributionPoint {
  risk: string;
  count: number;
  color: string;
}

export interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  lastModified: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ThemeState {
  mode: 'light' | 'dark';
  highContrast: boolean;
}

export interface UIState {
  sidebarCollapsed: boolean;
  theme: ThemeState;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}