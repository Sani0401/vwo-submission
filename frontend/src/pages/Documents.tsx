import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  File,
  FileText,
  Trash2,
  Download,
  Eye,
  Filter,
  Search,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useDocuments } from '../contexts/DocumentsContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { cn } from '../lib/utils';


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
      return <FileText className="w-6 h-6 text-ai-red" />;
    case 'xlsx':
    case 'xls':
      return <File className="w-6 h-6 text-ai-emerald" />;
    case 'csv':
      return <File className="w-6 h-6 text-ai-cyan" />;
    case 'docx':
    case 'doc':
      return <File className="w-6 h-6 text-ai-purple" />;
    default:
      return <File className="w-6 h-6 text-neutral-text-secondary" />;
  }
};

const getStatusBadge = (status: string, progress?: number) => {
  switch (status) {
    case 'completed':
      return <Badge className="status-badge-ai completed">Completed</Badge>;
    case 'processing':
      return <Badge className="status-badge-ai idle">Processing</Badge>;
    case 'uploading':
      return <Badge className="status-badge-ai active">Uploading</Badge>;
    case 'failed':
      return <Badge className="status-badge-ai maintenance">Failed</Badge>;
    default:
      return <Badge className="status-badge-ai offline">Unknown</Badge>;
  }
};

const UploadZone: React.FC<{ onFilesSelected: (files: File[]) => void }> = ({ onFilesSelected }) => {
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: true,
    onDrop: onFilesSelected,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer',
        isDragActive && !isDragReject && 'border-ai-purple bg-gradient-ai-subtle shadow-ai-purple-glow',
        isDragReject && 'border-ai-red bg-ai-red/5',
        !isDragActive && 'border-neutral-border/30 hover:border-ai-purple/40 hover:bg-glass-white-30 hover:shadow-glass-card'
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300',
          isDragActive ? 'bg-gradient-ai text-white shadow-ai-purple-glow' : 'bg-gradient-ai-subtle text-ai-purple shadow-glass-card'
        )}>
          <Upload className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-text mb-2 font-display">
            {isDragActive ? 'Drop files here' : 'Upload Documents'}
          </h3>
          <p className="text-neutral-text-secondary font-body">
            Drag and drop files here, or click to select files
          </p>
          <p className="text-sm text-neutral-text-secondary mt-1 font-body">
            Supports PDF, Excel, CSV, Word (max 100MB each)
          </p>
        </div>
      </div>
    </div>
  );
};

const UploadProgress: React.FC = () => {
  const { uploadQueue, removeFromUploadQueue, clearUploadQueue } = useDocuments();

  if (uploadQueue.length === 0) return null;

  const totalProgress = uploadQueue.reduce((sum: number, item: any) => sum + item.progress, 0) / uploadQueue.length;

  return (
    <Card className="card-ai">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-neutral-text font-display">Upload Progress</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearUploadQueue()}
            className="text-neutral-text-secondary hover:text-ai-red"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-text font-body">Overall Progress</span>
            <span className="text-neutral-text-secondary font-body">{Math.round(totalProgress)}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </div>

        <div className="space-y-3">
          {uploadQueue.map((upload: any) => (
            <motion.div
              key={upload.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-3 rounded-xl glass-card"
            >
              {getFileIcon(upload.name.split('.').pop() || '')}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-text truncate font-body">
                  {upload.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={upload.progress} className="flex-1 h-1" />
                  <span className="text-xs text-neutral-text-secondary font-body">
                    {upload.progress}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {upload.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-ai-red" />
                )}
                {upload.status === 'success' && (
                  <CheckCircle className="w-4 h-4 text-ai-emerald" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFromUploadQueue(upload.id)}
                  className="text-neutral-text-secondary hover:text-ai-red"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const Documents: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(searchParams.get('upload') === 'true');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { token, user, isAuthenticated } = useAuth();
  const { 
    documents, 
    selectedDocuments, 
    uploadQueue, 
    analysisResults,
    fetchDocuments,
    uploadDocument,
    analyzeDocument,
    deleteDocuments,
    toggleDocumentSelection,
    selectAllDocuments,
    clearSelection,
    addToUploadQueue,
    updateUploadProgress,
    removeFromUploadQueue,
    clearUploadQueue,
    clearError
  } = useDocuments();


  // Use real documents from context
  const documentList = documents || [];

  useEffect(() => {
    if (token) {
      fetchDocuments();
    }
  }, [token, fetchDocuments]);

  useEffect(() => {
    if (searchParams.get('upload') === 'true') {
      setShowUpload(true);
      // Clear the URL parameter
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('upload');
      setSearchParams(newSearchParams);
    }
  }, [searchParams, setSearchParams]);

  const handleFilesSelected = async (files: File[]) => {

    const uploadFiles = files.map(file => ({
      id: Date.now().toString() + Math.random().toString(36),
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      progress: 0,
      status: 'pending' as const,
    }));

    addToUploadQueue(uploadFiles);

    // Process each file
    for (let i = 0; i < uploadFiles.length; i++) {
      const uploadFile = uploadFiles[i];
      const originalFile = files[i]; // Get the original File object
      
      try {
        // Update progress to uploading
        updateUploadProgress(uploadFile.id, 10, 'uploading');

        // Upload document first
        const document = await uploadDocument(originalFile, (progress) => {
          updateUploadProgress(uploadFile.id, 10 + (progress * 0.3), 'uploading');
        });
        
        // Update progress to analyzing
        updateUploadProgress(uploadFile.id, 50, 'uploading');

        // Analyze document if token is available
        if (token) {
          try {
            const analysis = await analyzeDocument(originalFile, "Analyze this financial document for investment insights");
            updateUploadProgress(uploadFile.id, 100, 'success');
          } catch (analysisError) {
            // Still mark as success since upload worked
            updateUploadProgress(uploadFile.id, 100, 'success');
          }
        } else {
          // No token, just mark as success
          updateUploadProgress(uploadFile.id, 100, 'success');
        }
      } catch (error) {
        updateUploadProgress(uploadFile.id, 0, 'error');
      }
    }

    setShowUpload(false);
  };

  const handleSelectAll = () => {
    if (selectedDocuments.length === documentList.length) {
      clearSelection();
    } else {
      selectAllDocuments();
    }
  };

  const handleDeleteSelected = () => {
    if (selectedDocuments.length > 0) {
      deleteDocuments(selectedDocuments);
      setShowDeleteDialog(false);
    }
  };

  const handleViewDocument = (documentId: string) => {
    navigate(`/documents/${documentId}`);
  };

  const filteredDocuments = documentList.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-ai font-display">Documents</h1>
          <p className="text-neutral-text-secondary mt-1 font-body">
            Manage and analyze your financial documents
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedDocuments.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="btn-ai-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedDocuments.length})
            </Button>
          )}
         
        </div>
      </div>

      {/* Upload Progress */}
      <AnimatePresence>
        {uploadQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <UploadProgress />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <Card className="card-ai border-2 border-neutral-border/40">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-text-secondary" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-ai pl-10 border-2 border-neutral-border/70 hover:border-ai-purple/50 focus:border-ai-purple placeholder:text-neutral-text placeholder:opacity-80 placeholder:font-semibold"
              />
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="input-ai w-40 border-2 border-neutral-border/70 focus:border-ai-purple bg-glass-white text-neutral-text">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="glass-card border border-neutral-border/30 bg-glass-white">
                  <SelectItem value="all" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">All Status</SelectItem>
                  <SelectItem value="completed" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">Completed</SelectItem>
                  <SelectItem value="processing" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">Processing</SelectItem>
                  <SelectItem value="failed" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="input-ai w-32 border-2 border-neutral-border/70 focus:border-ai-purple bg-glass-white text-neutral-text">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="glass-card border border-neutral-border/30 bg-glass-white">
                  <SelectItem value="all" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">All Types</SelectItem>
                  <SelectItem value="pdf" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">PDF</SelectItem>
                  <SelectItem value="xlsx" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">Excel</SelectItem>
                  <SelectItem value="csv" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">CSV</SelectItem>
                  <SelectItem value="docx" className="text-neutral-text hover:bg-glass-white-50 focus:bg-ai-purple/10 focus:text-neutral-text">Word</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card className="card-ai">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedDocuments.length === filteredDocuments.length && filteredDocuments.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <CardTitle className="text-neutral-text font-display">
                Documents ({filteredDocuments.length})
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-neutral-text-secondary mx-auto mb-4" />
              <p className="text-neutral-text font-medium mb-2 font-display">No documents found</p>
              <p className="text-neutral-text-secondary font-body">Upload some documents to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 rounded-xl glass-card hover:shadow-glass-card-hover transition-all duration-300 group"
                >
                  <Checkbox
                    checked={selectedDocuments.includes(doc.id)}
                    onCheckedChange={() => toggleDocumentSelection(doc.id)}
                  />

                  {getFileIcon(doc.type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="font-medium text-neutral-text truncate font-body">
                        {doc.name}
                      </div>
                      {getStatusBadge(doc.status, doc.progress)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-neutral-text-secondary font-body">
                      <span>{formatFileSize(doc.size)}</span>
                      <span>•</span>
                      <span>{format(new Date(doc.uploadedAt), 'MMM dd, yyyy')}</span>
                      {doc.status === 'processing' && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-2">
                            <Progress value={doc.progress} className="w-20 h-1" />
                            <span>{doc.progress}%</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {doc.status === 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDocument(doc.id)}
                        className="text-ai-purple hover:text-ai-purple/80"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {analysisResults[doc.id] && (
                      <Badge className="status-badge-ai completed text-xs">
                        Analyzed
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-neutral-text-secondary hover:text-neutral-text"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-2xl glass-card border border-neutral-border/20">
          <DialogHeader>
            <DialogTitle className="text-neutral-text font-display">Upload Documents</DialogTitle>
            <DialogDescription className="text-neutral-text-secondary font-body">
              Select financial documents to analyze. Supported formats: PDF, Excel, CSV, Word.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <UploadZone onFilesSelected={handleFilesSelected} />
            
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass-card border border-neutral-border/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neutral-text font-display">Delete Documents</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-text-secondary font-body">
              Are you sure you want to delete {selectedDocuments.length} document(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="btn-ai-secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSelected}
              className="btn-ai-destructive"
            >
              Delete Documents
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Documents;