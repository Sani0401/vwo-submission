import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { cn } from '../lib/utils';

// Mock analysis data for development
const mockAnalysis = {
  id: 'analysis-1',
  documentId: 'doc-1',
  status: 'completed' as const,
  confidence: 94.2,
  riskLevel: 'medium' as const,
  summary: 'Comprehensive analysis of financial statement reveals strong performance indicators with minor areas for attention. Overall financial health appears stable with growth potential.',
  entities: [
    {
      id: '1',
      type: 'amount' as const,
      value: '$125,847.92',
      confidence: 98.5,
      position: { page: 1, x: 150, y: 200 },
    },
    {
      id: '2',
      type: 'date' as const,
      value: '2023-12-31',
      confidence: 95.2,
      position: { page: 1, x: 300, y: 150 },
    },
    {
      id: '3',
      type: 'company' as const,
      value: 'Acme Corporation',
      confidence: 99.1,
      position: { page: 1, x: 100, y: 50 },
    },
    {
      id: '4',
      type: 'account' as const,
      value: 'ACC-4429-8821',
      confidence: 87.3,
      position: { page: 2, x: 200, y: 100 },
    },
  ],
  insights: [
    {
      id: '1',
      type: 'pattern' as const,
      title: 'Revenue Growth Trend',
      description: 'Consistent quarterly revenue growth of 12-15% over the past year indicates healthy business expansion.',
      severity: 'low' as const,
      confidence: 92.8,
    },
    {
      id: '2',
      type: 'anomaly' as const,
      title: 'Unusual Expense Pattern',
      description: 'Marketing expenses spiked 300% in Q4, which is significantly higher than historical patterns.',
      severity: 'medium' as const,
      confidence: 88.4,
    },
    {
      id: '3',
      type: 'risk' as const,
      title: 'Cash Flow Concern',
      description: 'Current cash flow trends suggest potential liquidity challenges in the next 6 months.',
      severity: 'high' as const,
      confidence: 79.6,
    },
    {
      id: '4',
      type: 'recommendation' as const,
      title: 'Investment Opportunity',
      description: 'Strong balance sheet position suggests good opportunity for strategic investments or expansion.',
      severity: 'low' as const,
      confidence: 85.2,
    },
  ],
  llmCalls: [
    {
      id: '1',
      prompt: 'Analyze the financial statement structure and extract key metrics...',
      response: 'Based on the document structure, I identified revenue figures, expense categories...',
      responseTime: 2850,
      confidence: 94.2,
      timestamp: '2024-01-15T10:31:15Z',
    },
    {
      id: '2',
      prompt: 'Identify potential risks and anomalies in the financial data...',
      response: 'I detected several patterns that warrant attention: unusual expense spikes...',
      responseTime: 3200,
      confidence: 88.7,
      timestamp: '2024-01-15T10:32:08Z',
    },
    {
      id: '3',
      prompt: 'Generate insights and recommendations based on the analysis...',
      response: 'The analysis reveals strong fundamentals with specific areas for improvement...',
      responseTime: 2100,
      confidence: 91.3,
      timestamp: '2024-01-15T10:33:45Z',
    },
  ],
  createdAt: '2024-01-15T10:30:00Z',
  completedAt: '2024-01-15T10:35:00Z',
  documentName: 'Financial Statement Q4 2023.pdf',
};

const getEntityIcon = (type: string) => {
  switch (type) {
    case 'amount':
      return '$';
    case 'date':
      return '📅';
    case 'company':
      return '🏢';
    case 'account':
      return '#';
    case 'person':
      return '👤';
    default:
      return '📄';
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'text-ai-red bg-ai-red/10 border-ai-red/20';
    case 'medium':
      return 'text-ai-amber bg-ai-amber/10 border-ai-amber/20';
    case 'low':
      return 'text-ai-emerald bg-ai-emerald/10 border-ai-emerald/20';
    default:
      return 'text-neutral-text-secondary bg-glass-white/50 border-neutral-border/20';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'anomaly':
      return <AlertTriangle className="w-4 h-4" />;
    case 'risk':
      return <AlertTriangle className="w-4 h-4" />;
    case 'pattern':
      return <TrendingUp className="w-4 h-4" />;
    case 'recommendation':
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

const getRiskBadge = (riskLevel: string) => {
  switch (riskLevel) {
    case 'low':
      return <Badge className="status-badge-ai completed">Low Risk</Badge>;
    case 'medium':
      return <Badge className="status-badge-ai active">Medium Risk</Badge>;
    case 'high':
      return <Badge className="status-badge-ai offline">High Risk</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const EntityCard: React.FC<{ entity: typeof mockAnalysis.entities[0] }> = ({ entity }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="p-4 rounded-xl border border-neutral-border/20 bg-glass-white/30 hover:bg-glass-white/50 transition-colors"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{getEntityIcon(entity.type)}</span>
        <Badge variant="outline" className="text-xs capitalize">
          {entity.type}
        </Badge>
      </div>
      <span className="text-xs text-neutral-text-secondary">{entity.confidence}%</span>
    </div>
    <p className="font-mono text-neutral-text mb-2 break-all">{entity.value}</p>
    <div className="flex items-center justify-between text-xs text-neutral-text-secondary">
      <span>Page {entity.position.page}</span>
      <Button variant="ghost" size="sm" className="h-6 px-2 text-ai-purple hover:text-ai-purple/80">
        <Copy className="w-3 h-3" />
      </Button>
    </div>
  </motion.div>
);

const InsightCard: React.FC<{ insight: typeof mockAnalysis.insights[0] }> = ({ insight }) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    className="p-4 rounded-xl border border-neutral-border/20 bg-glass-white/30 hover:bg-glass-white/50 transition-colors"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        {getTypeIcon(insight.type)}
        <Badge variant="outline" className={cn('text-xs', getSeverityColor(insight.severity))}>
          {insight.severity} {insight.type}
        </Badge>
      </div>
      <span className="text-xs text-neutral-text-secondary">{insight.confidence}%</span>
    </div>
    <h4 className="font-semibold text-neutral-text font-display mb-2">{insight.title}</h4>
    <p className="text-sm text-neutral-text-secondary mb-3 font-body">{insight.description}</p>
    <Progress value={insight.confidence} className="h-1" />
  </motion.div>
);

export const AnalysisDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use mock data for development
  const analysis = currentAnalysis || mockAnalysis;

  useEffect(() => {
    if (id) {
      // Simulate fetching analysis
      setIsLoading(true);
      setTimeout(() => {
        setCurrentAnalysis(mockAnalysis);
        setIsLoading(false);
      }, 1000);
    }
    return () => {
      setCurrentAnalysis(null);
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-ai-purple border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-neutral-text-secondary mx-auto mb-4" />
        <p className="text-neutral-text font-display mb-2">Analysis not found</p>
        <p className="text-neutral-text-secondary mb-4 font-body">The requested analysis could not be found.</p>
        <Button onClick={() => navigate('/history')} className="btn-ai-primary">
          Back to History
        </Button>
      </div>
    );
  }

  const duration = analysis.completedAt 
    ? Math.round((new Date(analysis.completedAt).getTime() - new Date(analysis.createdAt).getTime()) / 60000)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/history')}
            className="text-neutral-text-secondary hover:text-neutral-text"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gradient-ai font-display">Analysis Details</h1>
            <p className="text-neutral-text-secondary mt-1 font-body">
              {mockAnalysis.documentName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="btn-ai-secondary">
            <Eye className="w-4 h-4 mr-2" />
            View Document
          </Button>
          <Button variant="outline" className="btn-ai-secondary">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-ai">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ai-purple/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-ai-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-text font-display">{analysis.confidence}%</p>
                <p className="text-sm text-neutral-text-secondary font-body">Confidence</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-ai">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ai-amber/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-ai-amber" />
              </div>
              <div>
                <div className="mb-1">
                  {getRiskBadge(analysis.riskLevel)}
                </div>
                <p className="text-sm text-neutral-text-secondary font-body">Risk Level</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-ai">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ai-cyan/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-ai-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-text font-display">{duration}m</p>
                <p className="text-sm text-neutral-text-secondary font-body">Duration</p>
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
                <p className="text-2xl font-bold text-neutral-text font-display">{analysis.entities.length}</p>
                <p className="text-sm text-neutral-text-secondary font-body">Entities</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card className="card-ai">
        <CardHeader>
          <CardTitle className="text-neutral-text font-display">Executive Summary</CardTitle>
          <CardDescription className="text-neutral-text-secondary font-body">
            AI-generated analysis summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-text leading-relaxed font-body">{analysis.summary}</p>
          <div className="flex items-center gap-4 mt-4 text-sm text-neutral-text-secondary">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Created: {format(new Date(analysis.createdAt), 'MMM dd, yyyy HH:mm')}
            </div>
            {analysis.completedAt && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Completed: {format(new Date(analysis.completedAt), 'MMM dd, yyyy HH:mm')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Tabs */}
      <Tabs defaultValue="entities" className="space-y-6">
        <TabsList className="bg-glass-white/50 border border-neutral-border/20">
          <TabsTrigger value="entities" className="data-[state=active]:bg-ai-purple data-[state=active]:text-white">
            Entities ({analysis.entities.length})
          </TabsTrigger>
          <TabsTrigger value="insights" className="data-[state=active]:bg-ai-purple data-[state=active]:text-white">
            Insights ({analysis.insights.length})
          </TabsTrigger>
          <TabsTrigger value="llm-calls" className="data-[state=active]:bg-ai-purple data-[state=active]:text-white">
            LLM Calls ({analysis.llmCalls.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="space-y-6">
          <Card className="card-ai">
            <CardHeader>
              <CardTitle className="text-neutral-text font-display">Extracted Entities</CardTitle>
              <CardDescription className="text-neutral-text-secondary font-body">
                Key information extracted from the document
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.entities.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-neutral-text-secondary mx-auto mb-4" />
                  <p className="text-neutral-text font-display mb-2">No entities extracted</p>
                  <p className="text-neutral-text-secondary font-body">No key information was identified in this document.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analysis.entities.map((entity: any) => (
                    <EntityCard key={entity.id} entity={entity} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card className="card-ai">
            <CardHeader>
              <CardTitle className="text-neutral-text font-display">Analysis Insights</CardTitle>
              <CardDescription className="text-neutral-text-secondary font-body">
                Key findings and recommendations from the analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.insights.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-neutral-text-secondary mx-auto mb-4" />
                  <p className="text-neutral-text font-display mb-2">No insights generated</p>
                  <p className="text-neutral-text-secondary font-body">No specific insights were identified for this document.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {analysis.insights.map((insight: any) => (
                    <InsightCard key={insight.id} insight={insight} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="llm-calls" className="space-y-6">
          <Card className="card-ai">
            <CardHeader>
              <CardTitle className="text-neutral-text font-display">LLM Call History</CardTitle>
              <CardDescription className="text-neutral-text-secondary font-body">
                Detailed log of AI model interactions during analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.llmCalls.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-neutral-text-secondary mx-auto mb-4" />
                  <p className="text-neutral-text font-display mb-2">No LLM calls recorded</p>
                  <p className="text-neutral-text-secondary font-body">No AI model interactions were logged for this analysis.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-neutral-border/20">
                        <TableHead className="text-neutral-text font-display">Timestamp</TableHead>
                        <TableHead className="text-neutral-text font-display">Prompt</TableHead>
                        <TableHead className="text-neutral-text font-display">Response Time</TableHead>
                        <TableHead className="text-neutral-text font-display">Confidence</TableHead>
                        <TableHead className="text-neutral-text font-display">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.llmCalls.map((call: any, _index: number) => (
                        <TableRow key={call.id} className="border-neutral-border/20">
                          <TableCell className="text-neutral-text font-body">
                            {format(new Date(call.timestamp), 'HH:mm:ss')}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="text-neutral-text truncate font-body" title={call.prompt}>
                              {call.prompt}
                            </p>
                          </TableCell>
                          <TableCell className="text-neutral-text font-body">
                            {call.responseTime}ms
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={call.confidence} className="w-16 h-2" />
                              <span className="text-sm text-neutral-text font-body">
                                {call.confidence}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-ai-purple hover:text-ai-purple/80"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalysisDetails;