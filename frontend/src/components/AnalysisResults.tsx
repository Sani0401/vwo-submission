import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Target,
  BarChart3,
  FileText,
} from 'lucide-react';
import { AnalysisResponse } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { cn } from '../lib/utils';

interface AnalysisResultsProps {
  analysis: AnalysisResponse;
  className?: string;
}

const MetricCard: React.FC<{
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}> = ({ title, value, change, trend, icon }) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-neutral-text-secondary';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4" />;
      case 'down': return <TrendingDown className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Card className="card-ai">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 bg-gradient-to-br from-light-accent/20 to-light-accent-2/20 rounded-full flex items-center justify-center">
                {icon}
              </div>
            )}
            <div>
              <p className="text-sm text-neutral-text-secondary">{title}</p>
              <p className="text-xl font-semibold text-neutral-text">{value}</p>
            </div>
          </div>
          {change && (
            <div className={cn("flex items-center gap-1", getTrendColor())}>
              {getTrendIcon()}
              <span className="text-sm font-medium">{change}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const InsightCard: React.FC<{
  title: string;
  items: string[];
  type: 'insights' | 'risks' | 'opportunities' | 'findings';
  icon: React.ReactNode;
}> = ({ title, items, type, icon }) => {
  const getTypeStyles = () => {
    switch (type) {
      case 'risks':
        return {
          cardClass: 'border-red-200 bg-red-50/30',
          iconClass: 'text-red-600',
          badgeClass: 'bg-red-100 text-red-700 border-red-200',
        };
      case 'opportunities':
        return {
          cardClass: 'border-green-200 bg-green-50/30',
          iconClass: 'text-green-600',
          badgeClass: 'bg-green-100 text-green-700 border-green-200',
        };
      case 'findings':
        return {
          cardClass: 'border-blue-200 bg-blue-50/30',
          iconClass: 'text-blue-600',
          badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
        };
      default:
        return {
          cardClass: 'border-neutral-border/20 bg-glass-white/30',
          iconClass: 'text-ai-purple',
          badgeClass: 'bg-ai-purple/10 text-ai-purple border-light-accent/20',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <Card className={cn("card-ai", styles.cardClass)}>
      <CardHeader>
        <CardTitle className="text-neutral-text flex items-center gap-2">
          <div className={cn("w-5 h-5", styles.iconClass)}>
            {icon}
          </div>
          {title}
        </CardTitle>
        <CardDescription className="text-neutral-text-secondary">
          {items.length} {type} identified
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.slice(0, 5).map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3 p-3 rounded-lg bg-white/50 border border-light-text-secondary/10"
            >
              <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", styles.iconClass.replace('text-', 'bg-'))} />
              <p className="text-sm text-neutral-text leading-relaxed">{item}</p>
            </motion.div>
          ))}
          {items.length > 5 && (
            <p className="text-xs text-neutral-text-secondary text-center pt-2">
              +{items.length - 5} more {type}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ analysis, className }) => {
  const { analysis: data } = analysis;

  const formatChange = (change: string) => {
    const num = parseFloat(change.replace('%', ''));
    if (num > 0) return `+${change}`;
    if (num < 0) return change;
    return change;
  };

  const getChangeTrend = (change: string) => {
    const num = parseFloat(change.replace('%', ''));
    if (num > 0) return 'up';
    if (num < 0) return 'down';
    return 'neutral';
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Analysis Overview */}
      <Card className="card-ai">
        <CardHeader>
          <CardTitle className="text-neutral-text flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Analysis Overview
          </CardTitle>
          <CardDescription className="text-neutral-text-secondary">
            Document: {analysis.file_processed} • Processing time: {analysis.processing_time_sec}s
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-neutral-text mb-1">
                {Math.round(data.extraction_quality_score * 100)}%
              </div>
              <div className="text-sm text-neutral-text-secondary">Extraction Quality</div>
              <Progress value={data.extraction_quality_score * 100} className="mt-2 h-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-neutral-text mb-1">
                {Math.round(data.confidence_score * 100)}%
              </div>
              <div className="text-sm text-neutral-text-secondary">Confidence Score</div>
              <Progress value={data.confidence_score * 100} className="mt-2 h-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-neutral-text mb-1">
                {Math.round(data.data_quality_score * 100)}%
              </div>
              <div className="text-sm text-neutral-text-secondary">Data Quality</div>
              <Progress value={data.data_quality_score * 100} className="mt-2 h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Revenue"
          value={data.metrics.revenue}
          change={formatChange(data.metrics.revenue_change)}
          trend={getChangeTrend(data.metrics.revenue_change)}
          icon={<DollarSign className="w-5 h-5 text-ai-purple" />}
        />
        <MetricCard
          title="Operating Income"
          value={data.metrics.operating_income}
          change={formatChange(data.metrics.income_change)}
          trend={getChangeTrend(data.metrics.income_change)}
          icon={<TrendingUp className="w-5 h-5 text-ai-purple" />}
        />
        <MetricCard
          title="Cash Position"
          value={data.metrics.cash}
          icon={<CheckCircle className="w-5 h-5 text-ai-purple" />}
        />
      </div>

      {/* Summary */}
      <Card className="card-ai">
        <CardHeader>
          <CardTitle className="text-neutral-text flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-text leading-relaxed whitespace-pre-line">
            {data.summary}
          </p>
        </CardContent>
      </Card>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InsightCard
          title="Key Insights"
          items={data.insights}
          type="insights"
          icon={<Target className="w-5 h-5" />}
        />
        <InsightCard
          title="Key Findings"
          items={data.key_findings}
          type="findings"
          icon={<CheckCircle className="w-5 h-5" />}
        />
        <InsightCard
          title="Risk Factors"
          items={data.risks}
          type="risks"
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <InsightCard
          title="Growth Opportunities"
          items={data.opportunities}
          type="opportunities"
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      {/* Financial Highlights */}
      {data.financial_highlights.length > 0 && (
        <Card className="card-ai">
          <CardHeader>
            <CardTitle className="text-neutral-text flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Financial Highlights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.financial_highlights.slice(0, 8).map((highlight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-glass-white/50 border border-neutral-border/10"
                >
                  <div className="w-2 h-2 bg-ai-purple rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-neutral-text leading-relaxed">{highlight}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalysisResults;
