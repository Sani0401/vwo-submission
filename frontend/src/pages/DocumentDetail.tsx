import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, Eye, FileText, Calendar, Clock, CheckCircle, AlertCircle, XCircle, Loader2, Trash2, BarChart3, TrendingUp, DollarSign, Target, Zap, Shield, Lightbulb, AlertTriangle, Award, Star, ChevronDown, ChevronUp, Filter, Search, Grid3x3 as Grid3X3, List, BookOpen, PieChart, Activity, Sparkles, Brain } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useDocuments } from '../contexts/DocumentsContext';
import { analysesAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { cn } from '../lib/utils';
import { AnalysisListItem } from '../types';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf':
      return <FileText className="w-8 h-8 text-ai-red" />;
    case 'xlsx':
    case 'xls':
      return <FileText className="w-8 h-8 text-ai-emerald" />;
    case 'csv':
      return <FileText className="w-8 h-8 text-ai-cyan" />;
    case 'docx':
    case 'doc':
      return <FileText className="w-8 h-8 text-ai-purple" />;
    default:
      return <FileText className="w-8 h-8 text-neutral-text-secondary" />;
  }
};

const getStatusBadge = (status: string) => {
  const statusConfig = {
    completed: { className: "status-badge-ai completed", label: "Completed", icon: CheckCircle },
    processing: { className: "status-badge-ai active", label: "Processing", icon: Loader2 },
    uploading: { className: "status-badge-ai active", label: "Uploading", icon: Loader2 },
    failed: { className: "status-badge-ai offline", label: "Failed", icon: XCircle },
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || { className: "status-badge-ai idle", label: "Unknown", icon: AlertCircle };
  const Icon = config.icon;
  
  return (
    <Badge className={`${config.className} px-3 py-1 font-medium border flex items-center gap-1.5`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </Badge>
  );
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-ai-emerald" />;
    case 'processing':
      return <Loader2 className="w-5 h-5 text-ai-amber animate-spin" />;
    case 'failed':
      return <XCircle className="w-5 h-5 text-ai-red" />;
    default:
      return <AlertCircle className="w-5 h-5 text-neutral-text-secondary" />;
  }
};


export const DocumentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { documents, isLoading: documentsLoading, deleteDocuments, analyzeDocument } = useDocuments();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isRerunningAnalysis, setIsRerunningAnalysis] = useState(false);
  const [allAnalyses, setAllAnalyses] = useState<AnalysisListItem[]>([]);
  const [analysesLoading, setAnalysesLoading] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisListItem | null>(null);
  const [expandedAnalyses, setExpandedAnalyses] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'confidence' | 'quality'>('date');
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analyses' | 'metrics' | 'insights'>('overview');

  // Find the document by ID
  const document = documents.find(doc => doc.id === id);


  useEffect(() => {
    if (id && token) {
      const fetchAllAnalyses = async () => {
        setAnalysesLoading(true);
        try {
          const response = await analysesAPI.getAnalysesByDocumentId(id, token, 0, 100);
          setAllAnalyses(response.data);
        } catch (error) {
          console.error('Failed to fetch all analyses:', error);
        } finally {
          setAnalysesLoading(false);
        }
      };
      fetchAllAnalyses();
    }
  }, [id, token]);

  const handleDelete = async () => {
    if (document) {
      try {
        await deleteDocuments([document.id]);
        navigate('/documents');
      } catch (error) {
        console.error('Failed to delete document:', error);
      }
    }
  };

  const handleRerunAnalysis = async () => {
    if (document) {
      setIsRerunningAnalysis(true);
      try {
        await analyzeDocument(document.id as any);
        // Refresh the analyses list
        const response = await analysesAPI.getAnalysesByDocumentId(id!, token!, 0, 100);
        setAllAnalyses(response.data);
      } catch (error) {
        console.error('Failed to rerun analysis:', error);
      } finally {
        setIsRerunningAnalysis(false);
      }
    }
  };

  const handleDownload = () => {
  };

  const handleAnalysisSelect = (analysis: AnalysisListItem) => {
    setSelectedAnalysis(analysis);
  };

  const toggleAnalysisExpansion = (analysisId: string) => {
    setExpandedAnalyses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(analysisId)) {
        newSet.delete(analysisId);
      } else {
        newSet.add(analysisId);
      }
      return newSet;
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-ai-emerald bg-ai-emerald/10 border-ai-emerald/20';
    if (score >= 0.6) return 'text-ai-amber bg-ai-amber/10 border-ai-amber/20';
    return 'text-ai-red bg-ai-red/10 border-ai-red/20';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 0.8) return <Award className="w-4 h-4" />;
    if (score >= 0.6) return <Target className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const filteredAndSortedAnalyses = allAnalyses
    .filter(analysis => {
      const matchesSearch = analysis.analysis_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           analysis.query.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || analysis.validation_status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidence_score - a.confidence_score;
        case 'quality':
          return b.data_quality_score - a.data_quality_score;
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const aggregatedMetrics = {
    totalAnalyses: allAnalyses.length,
    averageConfidence: allAnalyses.reduce((sum, a) => sum + a.confidence_score, 0) / allAnalyses.length || 0,
    averageQuality: allAnalyses.reduce((sum, a) => sum + a.data_quality_score, 0) / allAnalyses.length || 0,
    averageProcessingTime: allAnalyses.reduce((sum, a) => sum + a.processing_time_sec, 0) / allAnalyses.length || 0,
    passedCount: allAnalyses.filter(a => a.validation_status === 'passed').length,
    failedCount: allAnalyses.filter(a => a.validation_status === 'failed').length,
    pendingCount: allAnalyses.filter(a => a.validation_status === 'pending').length,
  };

  const allInsights = allAnalyses.flatMap(a => a.output.insights || []);
  const allFindings = allAnalyses.flatMap(a => a.output.key_findings || []);
  const allRisks = allAnalyses.flatMap(a => a.output.risks || []);
  const allOpportunities = allAnalyses.flatMap(a => a.output.opportunities || []);
  const allHighlights = allAnalyses.flatMap(a => a.output.financial_highlights || []);

  if (documentsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-background via-neutral-background-2 to-neutral-background-3 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-ai-purple/20 border-t-ai-purple rounded-full animate-spin mx-auto"></div>
            <Sparkles className="w-8 h-8 text-ai-purple absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-neutral-text-secondary mt-4 font-body">Loading document details...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-background via-neutral-background-2 to-neutral-background-3 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="w-24 h-24 bg-gradient-to-br from-ai-red/10 to-ai-red/5 rounded-3xl flex items-center justify-center mb-6 mx-auto">
            <FileText className="w-12 h-12 text-ai-red" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-text font-display mb-3">Document Not Found</h2>
          <p className="text-neutral-text-secondary mb-8 leading-relaxed font-body">
            The document you're looking for doesn't exist or may have been removed.
          </p>
          <Button 
            onClick={() => navigate('/documents')} 
            className="btn-ai-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Documents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-background via-neutral-background-2 to-neutral-background-3">
      {/* Ultra-Modern Header */}
      <div className="sticky top-0 z-50">
        <div className="absolute inset-0 bg-glass-white/90 backdrop-blur-xl border-b border-neutral-border/20"></div>
        <div className="relative max-w-8xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Button
                variant="ghost"
                onClick={() => navigate('/documents')}
                className="text-neutral-text-secondary hover:text-neutral-text hover:bg-glass-white/60 px-4 py-2 rounded-xl transition-all duration-300 group"
              >
                <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
                Back to Documents
              </Button>
              
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-ai-purple/20 to-ai-purple/10 rounded-2xl blur-xl"></div>
                  <div className="relative p-4 rounded-2xl bg-gradient-to-br from-ai-purple/10 to-ai-purple/5 border border-neutral-border/20">
                    {getFileIcon(document.type)}
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-neutral-text font-display mb-2">{document.name}</h1>
                  <div className="flex items-center gap-6 text-neutral-text-secondary">
                    <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-glass-white/40">
                      <FileText className="w-4 h-4" />
                      {formatFileSize(document.size)}
                    </span>
                    <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-glass-white/40">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(document.uploadedAt), 'MMM dd, yyyy')}
                    </span>
                    <div className="flex items-center gap-3">
                      {getStatusIcon(document.status)}
                      {getStatusBadge(document.status)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleDownload}
                className="btn-ai-secondary"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="btn-ai-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-8xl mx-auto px-8 py-8">
        {/* Sophisticated Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 p-1.5 bg-glass-white/60 backdrop-blur-sm rounded-2xl border border-neutral-border/30 shadow-xl">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3, gradient: 'from-ai-cyan to-ai-cyan/80' },
                { id: 'analyses', label: 'Analyses', icon: BookOpen, gradient: 'from-ai-purple to-ai-purple/80' },
                { id: 'metrics', label: 'Metrics', icon: PieChart, gradient: 'from-ai-emerald to-ai-emerald/80' },
                { id: 'insights', label: 'Insights', icon: Lightbulb, gradient: 'from-ai-amber to-ai-amber/80' },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "relative flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 font-medium overflow-hidden",
                    activeTab === tab.id 
                      ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg hover:shadow-xl transform hover:scale-105` 
                      : "text-neutral-text-secondary hover:text-neutral-text hover:bg-glass-white/50"
                  )}
                >
                  {activeTab === tab.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-glass-white/10 to-transparent" />
                  )}
                  <tab.icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </Button>
              ))}
            </div>

            
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Premium Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    title: 'Total Analyses',
                    value: aggregatedMetrics.totalAnalyses,
                    icon: BarChart3,
                    gradient: 'from-blue-500/10 to-blue-600/5',
                    iconBg: 'bg-blue-500/10',
                    textColor: 'text-blue-600',
                    border: 'border-blue-200/50',
                    shadow: 'shadow-blue-500/10'
                  },
                  {
                    title: 'Avg Confidence',
                    value: `${Math.round(aggregatedMetrics.averageConfidence * 100)}%`,
                    icon: Target,
                    gradient: 'from-emerald-500/10 to-emerald-600/5',
                    iconBg: 'bg-emerald-500/10',
                    textColor: 'text-emerald-600',
                    border: 'border-emerald-200/50',
                    shadow: 'shadow-emerald-500/10'
                  },
                  {
                    title: 'Avg Quality',
                    value: `${Math.round(aggregatedMetrics.averageQuality * 100)}%`,
                    icon: Shield,
                    gradient: 'from-purple-500/10 to-purple-600/5',
                    iconBg: 'bg-purple-500/10',
                    textColor: 'text-purple-600',
                    border: 'border-purple-200/50',
                    shadow: 'shadow-purple-500/10'
                  },
                  {
                    title: 'Avg Processing',
                    value: `${Math.round(aggregatedMetrics.averageProcessingTime)}s`,
                    icon: Zap,
                    gradient: 'from-amber-500/10 to-amber-600/5',
                    iconBg: 'bg-amber-500/10',
                    textColor: 'text-amber-600',
                    border: 'border-amber-200/50',
                    shadow: 'shadow-amber-500/10'
                  }
                ].map((metric, index) => (
                  <motion.div
                    key={metric.title}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.4 }}
                  >
                    <Card className={`group cursor-pointer card-ai border-2 ${metric.border} bg-gradient-to-br ${metric.gradient} backdrop-blur-sm hover:shadow-2xl ${metric.shadow} transition-all duration-500 hover:scale-105 hover:-translate-y-1`}>
                      <CardContent className="p-8">
                        <div className="flex items-center justify-between">
                          <div className="space-y-3">
                            <p className={`${metric.textColor} text-sm font-semibold tracking-wide uppercase font-body`}>
                              {metric.title}
                            </p>
                            <p className={`text-4xl font-bold ${metric.textColor} group-hover:scale-110 transition-transform duration-300`}>
                              {metric.value}
                            </p>
                          </div>
                          <div className={`p-4 rounded-2xl ${metric.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                            <metric.icon className={`w-8 h-8 ${metric.textColor}`} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Enhanced Status & Document Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="card-ai border-2 border-neutral-border/20 bg-glass-white/60 backdrop-blur-sm shadow-2xl hover:shadow-3xl transition-all duration-500">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-neutral-text font-display flex items-center gap-3 text-xl">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-ai-cyan/10 to-ai-cyan/5">
                        <PieChart className="w-6 h-6 text-ai-cyan" />
                      </div>
                      Analysis Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: 'Passed', count: aggregatedMetrics.passedCount, icon: CheckCircle, color: 'emerald', bgClass: 'bg-ai-emerald/10', borderClass: 'border-ai-emerald/20', hoverClass: 'hover:bg-ai-emerald/20', iconBgClass: 'bg-ai-emerald/20', iconColorClass: 'text-ai-emerald', textColorClass: 'text-ai-emerald', countColorClass: 'text-ai-emerald' },
                      { label: 'Failed', count: aggregatedMetrics.failedCount, icon: XCircle, color: 'red', bgClass: 'bg-ai-red/10', borderClass: 'border-ai-red/20', hoverClass: 'hover:bg-ai-red/20', iconBgClass: 'bg-ai-red/20', iconColorClass: 'text-ai-red', textColorClass: 'text-ai-red', countColorClass: 'text-ai-red' },
                      { label: 'Pending', count: aggregatedMetrics.pendingCount, icon: AlertCircle, color: 'amber', bgClass: 'bg-ai-amber/10', borderClass: 'border-ai-amber/20', hoverClass: 'hover:bg-ai-amber/20', iconBgClass: 'bg-ai-amber/20', iconColorClass: 'text-ai-amber', textColorClass: 'text-ai-amber', countColorClass: 'text-ai-amber' }
                    ].map((status, index) => (
                      <motion.div
                        key={status.label}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                        className={`group flex items-center justify-between p-4 rounded-2xl ${status.bgClass} border ${status.borderClass} ${status.hoverClass} transition-all duration-300 hover:scale-105`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl ${status.iconBgClass}`}>
                            <status.icon className={`w-5 h-5 ${status.iconColorClass}`} />
                          </div>
                          <span className={`${status.textColorClass} font-semibold`}>{status.label}</span>
                        </div>
                        <span className={`${status.countColorClass} font-bold text-lg group-hover:scale-110 transition-transform duration-300`}>
                          {status.count}
                        </span>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="card-ai border-2 border-neutral-border/20 bg-glass-white/60 backdrop-blur-sm shadow-2xl hover:shadow-3xl transition-all duration-500">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-neutral-text font-display flex items-center gap-3 text-xl">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-ai-purple/10 to-ai-purple/5">
                        <Activity className="w-6 h-6 text-ai-purple" />
                      </div>
                      Document Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: 'File Type', value: document.type.toUpperCase(), icon: FileText },
                      { label: 'File Size', value: formatFileSize(document.size), icon: FileText },
                      { label: 'Upload Date', value: format(new Date(document.uploadedAt), 'MMM dd, yyyy HH:mm'), icon: Calendar }
                    ].map((info, index) => (
                      <motion.div
                        key={info.label}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                        className="flex items-center justify-between p-4 rounded-2xl bg-glass-white/40 hover:bg-glass-white/60 transition-all duration-300 hover:scale-105"
                      >
                        <div className="flex items-center gap-3">
                          <info.icon className="w-4 h-4 text-neutral-text-secondary" />
                          <span className="text-neutral-text-secondary font-body">{info.label}</span>
                        </div>
                        <span className="text-neutral-text font-display">{info.value}</span>
                      </motion.div>
                    ))}
                    
                    {document.status === 'processing' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 rounded-2xl bg-gradient-to-br from-ai-amber/10 to-ai-amber/20 border border-ai-amber/20"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-ai-amber font-display flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing Progress
                          </span>
                          <span className="text-ai-amber font-display">{document.progress}%</span>
                        </div>
                        <div className="w-full bg-ai-amber/20 rounded-full h-3 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-ai-amber to-ai-amber/80 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${document.progress}%` }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'analyses' && (
            <motion.div
              key="analyses"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Advanced Analysis Controls */}
              <Card className="card-ai border-2 border-neutral-border/20 bg-glass-white/60 backdrop-blur-sm shadow-2xl">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-neutral-text font-display flex items-center gap-3">
                      <Brain className="w-6 h-6 text-ai-purple" />
                      Analysis Results
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Search className="w-5 h-5 text-neutral-text-secondary" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search analyses..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="input-ai pl-12 pr-4 py-3 w-64"
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                          "btn-ai-secondary",
                          showFilters && "bg-ai-purple/10 border-ai-purple/30 text-ai-purple"
                        )}
                      >
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                      </Button>
                      <div className="flex items-center gap-1 p-1 bg-glass-white/40 rounded-xl border border-neutral-border/30">
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                          className={cn(
                            "p-3 rounded-lg transition-all duration-300",
                            viewMode === 'grid' ? "bg-ai-purple text-white shadow-lg" : "hover:bg-glass-white/50"
                          )}
                        >
                          <Grid3X3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className={cn(
                            "p-3 rounded-lg transition-all duration-300",
                            viewMode === 'list' ? "bg-ai-purple text-white shadow-lg" : "hover:bg-glass-white/50"
                          )}
                        >
                          <List className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-6 p-6 bg-gradient-to-r from-glass-white/40 to-glass-white/60 rounded-2xl mb-6 border border-neutral-border/20"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-neutral-text font-body">Sort by:</span>
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="input-ai"
                          >
                            <option value="date">Date</option>
                            <option value="confidence">Confidence</option>
                            <option value="quality">Quality</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-neutral-text font-body">Status:</span>
                          <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="input-ai"
                          >
                            <option value="all">All</option>
                            <option value="passed">Passed</option>
                            <option value="failed">Failed</option>
                            <option value="pending">Pending</option>
                          </select>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>

              {/* Analysis Results Grid/List */}
              {analysesLoading ? (
                <Card className="card-ai border-2 border-neutral-border/20 bg-glass-white/60 backdrop-blur-sm shadow-2xl">
                  <CardContent className="p-16 text-center">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-ai-purple/20 border-t-ai-purple rounded-full animate-spin mx-auto"></div>
                      <Brain className="w-6 h-6 text-ai-purple absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-neutral-text-secondary mt-6 text-lg font-body">Loading analyses...</p>
                  </CardContent>
                </Card>
              ) : filteredAndSortedAnalyses.length > 0 ? (
                <div className={cn(
                  viewMode === 'grid' ? "grid grid-cols-1 xl:grid-cols-2 gap-8" : "space-y-6"
                )}>
                  {filteredAndSortedAnalyses.map((analysis, index) => {
                    const isExpanded = expandedAnalyses.has(analysis.id);
                    const isSelected = selectedAnalysis?.id === analysis.id;
                    
                    return (
                      <motion.div
                        key={analysis.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.4 }}
                      >
                        <Card
                          className={cn(
                            "group border-2 card-ai bg-glass-white/60 backdrop-blur-sm shadow-2xl hover:shadow-3xl transition-all duration-500 cursor-pointer overflow-hidden",
                            isSelected 
                              ? "border-ai-purple/50 bg-gradient-to-br from-ai-purple/5 to-ai-purple/10 shadow-ai-purple/20" 
                              : "border-neutral-border/20 hover:border-ai-purple/30 hover:scale-[1.02] hover:-translate-y-1"
                          )}
                        >
                          <CardContent className="p-0">
                            {/* Analysis Header */}
                            <div className="p-8 pb-6">
                              <div className="flex items-start justify-between mb-6">
                                <div className="flex-1">
                                  <div className="flex items-center gap-4 mb-4">
                                    <div className="relative">
                                      <div className="absolute inset-0 bg-gradient-to-br from-ai-purple/20 to-ai-purple/10 rounded-2xl blur-lg"></div>
                                      <div className="relative p-3 rounded-2xl bg-gradient-to-br from-ai-purple/10 to-ai-purple/5 border border-neutral-border/20">
                                        <BarChart3 className="w-6 h-6 text-ai-purple" />
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="text-xl font-bold text-neutral-text font-display group-hover:text-ai-purple transition-colors duration-300">
                                        {analysis.analysis_type}
                                      </h4>
                                      <div className="flex items-center gap-3 mt-2">
                                        {analysis.validation_status === 'passed' ? (
                                          <CheckCircle className="w-5 h-5 text-ai-emerald" />
                                        ) : analysis.validation_status === 'failed' ? (
                                          <XCircle className="w-5 h-5 text-ai-red" />
                                        ) : (
                                          <AlertCircle className="w-5 h-5 text-ai-amber" />
                                        )}
                                        <Badge className={cn(
                                          "font-semibold px-3 py-1",
                                          analysis.validation_status === 'passed' && "status-badge-ai completed",
                                          analysis.validation_status === 'failed' && "status-badge-ai offline",
                                          analysis.validation_status === 'pending' && "status-badge-ai active"
                                        )}>
                                          {analysis.validation_status}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="bg-gradient-to-r from-glass-white/40 to-glass-white/60 rounded-2xl p-4 mb-6 border border-neutral-border/10">
                                    <p className="text-neutral-text-secondary italic font-body leading-relaxed">
                                      "{analysis.query}"
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Premium Metrics Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                {[
                                  { label: 'Confidence', value: Math.round(analysis.confidence_score * 100), score: analysis.confidence_score, icon: getScoreIcon(analysis.confidence_score) },
                                  { label: 'Quality', value: Math.round(analysis.data_quality_score * 100), score: analysis.data_quality_score, icon: <Shield className="w-4 h-4" /> },
                                  { label: 'Processing', value: `${analysis.processing_time_sec}s`, score: 1, icon: <Zap className="w-4 h-4" />, isTime: true },
                                  { label: 'Extraction', value: Math.round(analysis.output.extraction_quality_score * 100), score: analysis.output.extraction_quality_score, icon: <Target className="w-4 h-4" /> }
                                ].map((metric, idx) => (
                                  <div 
                                    key={idx} 
                                    className={cn(
                                      "group/metric p-4 rounded-2xl border flex items-center gap-3 transition-all duration-300 hover:scale-105",
                                      metric.isTime ? "bg-ai-cyan/10 border-ai-cyan/20 text-ai-cyan" : getScoreColor(metric.score)
                                    )}
                                  >
                                    <div className="p-2 rounded-xl bg-glass-white/60 group-hover/metric:scale-110 transition-transform duration-300">
                                      {metric.icon}
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold opacity-75 uppercase tracking-wide font-body">{metric.label}</div>
                                      <div className="text-sm font-bold">
                                        {metric.isTime ? metric.value : `${metric.value}%`}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Financial Metrics Showcase */}
                              {analysis.output.metrics && (
                                <div className="mb-6">
                                  <h5 className="text-lg font-bold text-neutral-text font-display mb-4 flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-ai-emerald/20">
                                      <DollarSign className="w-5 h-5 text-ai-emerald" />
                                    </div>
                                    Financial Metrics
                                  </h5>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                      { label: 'Revenue', value: analysis.output.metrics.revenue, bgClass: 'bg-ai-emerald/10', borderClass: 'border-ai-emerald/20', hoverClass: 'hover:bg-ai-emerald/20', labelClass: 'text-ai-emerald', valueClass: 'text-ai-emerald' },
                                      { label: 'Operating Income', value: analysis.output.metrics.operating_income, bgClass: 'bg-ai-cyan/10', borderClass: 'border-ai-cyan/20', hoverClass: 'hover:bg-ai-cyan/20', labelClass: 'text-ai-cyan', valueClass: 'text-ai-cyan' },
                                      { label: 'Cash', value: analysis.output.metrics.cash, bgClass: 'bg-ai-purple/10', borderClass: 'border-ai-purple/20', hoverClass: 'hover:bg-ai-purple/20', labelClass: 'text-ai-purple', valueClass: 'text-ai-purple' },
                                      { label: 'Revenue Change', value: analysis.output.metrics.revenue_change, bgClass: 'bg-ai-amber/10', borderClass: 'border-ai-amber/20', hoverClass: 'hover:bg-ai-amber/20', labelClass: 'text-ai-amber', valueClass: 'text-ai-amber' }
                                    ].filter(metric => metric.value).map((metric, idx) => (
                                      <div key={idx} className={`text-center p-6 rounded-2xl ${metric.bgClass} border ${metric.borderClass} ${metric.hoverClass} transition-all duration-300 hover:scale-105 group min-h-[100px] flex flex-col justify-center`}>
                                        <div className={`text-xs ${metric.labelClass} font-bold mb-3 uppercase tracking-wide font-body`}>{metric.label}</div>
                                        <div className={`text-lg font-bold ${metric.valueClass} group-hover:scale-110 transition-transform duration-300 break-words`}>
                                          {metric.value}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Enhanced Summary */}
                              {analysis.output.summary && (
                                <div className="mb-6">
                                  <h5 className="text-lg font-bold text-neutral-text font-display mb-4 flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-ai-cyan/20">
                                      <FileText className="w-5 h-5 text-ai-cyan" />
                                    </div>
                                    Summary
                                  </h5>
                                  <div className="bg-gradient-to-br from-glass-white/40 to-glass-white/60 rounded-2xl p-6 border border-neutral-border/10">
                                    <p className="text-neutral-text leading-relaxed font-body">
                                      {isExpanded ? analysis.output.summary : `${analysis.output.summary.substring(0, 200)}${analysis.output.summary.length > 200 ? '...' : ''}`}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Action Bar */}
                              <div className="flex items-center justify-between pt-6 border-t border-neutral-border/10">
                                <div className="flex items-center gap-4 text-sm text-neutral-text-secondary">
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-glass-white/40">
                                    <Calendar className="w-4 h-4" />
                                    <span className="font-body">{format(new Date(analysis.created_at), 'MMM dd, yyyy')}</span>
                                  </div>
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-glass-white/40">
                                    <Clock className="w-4 h-4" />
                                    <span className="font-body">{format(new Date(analysis.created_at), 'HH:mm')}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleAnalysisExpansion(analysis.id)}
                                    className="text-ai-purple hover:text-ai-purple/80 hover:bg-ai-purple/10 px-4 py-2 rounded-xl font-medium transition-all duration-300"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="w-4 h-4 mr-2" />
                                        Collapse
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-4 h-4 mr-2" />
                                        Expand
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAnalysisSelect(analysis)}
                                    className="bg-ai-purple/10 hover:bg-ai-purple/20 text-ai-purple border-ai-purple/30 px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-105"
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Content */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.4, ease: "easeInOut" }}
                                  className="border-t border-neutral-border/10 bg-gradient-to-br from-glass-white/40 to-glass-white/20"
                                >
                                  <div className="p-8 space-y-8">
                                    {/* Enhanced Insights Grid */}
                                    {analysis.output.insights && analysis.output.insights.length > 0 && (
                                      <div>
                                        <h5 className="text-lg font-bold text-neutral-text font-display mb-6 flex items-center gap-3">
                                          <div className="p-2 rounded-xl bg-ai-amber/20">
                                            <Lightbulb className="w-5 h-5 text-ai-amber" />
                                          </div>
                                          Key Insights ({analysis.output.insights.length})
                                        </h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          {analysis.output.insights.map((insight, idx) => (
                                            <motion.div
                                              key={idx}
                                              initial={{ opacity: 0, scale: 0.95 }}
                                              animate={{ opacity: 1, scale: 1 }}
                                              transition={{ delay: idx * 0.1, duration: 0.3 }}
                                              className="group flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br from-ai-amber/10 to-ai-amber/20 border border-ai-amber/20 hover:shadow-lg hover:scale-105 transition-all duration-300 min-h-[120px]"
                                            >
                                              <div className="w-3 h-3 bg-gradient-to-br from-ai-amber to-ai-amber/80 rounded-full mt-2 flex-shrink-0 group-hover:scale-125 transition-transform duration-300" />
                                              <p className="text-ai-amber font-body leading-relaxed text-sm flex-1">{insight}</p>
                                            </motion.div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Key Findings */}
                                    {analysis.output.key_findings && analysis.output.key_findings.length > 0 && (
                                      <div>
                                        <h5 className="text-lg font-bold text-neutral-text mb-6 flex items-center gap-3">
                                          <div className="p-2 rounded-xl bg-blue-100">
                                            <Star className="w-5 h-5 text-blue-600" />
                                  </div>
                                          Key Findings ({analysis.output.key_findings.length})
                                        </h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          {analysis.output.key_findings.map((finding, idx) => (
                                            <motion.div
                                              key={idx}
                                              initial={{ opacity: 0, scale: 0.95 }}
                                              animate={{ opacity: 1, scale: 1 }}
                                              transition={{ delay: idx * 0.1, duration: 0.3 }}
                                              className="group flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/50 hover:shadow-lg hover:scale-105 transition-all duration-300 min-h-[120px]"
                                            >
                                              <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full mt-2 flex-shrink-0 group-hover:scale-125 transition-transform duration-300" />
                                              <p className="text-blue-800 font-medium leading-relaxed text-sm flex-1">{finding}</p>
                                            </motion.div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Financial Highlights */}
                                    {analysis.output.financial_highlights && analysis.output.financial_highlights.length > 0 && (
                                      <div>
                                        <h5 className="text-lg font-bold text-neutral-text mb-6 flex items-center gap-3">
                                          <div className="p-2 rounded-xl bg-purple-100">
                                            <DollarSign className="w-5 h-5 text-purple-600" />
                                          </div>
                                          Financial Highlights ({analysis.output.financial_highlights.length})
                                        </h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          {analysis.output.financial_highlights.map((highlight, idx) => (
                                            <motion.div
                                              key={idx}
                                              initial={{ opacity: 0, scale: 0.95 }}
                                              animate={{ opacity: 1, scale: 1 }}
                                              transition={{ delay: idx * 0.1, duration: 0.3 }}
                                              className="group flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200/50 hover:shadow-lg hover:scale-105 transition-all duration-300 min-h-[120px]"
                                            >
                                              <div className="w-3 h-3 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full mt-2 flex-shrink-0 group-hover:scale-125 transition-transform duration-300" />
                                              <p className="text-purple-800 font-medium leading-relaxed text-sm flex-1">{highlight}</p>
                                            </motion.div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Risks */}
                                    {analysis.output.risks && analysis.output.risks.length > 0 && (
                                      <div>
                                        <h5 className="text-lg font-bold text-neutral-text mb-6 flex items-center gap-3">
                                          <div className="p-2 rounded-xl bg-red-100">
                                            <AlertTriangle className="w-5 h-5 text-red-600" />
                                          </div>
                                          Risk Factors ({analysis.output.risks.length})
                                        </h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          {analysis.output.risks.map((risk, idx) => (
                                            <motion.div
                                              key={idx}
                                              initial={{ opacity: 0, scale: 0.95 }}
                                              animate={{ opacity: 1, scale: 1 }}
                                              transition={{ delay: idx * 0.1, duration: 0.3 }}
                                              className="group flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200/50 hover:shadow-lg hover:scale-105 transition-all duration-300 min-h-[120px]"
                                            >
                                              <div className="w-3 h-3 bg-gradient-to-br from-red-400 to-red-500 rounded-full mt-2 flex-shrink-0 group-hover:scale-125 transition-transform duration-300" />
                                              <p className="text-red-800 font-medium leading-relaxed text-sm flex-1">{risk}</p>
                                            </motion.div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Opportunities */}
                                    {analysis.output.opportunities && analysis.output.opportunities.length > 0 && (
                                      <div>
                                        <h5 className="text-lg font-bold text-neutral-text mb-6 flex items-center gap-3">
                                          <div className="p-2 rounded-xl bg-emerald-100">
                                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                                          </div>
                                          Growth Opportunities ({analysis.output.opportunities.length})
                                        </h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          {analysis.output.opportunities.map((opportunity, idx) => (
                                            <motion.div
                                              key={idx}
                                              initial={{ opacity: 0, scale: 0.95 }}
                                              animate={{ opacity: 1, scale: 1 }}
                                              transition={{ delay: idx * 0.1, duration: 0.3 }}
                                              className="group flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/50 hover:shadow-lg hover:scale-105 transition-all duration-300 min-h-[120px]"
                                            >
                                              <div className="w-3 h-3 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full mt-2 flex-shrink-0 group-hover:scale-125 transition-transform duration-300" />
                                              <p className="text-emerald-800 font-medium leading-relaxed text-sm flex-1">{opportunity}</p>
                                            </motion.div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <Card className="card-ai border-2 border-neutral-border/20 bg-glass-white/60 backdrop-blur-sm shadow-2xl">
                  <CardContent className="p-16 text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-ai-purple/10 to-ai-purple/5 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                      <FileText className="w-12 h-12 text-ai-purple" />
                    </div>
                    <h3 className="text-xl font-bold text-neutral-text font-display mb-3">No Analyses Found</h3>
                    <p className="text-neutral-text-secondary mb-8 leading-relaxed max-w-md mx-auto font-body">
                      No analysis results match your current filters. Try adjusting your search criteria or run a new analysis.
                    </p>
                    <Button 
                      onClick={handleRerunAnalysis} 
                      className="btn-ai-primary"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      Start Analysis
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* Similar modern updates for metrics and insights tabs... */}
          {activeTab === 'metrics' && (
            <motion.div
              key="metrics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <Card className="card-ai border-2 border-neutral-border/20 bg-glass-white/60 backdrop-blur-sm shadow-2xl">
                <CardHeader className="pb-6">
                  <CardTitle className="text-neutral-text font-display flex items-center gap-3 text-2xl">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-ai-cyan/10 to-ai-cyan/5">
                      <PieChart className="w-6 h-6 text-ai-cyan" />
                    </div>
                    Detailed Metrics Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {allAnalyses.map((analysis, index) => (
                      <motion.div
                        key={analysis.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.4 }}
                      >
                        <Card className="group border-2 card-ai border-ai-purple/20 bg-gradient-to-br from-glass-white/30 to-glass-white/20 hover:shadow-2xl hover:scale-105 transition-all duration-500 cursor-pointer">
                          <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-6">
                              <h4 className="font-bold text-neutral-text font-display text-lg group-hover:text-ai-purple transition-colors duration-300">
                                {analysis.analysis_type}
                              </h4>
                              <Badge className={cn(
                                "font-semibold px-3 py-1",
                                analysis.validation_status === 'passed' && "status-badge-ai completed",
                                analysis.validation_status === 'failed' && "status-badge-ai offline",
                                analysis.validation_status === 'pending' && "status-badge-ai active"
                              )}>
                                {analysis.validation_status}
                              </Badge>
                            </div>
                            
                            <div className="space-y-6">
                              {[
                                { label: 'Confidence', score: analysis.confidence_score },
                                { label: 'Quality', score: analysis.data_quality_score },
                                { label: 'Extraction', score: analysis.output.extraction_quality_score }
                              ].map((metric, idx) => (
                                <div key={idx} className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-neutral-text font-body">{metric.label}</span>
                                    <span className={cn(
                                      "font-bold text-sm px-2 py-1 rounded-lg",
                                      metric.score >= 0.8 ? "text-ai-emerald bg-ai-emerald/10" :
                                      metric.score >= 0.6 ? "text-ai-amber bg-ai-amber/10" : "text-ai-red bg-ai-red/10"
                                    )}>
                                      {Math.round(metric.score * 100)}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-neutral-border/20 rounded-full h-3 overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${metric.score * 100}%` }}
                                      transition={{ delay: (index * 0.1) + (idx * 0.1), duration: 0.8 }}
                                      className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        metric.score >= 0.8 ? "bg-gradient-to-r from-ai-emerald to-ai-emerald/80" :
                                        metric.score >= 0.6 ? "bg-gradient-to-r from-ai-amber to-ai-amber/80" : "bg-gradient-to-r from-ai-red to-ai-red/80"
                                      )}
                                    />
                                  </div>
                                </div>
                              ))}
                              
                              <div className="pt-4 border-t border-neutral-border/10">
                                <div className="flex items-center justify-between">
                                  <span className="text-neutral-text-secondary font-body">Processing Time</span>
                                  <span className="text-neutral-text font-display">{analysis.processing_time_sec}s</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Insights Summary */}
              <Card className="card-ai border-2 border-neutral-border/20 bg-glass-white/60 backdrop-blur-sm shadow-2xl">
                <CardHeader className="pb-6">
                  <CardTitle className="text-neutral-text font-display flex items-center gap-3 text-2xl">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-ai-purple/10 to-ai-purple/5">
                      <Brain className="w-6 h-6 text-ai-purple" />
                    </div>
                    Insights Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { label: 'Total Insights', count: allInsights.length, bgClass: 'bg-ai-amber/10', borderClass: 'border-ai-amber/20', hoverClass: 'hover:bg-ai-amber/20', iconBgClass: 'bg-ai-amber/20', iconColorClass: 'text-ai-amber', countColorClass: 'text-ai-amber', labelColorClass: 'text-ai-amber', icon: Lightbulb },
                      { label: 'Key Findings', count: allFindings.length, bgClass: 'bg-ai-cyan/10', borderClass: 'border-ai-cyan/20', hoverClass: 'hover:bg-ai-cyan/20', iconBgClass: 'bg-ai-cyan/20', iconColorClass: 'text-ai-cyan', countColorClass: 'text-ai-cyan', labelColorClass: 'text-ai-cyan', icon: Star },
                      { label: 'Risk Factors', count: allRisks.length, bgClass: 'bg-ai-red/10', borderClass: 'border-ai-red/20', hoverClass: 'hover:bg-ai-red/20', iconBgClass: 'bg-ai-red/20', iconColorClass: 'text-ai-red', countColorClass: 'text-ai-red', labelColorClass: 'text-ai-red', icon: AlertTriangle },
                      { label: 'Opportunities', count: allOpportunities.length, bgClass: 'bg-ai-emerald/10', borderClass: 'border-ai-emerald/20', hoverClass: 'hover:bg-ai-emerald/20', iconBgClass: 'bg-ai-emerald/20', iconColorClass: 'text-ai-emerald', countColorClass: 'text-ai-emerald', labelColorClass: 'text-ai-emerald', icon: TrendingUp },
                      { label: 'Financial Highlights', count: allHighlights.length, bgClass: 'bg-ai-purple/10', borderClass: 'border-ai-purple/20', hoverClass: 'hover:bg-ai-purple/20', iconBgClass: 'bg-ai-purple/20', iconColorClass: 'text-ai-purple', countColorClass: 'text-ai-purple', labelColorClass: 'text-ai-purple', icon: DollarSign }
                    ].map((item, idx) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1, duration: 0.3 }}
                        className={`text-center p-6 rounded-2xl ${item.bgClass} border ${item.borderClass} ${item.hoverClass} transition-all duration-300 hover:scale-105 group`}
                      >
                        <div className={`w-12 h-12 ${item.iconBgClass} rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300`}>
                          <item.icon className={`w-6 h-6 ${item.iconColorClass}`} />
                        </div>
                        <div className={`text-2xl font-bold ${item.countColorClass} mb-1 group-hover:scale-110 transition-transform duration-300`}>
                          {item.count}
                        </div>
                        <div className={`text-sm font-medium ${item.labelColorClass} font-body`}>
                          {item.label}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Insights Sections */}
              {allInsights.length > 0 && (
                <Card className="card-ai border-2 border-neutral-border/20 bg-glass-white/60 backdrop-blur-sm shadow-2xl">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-neutral-text font-display flex items-center gap-3 text-2xl">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-ai-amber/10 to-ai-amber/5">
                        <Lightbulb className="w-6 h-6 text-ai-amber" />
                      </div>
                      All Insights ({allInsights.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {allInsights.map((insight, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05, duration: 0.3 }}
                          className="group flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br from-ai-amber/10 to-ai-amber/20 border border-ai-amber/20 hover:shadow-xl hover:scale-105 transition-all duration-300 min-h-[120px]"
                        >
                          <div className="w-4 h-4 bg-gradient-to-br from-ai-amber to-ai-amber/80 rounded-full mt-1 flex-shrink-0 group-hover:scale-125 transition-transform duration-300" />
                          <p className="text-ai-amber font-body leading-relaxed text-sm flex-1">{insight}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Similar enhanced styling for other insight sections... */}
              {allFindings.length > 0 && (
                <Card className="border-2 border-white/20 bg-white/60 backdrop-blur-sm shadow-2xl">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-neutral-text flex items-center gap-3 text-2xl">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5">
                        <Star className="w-6 h-6 text-blue-600" />
                      </div>
                      Key Findings ({allFindings.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {allFindings.map((finding, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05, duration: 0.3 }}
                          className="group flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/50 hover:shadow-xl hover:scale-105 transition-all duration-300 min-h-[120px]"
                        >
                          <div className="w-4 h-4 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full mt-1 flex-shrink-0 group-hover:scale-125 transition-transform duration-300" />
                          <p className="text-blue-800 font-medium leading-relaxed text-sm flex-1">{finding}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Risks Section */}
              {allRisks.length > 0 && (
                <Card className="border-2 border-white/20 bg-white/60 backdrop-blur-sm shadow-2xl">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-neutral-text flex items-center gap-3 text-2xl">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500/10 to-red-600/5">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      Risk Factors ({allRisks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {allRisks.map((risk, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05, duration: 0.3 }}
                          className="group flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200/50 hover:shadow-xl hover:scale-105 transition-all duration-300 min-h-[120px]"
                        >
                          <div className="w-4 h-4 bg-gradient-to-br from-red-400 to-red-500 rounded-full mt-1 flex-shrink-0 group-hover:scale-125 transition-transform duration-300" />
                          <p className="text-red-800 font-medium leading-relaxed text-sm flex-1">{risk}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Opportunities Section */}
              {allOpportunities.length > 0 && (
                <Card className="border-2 border-white/20 bg-white/60 backdrop-blur-sm shadow-2xl">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-neutral-text flex items-center gap-3 text-2xl">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5">
                        <TrendingUp className="w-6 h-6 text-emerald-600" />
                      </div>
                      Growth Opportunities ({allOpportunities.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {allOpportunities.map((opportunity, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05, duration: 0.3 }}
                          className="group flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/50 hover:shadow-xl hover:scale-105 transition-all duration-300 min-h-[120px]"
                        >
                          <div className="w-4 h-4 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full mt-1 flex-shrink-0 group-hover:scale-125 transition-transform duration-300" />
                          <p className="text-emerald-800 font-medium leading-relaxed text-sm flex-1">{opportunity}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Financial Highlights Section */}
              {allHighlights.length > 0 && (
                <Card className="border-2 border-white/20 bg-white/60 backdrop-blur-sm shadow-2xl">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-neutral-text flex items-center gap-3 text-2xl">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5">
                        <DollarSign className="w-6 h-6 text-purple-600" />
                      </div>
                      Financial Highlights ({allHighlights.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {allHighlights.map((highlight, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05, duration: 0.3 }}
                          className="group flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200/50 hover:shadow-xl hover:scale-105 transition-all duration-300 min-h-[120px]"
                        >
                          <div className="w-4 h-4 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full mt-1 flex-shrink-0 group-hover:scale-125 transition-transform duration-300" />
                          <p className="text-purple-800 font-medium leading-relaxed text-sm flex-1">{highlight}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Empty State for Insights */}
              {allInsights.length === 0 && allFindings.length === 0 && allRisks.length === 0 && allOpportunities.length === 0 && allHighlights.length === 0 && (
                <Card className="card-ai border-2 border-neutral-border/20 bg-glass-white/60 backdrop-blur-sm shadow-2xl">
                  <CardContent className="p-16 text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-ai-purple/10 to-ai-purple/5 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                      <Lightbulb className="w-12 h-12 text-ai-purple" />
                    </div>
                    <h3 className="text-xl font-bold text-neutral-text font-display mb-3">No Insights Available</h3>
                    <p className="text-neutral-text-secondary mb-8 leading-relaxed max-w-md mx-auto font-body">
                      No insights have been generated for this document yet. Run an analysis to discover key insights, risks, and opportunities.
                    </p>
                    <Button 
                      onClick={handleRerunAnalysis} 
                      className="btn-ai-primary"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      Generate Insights
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Enhanced Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass-card border border-neutral-border/20">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-2xl bg-ai-red/20">
                <AlertTriangle className="w-6 h-6 text-ai-red" />
              </div>
              <AlertDialogTitle className="text-neutral-text text-xl font-display">Delete Document</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-neutral-text-secondary leading-relaxed font-body">
              Are you sure you want to delete <span className="font-semibold text-neutral-text">"{document.name}"</span>? 
              This action cannot be undone and will permanently remove the document and all associated analysis results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 pt-6">
            <AlertDialogCancel className="btn-ai-secondary">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="btn-ai-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentDetail;