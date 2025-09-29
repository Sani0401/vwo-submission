import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Eye,
  Download,
  ArrowRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { statsAPI, authAPI, documentsAPI, analysesAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { cn } from '../lib/utils';

// Dashboard data interface
interface DashboardData {
  totalDocuments: number;
  processingQueue: number;
  averageConfidence: number;
  highRiskCount: number;
  userAccount: {
    documents_uploaded_count: number;
    analyses_completed_count: number;
    storage_used_mb: number;
    login_streak: number;
    member_since: string;
    last_login: string;
  };
  trendsData: Array<{ date: string; documents: number; analyses: number }>;
  riskDistribution: Array<{ risk: string; count: number; color: string }>;
  topInsights: Array<{
    id: string;
    type: 'anomaly' | 'risk' | 'recommendation';
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    confidence: number;
  }>;
  recentAnalyses: Array<{
    id: string;
    document_name: string;
    analysis_type: string;
    confidence_score: number;
    created_at: string;
    summary: string;
  }>;
}

const KPICard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  className?: string;
}> = ({ title, value, subtitle, icon, trend, className }) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    className="animate-fade-in-up"
  >
    <Card className={cn('card-ai cursor-pointer hover:shadow-glass-card-hover animate-float', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-neutral-text-secondary text-sm font-medium font-body">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold text-neutral-text font-display">{value}</p>
              {trend && (
                <span className={cn(
                  'text-xs font-medium flex items-center gap-1',
                  trend > 0 ? 'text-ai-emerald' : 'text-ai-red'
                )}>
                  <TrendingUp className={cn(
                    'w-3 h-3',
                    trend < 0 && 'rotate-180'
                  )} />
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-neutral-text-secondary text-xs mt-1 font-body">{subtitle}</p>
            )}
          </div>
          <div className="text-ai-purple opacity-80">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const InsightCard: React.FC<{ insight: any }> = ({ insight }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-ai-red bg-ai-red/5 border-ai-red/30';
      case 'medium': return 'text-ai-amber bg-ai-amber/5 border-ai-amber/30';
      case 'low': return 'text-ai-emerald bg-ai-emerald/5 border-ai-emerald/30';
      default: return 'text-neutral-text-secondary bg-glass-white-50 border-neutral-border/30';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'anomaly': return <AlertTriangle className="w-4 h-4 text-ai-red" />;
      case 'risk': return <AlertTriangle className="w-4 h-4 text-ai-amber" />;
      case 'recommendation': return <TrendingUp className="w-4 h-4 text-ai-emerald" />;
      default: return <FileText className="w-4 h-4 text-ai-cyan" />;
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="p-4 rounded-xl glass-card hover:shadow-glass-card-hover transition-all duration-300 cursor-pointer animate-fade-in-up"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {getTypeIcon(insight.type)}
          <Badge variant="outline" className={cn('text-xs', getSeverityColor(insight.severity))}>
            {insight.severity}
          </Badge>
        </div>
        <span className="text-xs text-neutral-text-secondary font-body">{insight.confidence}%</span>
      </div>
      <h4 className="font-semibold text-neutral-text mb-1 font-display">{insight.title}</h4>
      <p className="text-sm text-neutral-text-secondary mb-3 font-body">{insight.description}</p>
      <div className="flex items-center justify-between">
        <Progress value={insight.confidence} className="flex-1 mr-3" />
        <Button variant="ghost" size="sm" className="text-ai-purple hover:text-ai-purple/80">
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export const Dashboard: React.FC = () => {
  const { token, user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!token || !user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Add cache busting parameter to ensure fresh data
      const cacheBuster = `?t=${Date.now()}`;

      // Fetch all data in parallel
      const [currentUserResponse, , documentStats, analysisStats, userSpecificStats, userDocuments, userAnalyses] = await Promise.all([
        authAPI.getCurrentUser(token),
        statsAPI.getUserStats(token),
        statsAPI.getDocumentStats(token),
        statsAPI.getAnalysisStats(token),
        statsAPI.getUserSpecificStats(user.id, token),
        documentsAPI.getUserDocuments(user.id, token),
        analysesAPI.getUserAnalyses(user.id, token),
      ]);

      const currentUser = currentUserResponse.data;
      
      // Validate that we have real data, not cached/empty responses
      const hasRealData = currentUser && currentUser.id;
      if (!hasRealData) {
        throw new Error('No user data available');
      }

      const userAccount = currentUser.account || {
        documents_uploaded_count: 0,
        analyses_completed_count: 0,
        storage_used_mb: 0,
        login_streak: 0,
        member_since: currentUser.created_at || new Date().toISOString(),
        last_login: new Date().toISOString(),
      };

      // Check if we have any real data
      const hasAnyData = userAccount.documents_uploaded_count > 0 || 
                        userAccount.analyses_completed_count > 0 ||
                        (userDocuments.data && userDocuments.data.length > 0) ||
                        (userAnalyses.data && userAnalyses.data.length > 0);
      
      if (!hasAnyData) {
        // No data available
      } else {
        // Data is available
      }

      // Generate trends data from recent analyses (last 7 days)
      const generateTrendsData = () => {
        const trends = [];
        const now = new Date();
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          // Count documents and analyses for this date
          const dayDocuments = userDocuments.data?.filter((doc: any) => 
            doc.created_at?.startsWith(dateStr)
          ).length || 0;
          
          const dayAnalyses = userAnalyses.data?.filter((analysis: any) => 
            analysis.created_at?.startsWith(dateStr)
          ).length || 0;
          
          trends.push({
            date: dateStr,
            documents: dayDocuments,
            analyses: dayAnalyses,
          });
        }
        
        return trends;
      };

      // Generate insights from recent analyses
      const generateInsights = () => {
        const insights = [];
        const recentAnalyses = userAnalyses.data?.slice(0, 5) || [];
        
        if (recentAnalyses.length > 0) {
          // High confidence insight
          const avgConfidence = recentAnalyses.reduce((sum: number, analysis: any) => 
            sum + (analysis.confidence_score || 0), 0) / recentAnalyses.length;
          
          insights.push({
            id: 'confidence',
            type: 'anomaly' as const,
            title: 'Analysis Confidence',
            description: `${Math.round(avgConfidence * 100)}% average confidence across recent analyses`,
            severity: avgConfidence > 0.8 ? 'low' as const : avgConfidence > 0.6 ? 'medium' as const : 'high' as const,
            confidence: Math.round(avgConfidence * 100),
          });

          // Processing efficiency insight
          const avgProcessingTime = analysisStats.data.average_processing_time_sec || 0;
          insights.push({
            id: 'efficiency',
            type: 'recommendation' as const,
            title: 'Processing Efficiency',
            description: `Average processing time: ${avgProcessingTime}s per analysis`,
            severity: avgProcessingTime < 10 ? 'low' as const : avgProcessingTime < 20 ? 'medium' as const : 'high' as const,
            confidence: 85,
          });

          // Document status insight
          const failedDocs = documentStats.data.documents_by_status?.failed || 0;
          const totalDocs = documentStats.data.total_documents || 0;
          const failureRate = totalDocs > 0 ? (failedDocs / totalDocs) * 100 : 0;
          
          if (failureRate > 10) {
            insights.push({
              id: 'failure-rate',
              type: 'risk' as const,
              title: 'High Failure Rate',
              description: `${failureRate.toFixed(1)}% of documents failed processing`,
              severity: failureRate > 25 ? 'high' as const : 'medium' as const,
              confidence: 90,
            });
          }
        }
        
        return insights;
      };

      // Generate risk distribution from actual analysis data
      const generateRiskDistribution = () => {
        const analyses = userAnalyses.data || [];
        const riskCounts = { low: 0, medium: 0, high: 0 };
        
        analyses.forEach((analysis: any, index: number) => {
          const confidence = analysis.confidence_score || 0;
          const dataQuality = analysis.data_quality_score || 0;
          
          // Determine risk level based on confidence and data quality scores
          if (confidence >= 0.8 && dataQuality >= 0.8) {
            riskCounts.low++;
          } else if (confidence >= 0.6 && dataQuality >= 0.6) {
            riskCounts.medium++;
          } else {
            riskCounts.high++;
          }
        });
        
        const distribution = [
          { risk: 'Low', count: riskCounts.low, color: '#0EC7D9' },
          { risk: 'Medium', count: riskCounts.medium, color: '#6F4BFF' },
          { risk: 'High', count: riskCounts.high, color: '#EF4444' },
        ];
        
        return distribution;
      };

      // Transform API data to dashboard format using user-specific stats
      const transformedData: DashboardData = {
        totalDocuments: userSpecificStats.data?.total_documents || userAccount.documents_uploaded_count || 0,
        processingQueue: userSpecificStats.data?.processing_analyses || documentStats.data.documents_by_status?.processing || 0,
        averageConfidence: analysisStats.data.average_confidence_score || 0,
        highRiskCount: userSpecificStats.data?.high_risk_analyses || 0,
        userAccount: userAccount,
        trendsData: generateTrendsData(),
        riskDistribution: generateRiskDistribution(),
        topInsights: generateInsights(),
        recentAnalyses: (userAnalyses.data || []).slice(0, 5).map((analysis: any) => ({
          id: analysis.id,
          document_name: analysis.document_name || analysis.document_id || 'Unknown Document',
          analysis_type: analysis.analysis_type || 'Financial Document Analysis',
          confidence_score: analysis.confidence_score || 0,
          created_at: analysis.created_at,
          summary: analysis.output?.summary || 'No summary available',
        })) || [],
      };

      setDashboardData(transformedData);
    } catch (error: any) {
      setError(error.message || 'Failed to load dashboard data');
      setDashboardData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const forceRefresh = async () => {
    // Clear any cached data and force a fresh fetch
    setIsLoading(true);
    setError(null);
    
    // Clear localStorage cache if any
    localStorage.removeItem('dashboard-cache');
    
    // Re-fetch dashboard data without page reload
    if (token && user) {
      try {
        await fetchDashboardData();
      } catch (error) {
        setError('Failed to refresh dashboard data');
      }
    }
  };

  // Auto-refresh mechanism
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => {
      // Auto-refresh every 30 seconds if user is active
      const now = Date.now();
      if (now - lastRefreshTime > 30000) { // 30 seconds
        forceRefresh();
        setLastRefreshTime(now);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [lastRefreshTime, token, user]);

  // Listen for analysis completion events
  useEffect(() => {
    const handleAnalysisComplete = (event: CustomEvent) => {
      // Refresh dashboard when analysis is completed
      setTimeout(() => {
        forceRefresh();
      }, 2000); // Wait 2 seconds for backend to update
    };

    // Listen for custom events from analysis completion
    window.addEventListener('analysisCompleted', handleAnalysisComplete as EventListener);
    
    return () => {
      window.removeEventListener('analysisCompleted', handleAnalysisComplete as EventListener);
    };
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token || !user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Add cache busting parameter to ensure fresh data
        const cacheBuster = `?t=${Date.now()}`;

        // Fetch all data in parallel
        const [currentUserResponse, , documentStats, analysisStats, userSpecificStats, userDocuments, userAnalyses] = await Promise.all([
          authAPI.getCurrentUser(token),
          statsAPI.getUserStats(token),
          statsAPI.getDocumentStats(token),
          statsAPI.getAnalysisStats(token),
          statsAPI.getUserSpecificStats(user.id, token),
          documentsAPI.getUserDocuments(user.id, token),
          analysesAPI.getUserAnalyses(user.id, token),
        ]);


        const currentUser = currentUserResponse.data;
        
        // Validate that we have real data, not cached/empty responses
        const hasRealData = currentUser && currentUser.id;
        if (!hasRealData) {
          throw new Error('No user data available');
        }

        const userAccount = currentUser.account || {
          documents_uploaded_count: 0,
          analyses_completed_count: 0,
          storage_used_mb: 0,
          login_streak: 0,
          member_since: currentUser.created_at || new Date().toISOString(),
          last_login: new Date().toISOString(),
        };


        // Check if we have any real data or if everything is empty
        const hasAnyData = userAccount.documents_uploaded_count > 0 || 
                          userAccount.analyses_completed_count > 0 ||
                          (userDocuments.data && userDocuments.data.length > 0) ||
                          (userAnalyses.data && userAnalyses.data.length > 0);
        
        if (!hasAnyData) {
          // No data available
        } else {
          // Data is available
        }

        // Generate trends data from recent analyses (last 7 days)
        const generateTrendsData = () => {
          const trends = [];
          const now = new Date();
          
          for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Count documents and analyses for this date
            const dayDocuments = userDocuments.data?.filter((doc: any) => 
              doc.created_at?.startsWith(dateStr)
            ).length || 0;
            
            const dayAnalyses = userAnalyses.data?.filter((analysis: any) => 
              analysis.created_at?.startsWith(dateStr)
            ).length || 0;
            
            trends.push({
              date: dateStr,
              documents: dayDocuments,
              analyses: dayAnalyses,
            });
          }
          
          return trends;
        };

        // Generate insights from recent analyses
        const generateInsights = () => {
          const insights = [];
          const recentAnalyses = userAnalyses.data?.slice(0, 5) || [];
          
          if (recentAnalyses.length > 0) {
            // High confidence insight
            const avgConfidence = recentAnalyses.reduce((sum: number, analysis: any) => 
              sum + (analysis.confidence_score || 0), 0) / recentAnalyses.length;
            
            insights.push({
              id: 'confidence',
              type: 'anomaly' as const,
              title: 'Analysis Confidence',
              description: `${Math.round(avgConfidence * 100)}% average confidence across recent analyses`,
              severity: avgConfidence > 0.8 ? 'low' as const : avgConfidence > 0.6 ? 'medium' as const : 'high' as const,
              confidence: Math.round(avgConfidence * 100),
            });

            // Processing efficiency insight
            const avgProcessingTime = analysisStats.data.average_processing_time_sec || 0;
            insights.push({
              id: 'efficiency',
              type: 'recommendation' as const,
              title: 'Processing Efficiency',
              description: `Average processing time: ${avgProcessingTime}s per analysis`,
              severity: avgProcessingTime < 10 ? 'low' as const : avgProcessingTime < 20 ? 'medium' as const : 'high' as const,
              confidence: 85,
            });

            // Document status insight
            const failedDocs = documentStats.data.documents_by_status?.failed || 0;
            const totalDocs = documentStats.data.total_documents || 0;
            const failureRate = totalDocs > 0 ? (failedDocs / totalDocs) * 100 : 0;
            
            insights.push({
              id: 'status',
              type: 'risk' as const,
              title: 'Document Processing',
              description: `${failedDocs} documents failed processing (${Math.round(failureRate)}% failure rate)`,
              severity: failureRate < 5 ? 'low' as const : failureRate < 15 ? 'medium' as const : 'high' as const,
              confidence: 90,
            });
          }
          
          return insights;
        };

        // Generate risk distribution from actual analysis data
        const generateRiskDistribution = () => {
          const analyses = userAnalyses.data || [];
          const riskCounts = { low: 0, medium: 0, high: 0 };
          
          analyses.forEach((analysis: any, index: number) => {
            const confidence = analysis.confidence_score || 0;
            const dataQuality = analysis.data_quality_score || 0;
            
            // Determine risk level based on confidence and data quality scores
            if (confidence >= 0.8 && dataQuality >= 0.8) {
              riskCounts.low++;
            } else if (confidence >= 0.6 && dataQuality >= 0.6) {
              riskCounts.medium++;
            } else {
              riskCounts.high++;
            }
          });
          
          const distribution = [
            { risk: 'Low', count: riskCounts.low, color: '#0EC7D9' },
            { risk: 'Medium', count: riskCounts.medium, color: '#6F4BFF' },
            { risk: 'High', count: riskCounts.high, color: '#EF4444' },
          ];
          
          return distribution;
        };

        // Transform API data to dashboard format using user-specific stats
        const transformedData: DashboardData = {
          totalDocuments: userSpecificStats.data?.total_documents || userAccount.documents_uploaded_count || 0,
          processingQueue: userSpecificStats.data?.processing_analyses || documentStats.data.documents_by_status?.processing || 0,
          averageConfidence: userSpecificStats.data?.average_confidence_score ? 
            Math.round(userSpecificStats.data.average_confidence_score * 100) : 
            (analysisStats.data.average_confidence_score ? Math.round(analysisStats.data.average_confidence_score * 100) : 0),
          highRiskCount: userSpecificStats.data?.failed_analyses || 0,
          userAccount: {
            ...userAccount,
            documents_uploaded_count: userSpecificStats.data?.total_documents || userAccount.documents_uploaded_count || 0,
            analyses_completed_count: userSpecificStats.data?.completed_analyses || userAccount.analyses_completed_count || 0,
            storage_used_mb: userSpecificStats.data?.total_storage_mb || userAccount.storage_used_mb || 0,
          },
          trendsData: generateTrendsData(),
          riskDistribution: generateRiskDistribution(),
          topInsights: generateInsights(),
          recentAnalyses: userAnalyses.data?.slice(0, 5).map((analysis: any) => ({
            id: analysis.id,
            document_name: analysis.document_name || analysis.document_id || 'Unknown Document',
            analysis_type: analysis.analysis_type || 'Financial Document Analysis',
            confidence_score: analysis.confidence_score || 0,
            created_at: analysis.created_at,
            summary: analysis.output?.summary || 'No summary available',
          })) || [],
        };

        setDashboardData(transformedData);
      } catch (error: any) {
        setError(error.message || 'Failed to load dashboard data');
        setDashboardData(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [token, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ai-purple border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-text-secondary font-body">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-text mb-2 font-display">Unable to Load Dashboard</h2>
            <p className="text-ai-red mb-4 font-body">Error: {error}</p>
            <p className="text-neutral-text-secondary text-sm font-body">
              Please check your connection and try again
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()} className="btn-ai-primary">Retry</Button>
            <Button variant="outline" onClick={forceRefresh} className="btn-ai-secondary">Force Refresh</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-text mb-2 font-display">No Data Available</h2>
          <p className="text-neutral-text-secondary mb-4 font-body">
            No dashboard data could be loaded. This could mean:
          </p>
          <ul className="text-neutral-text-secondary text-sm text-left max-w-md mx-auto mb-6 font-body">
            <li>• You haven't uploaded any documents yet</li>
            <li>• No analyses have been completed</li>
            <li>• The database is empty</li>
            <li>• API connection issues</li>
          </ul>
          <Button onClick={() => window.location.reload()} className="btn-ai-primary">Refresh</Button>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-ai font-display">Fin Doc Scanner Dashboard</h1>
          <p className="text-neutral-text-secondary mt-1 font-body">
            Intelligent insights from your financial document analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="btn-ai-secondary"
            onClick={forceRefresh}
          >
            <Clock className="w-4 h-4 mr-2" />
            Force Refresh
          </Button>
          <Button variant="outline" className="btn-ai-secondary">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>


      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Documents Processed"
          value={dashboardData.userAccount.documents_uploaded_count.toLocaleString()}
          subtitle="Total uploaded"
          icon={<FileText className="w-6 h-6" />}
          trend={12}
        />
        <KPICard
          title="Analyses Completed"
          value={dashboardData.userAccount.analyses_completed_count.toLocaleString()}
          subtitle="Successful analyses"
          icon={<TrendingUp className="w-6 h-6" />}
          trend={8}
        />
        <KPICard
          title="Storage Used"
          value={`${dashboardData.userAccount.storage_used_mb.toFixed(1)} MB`}
          subtitle="Document data stored"
          icon={<Download className="w-6 h-6" />}
          className="border-ai-purple/20"
        />
       
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends Chart */}
        <Card className="card-ai">
          <CardHeader>
            <CardTitle className="text-neutral-text font-display">Document Analysis Trends</CardTitle>
            <CardDescription className="text-neutral-text-secondary font-body">
              Daily document uploads and analysis completions over the last week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardData.trendsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.2} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#475569"
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#475569" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      color: '#0F172A',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.1)'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="documents" 
                    stroke="#06b6d4" 
                    strokeWidth={3}
                    dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
                    name="Drone Missions"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="analyses" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    name="Completed Flights"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution Chart */}
        <Card className="card-ai">
          <CardHeader>
            <CardTitle className="text-neutral-text font-display">Analysis Status Distribution</CardTitle>
            <CardDescription className="text-neutral-text-secondary font-body">
              Drones categorized by operational status and health
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.riskDistribution.some(item => item.count > 0) ? (
              <>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.riskDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="count"
                      >
                        {dashboardData.riskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          color: '#0F172A',
                          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  {dashboardData.riskDistribution.map((item) => (
                    <div key={item.risk} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-neutral-text-secondary font-body">
                        {item.risk}: {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-glass-white-50 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-neutral-text-secondary" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-text mb-2 font-display">No Analysis Data</h3>
                  <p className="text-neutral-text-secondary text-sm max-w-xs font-body">
                    Upload documents and run analyses to see status insights
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Insights */}
      <Card className="card-ai">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-neutral-text font-display">Document Intelligence</CardTitle>
              <CardDescription className="text-neutral-text-secondary font-body">
                Key insights from your financial document analysis and performance
              </CardDescription>
            </div>
            
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData.topInsights?.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            )) || []}
          </div>
        </CardContent>
      </Card>

      {/* Recent Analyses */}
      {dashboardData.recentAnalyses.length > 0 && (
        <Card className="card-ai">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-neutral-text font-display">Recent Missions</CardTitle>
                <CardDescription className="text-neutral-text-secondary font-body">
                  Your latest drone flight missions and data collection
                </CardDescription>
              </div>
             
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentAnalyses.map((analysis) => (
                <motion.div
                  key={analysis.id}
                  whileHover={{ scale: 1.01, y: -2 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="p-4 rounded-xl glass-card hover:shadow-glass-card-hover transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-ai-cyan" />
                      <Badge variant="outline" className="text-xs">
                        {analysis.analysis_type}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-neutral-text-secondary font-body">
                        {new Date(analysis.created_at).toLocaleDateString()}
                      </span>
                      <div className="text-xs text-ai-cyan font-medium font-body">
                        {Math.round(analysis.confidence_score * 100)}% success rate
                      </div>
                    </div>
                  </div>
                  <h4 className="font-semibold text-neutral-text mb-2 font-display">{analysis.document_name}</h4>
                  <p className="text-sm text-neutral-text-secondary line-clamp-2 font-body">
                    {analysis.summary}
                  </p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;