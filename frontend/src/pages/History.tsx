import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Search,
  Download,
  Eye,
  RefreshCw,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../components/ui/pagination';
import { Progress } from '../components/ui/progress';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { analysesAPI } from '../services/api';

// Analysis interface
interface Analysis {
  id: string;
  documentId: string;
  documentName: string;
  status: 'completed' | 'processing' | 'failed';
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
  entities: any[];
  insights: any[];
  llmCalls: any[];
  createdAt: string;
  completedAt?: string;
  documentType: string;
  analysisType: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-ai-emerald" />;
    case 'processing':
      return <Clock className="w-4 h-4 text-ai-amber" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-ai-red" />;
    case 'pending':
      return <AlertCircle className="w-4 h-4 text-ai-cyan" />;
    default:
      return <FileText className="w-4 h-4 text-neutral-text-secondary" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge className="status-badge-ai completed">Completed</Badge>;
    case 'processing':
      return <Badge className="status-badge-ai idle">Processing</Badge>;
    case 'failed':
      return <Badge className="status-badge-ai maintenance">Failed</Badge>;
    case 'pending':
      return <Badge className="status-badge-ai active">Pending</Badge>;
    default:
      return <Badge className="status-badge-ai offline">Unknown</Badge>;
  }
};

const getRiskBadge = (riskLevel: string) => {
  switch (riskLevel) {
    case 'low':
      return <Badge className="status-badge-ai completed">Low Risk</Badge>;
    case 'medium':
      return <Badge className="status-badge-ai idle">Medium Risk</Badge>;
    case 'high':
      return <Badge className="status-badge-ai maintenance">High Risk</Badge>;
    default:
      return <Badge className="status-badge-ai offline">Unknown</Badge>;
  }
};

export const History: React.FC = () => {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  useEffect(() => {
    const fetchAnalyses = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

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
        const response = await analysesAPI.getUserAnalyses(userId, token);
        const apiAnalyses = response.data || [];
        
        // Transform API response to match frontend Analysis interface
        const transformedAnalyses: Analysis[] = apiAnalyses.map((analysis: any) => ({
          id: analysis.id,
          documentId: analysis.document_id,
          status: analysis.validation_status === 'passed' ? 'completed' : 
                  analysis.validation_status === 'failed' ? 'failed' : 'processing',
          confidence: Math.round((analysis.confidence_score || 0) * 100),
          riskLevel: analysis.data_quality_score > 0.8 ? 'low' : 
                    analysis.data_quality_score > 0.6 ? 'medium' : 'high',
          summary: analysis.output?.summary || 'Analysis completed',
          entities: [],
          insights: analysis.output?.insights || [],
          llmCalls: [],
          createdAt: analysis.created_at,
          completedAt: analysis.created_at,
          documentName: analysis.document_name || analysis.query || 'Document Analysis',
          documentType: analysis.document_name?.split('.').pop() || 'pdf',
          analysisType: analysis.analysis_type || 'Document Analysis',
        }));
        
        setAnalyses(transformedAnalyses);
        setPagination(prev => ({ ...prev, total: transformedAnalyses.length }));
      } catch (error: any) {
        console.error('Failed to fetch analyses:', error);
        setError(error.message || 'Failed to load analysis history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyses();
  }, [token]);


  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    // In a real app, you would fetch data for the new page
  };

  const filteredAnalyses = analyses.filter(analysis => {
    const matchesSearch = analysis.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         analysis.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         analysis.analysisType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || analysis.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || analysis.riskLevel === riskFilter;
    const matchesConfidence = confidenceFilter === 'all' || 
      (confidenceFilter === 'high' && analysis.confidence >= 90) ||
      (confidenceFilter === 'medium' && analysis.confidence >= 70 && analysis.confidence < 90) ||
      (confidenceFilter === 'low' && analysis.confidence < 70);
    
    return matchesSearch && matchesStatus && matchesRisk && matchesConfidence;
  });

  const renderPaginationItems = () => {
    const totalPages = Math.ceil(filteredAnalyses.length / 10); // Mock pagination
    const currentPage = 1; // Mock current page
    const items = [];

    for (let i = 1; i <= Math.min(5, totalPages); i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => handlePageChange(i)}
            isActive={currentPage === i}
            className={cn(
              currentPage === i && "bg-ai-purple text-white"
            )}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ai-purple border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-text-secondary font-body">Loading analysis history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-ai-red mb-4 font-body">Error: {error}</p>
          <Button onClick={() => window.location.reload()} className="btn-ai-primary">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-ai font-display">Analysis History</h1>
          <p className="text-neutral-text-secondary mt-1 font-body">
            View and manage your document analysis history
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="btn-ai-secondary">
            <Download className="w-4 h-4 mr-2" />
            Export History
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-ai">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ai-purple/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-ai-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-text font-display">{analyses.length}</p>
                <p className="text-sm text-neutral-text-secondary font-body">Total Analyses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-ai">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ai-emerald/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-ai-emerald" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-text font-display">
                  {analyses.filter(a => a.status === 'completed').length}
                </p>
                <p className="text-sm text-neutral-text-secondary font-body">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-ai">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ai-amber/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-ai-amber" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-text font-display">
                  {analyses.filter(a => a.status === 'processing').length}
                </p>
                <p className="text-sm text-neutral-text-secondary font-body">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-ai">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ai-red/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-ai-red" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-text font-display">
                  {analyses.filter(a => a.riskLevel === 'high').length}
                </p>
                <p className="text-sm text-neutral-text-secondary font-body">High Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-ai border-2 border-neutral-border/40">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-text-secondary" />
              <Input
                placeholder="Search analyses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-ai pl-10 border-2 border-neutral-border/70 hover:border-ai-purple/50 focus:border-ai-purple placeholder:text-neutral-text placeholder:opacity-80 placeholder:font-semibold"
              />
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                <SelectTrigger className="input-ai w-40 border-2 border-neutral-border/70 focus:border-ai-purple bg-glass-white text-neutral-text">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="glass-card border border-neutral-border/30 bg-glass-white">
                  <SelectItem value="all" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">All Status</SelectItem>
                  <SelectItem value="completed" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">Completed</SelectItem>
                  <SelectItem value="processing" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">Processing</SelectItem>
                  <SelectItem value="failed" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">Failed</SelectItem>
                  <SelectItem value="pending" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={riskFilter} onValueChange={(value) => setRiskFilter(value)}>
                <SelectTrigger className="input-ai w-40 border-2 border-neutral-border/70 focus:border-ai-purple bg-glass-white text-neutral-text">
                  <SelectValue placeholder="All Risk" />
                </SelectTrigger>
                <SelectContent className="glass-card border border-neutral-border/30 bg-glass-white">
                  <SelectItem value="all" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">All Risk</SelectItem>
                  <SelectItem value="low" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">Low Risk</SelectItem>
                  <SelectItem value="medium" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">Medium Risk</SelectItem>
                  <SelectItem value="high" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">High Risk</SelectItem>
                </SelectContent>
              </Select>

              <Select value={confidenceFilter} onValueChange={(value) => setConfidenceFilter(value)}>
                <SelectTrigger className="input-ai w-40 border-2 border-neutral-border/70 focus:border-ai-purple bg-glass-white text-neutral-text">
                  <SelectValue placeholder="All Confidence" />
                </SelectTrigger>
                <SelectContent className="glass-card border border-neutral-border/30 bg-glass-white">
                  <SelectItem value="all" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">All Confidence</SelectItem>
                  <SelectItem value="high" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">High (90%+)</SelectItem>
                  <SelectItem value="medium" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">Medium (70-89%)</SelectItem>
                  <SelectItem value="low" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">Low (&lt;70%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis History Table */}
      <Card className="card-ai">
        <CardHeader>
          <CardTitle className="text-neutral-text font-display">
            Analysis History ({filteredAnalyses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAnalyses.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-neutral-text-secondary mx-auto mb-4" />
              <p className="text-neutral-text font-medium mb-2 font-display">No analyses found</p>
              <p className="text-neutral-text-secondary font-body">Try adjusting your filters or upload some documents</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-border/20">
                    <TableHead className="text-neutral-text font-display">Document</TableHead>
                    <TableHead className="text-neutral-text font-display">Status</TableHead>
                    <TableHead className="text-neutral-text font-display">Risk Level</TableHead>
                    <TableHead className="text-neutral-text font-display">Confidence</TableHead>
                    <TableHead className="text-neutral-text font-display">Created</TableHead>
                    <TableHead className="text-neutral-text font-display">Duration</TableHead>
                    <TableHead className="text-neutral-text font-display">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnalyses.map((analysis) => (
                    <motion.tr
                      key={analysis.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-neutral-border/10 hover:bg-glass-white-30 hover:shadow-glass-card transition-all duration-300"
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(analysis.status)}
                          <div>
                            <p className="font-medium text-neutral-text font-body">
                              {analysis.documentName}
                            </p>
                           
                            {analysis.summary && (
                              <p className="text-sm text-neutral-text-secondary truncate max-w-xs mt-1 font-body">
                                {analysis.summary}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(analysis.status)}
                      </TableCell>
                      <TableCell>
                        {getRiskBadge(analysis.riskLevel)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {analysis.status === 'completed' ? (
                            <>
                              <Progress value={analysis.confidence} className="w-16 h-2" />
                              <span className="text-sm text-neutral-text font-body">
                                {analysis.confidence}%
                              </span>
                            </>
                          ) : analysis.status === 'processing' ? (
                            <span className="text-sm text-neutral-text-secondary font-body">Processing...</span>
                          ) : (
                            <span className="text-sm text-neutral-text-secondary font-body">N/A</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-neutral-text font-body">
                            {format(new Date(analysis.createdAt), 'MMM dd, yyyy')}
                          </p>
                          <p className="text-neutral-text-secondary font-body">
                            {format(new Date(analysis.createdAt), 'HH:mm')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-neutral-text-secondary font-body">
                          {analysis.completedAt
                            ? `${Math.round((new Date(analysis.completedAt).getTime() - new Date(analysis.createdAt).getTime()) / 60000)}m`
                            : analysis.status === 'processing'
                            ? 'In progress'
                            : 'N/A'
                          }
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {analysis.status === 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-ai-purple hover:text-ai-purple/80"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {analysis.status === 'failed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-neutral-text-secondary hover:text-neutral-text"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-neutral-text-secondary hover:text-neutral-text"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {filteredAnalyses.length > 0 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                  className="text-neutral-text hover:text-ai-purple"
                />
              </PaginationItem>
              {renderPaginationItems()}
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="text-neutral-text hover:text-ai-purple"
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default History;