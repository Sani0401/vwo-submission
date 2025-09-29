import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Edit,
  Save,
  X,
  Camera,
  Briefcase,
  Activity,
  FileText,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI, authAPI, documentsAPI, analysesAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const UserProfile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user, token } = useAuth();

  // Fetch current user data and recent activity
  useEffect(() => {
    const fetchUserData = async () => {
      if (!token || !user) {
        setIsLoadingData(false);
        return;
      }

      try {
        setIsLoadingData(true);
        setError(null);

        // Fetch current user data and recent activity in parallel
        const [currentUserResponse, userDocuments, userAnalyses] = await Promise.all([
          authAPI.getCurrentUser(token),
          documentsAPI.getUserDocuments(user.id, token),
          analysesAPI.getUserAnalyses(user.id, token),
        ]);

        const userData = currentUserResponse.data;
        setCurrentUserData(userData);


        // Generate recent activity from documents and analyses
        const activities: any[] = [];
        
        // Add recent documents
        if (userDocuments.data && userDocuments.data.length > 0) {
          userDocuments.data.slice(0, 3).forEach((doc: any) => {
            activities.push({
              id: `doc-${doc.id}`,
              title: `Uploaded document: ${doc.file_name}`,
              timestamp: doc.created_at,
              icon: FileText,
              type: 'document'
            });
          });
        }

        // Add recent analyses
        if (userAnalyses.data && userAnalyses.data.length > 0) {
          userAnalyses.data.slice(0, 3).forEach((analysis: any) => {
            activities.push({
              id: `analysis-${analysis.id}`,
              title: `Completed analysis: ${analysis.analysis_type}`,
              timestamp: analysis.created_at,
              icon: TrendingUp,
              type: 'analysis'
            });
          });
        }

        // Sort by timestamp and take the most recent 5
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecentActivity(activities.slice(0, 5));

      } catch (error: any) {
        setError(error.message || 'Failed to load profile data');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchUserData();
  }, [token, user]);

  // Test function for API debugging
  const testAuthMeAPI = async () => {
    try {
      if (!token) {
        alert('No token available');
        return;
      }
      const response = await authAPI.getCurrentUser(token);
      console.log('Auth API Test Response:', response);
      alert('API Test Successful! Check console for details.');
    } catch (error) {
      console.error('Auth API Test Error:', error);
      alert('API Test Failed! Check console for details.');
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      location: '',
      website: '',
      bio: '',
      jobTitle: '',
      department: '',
    },
  });

  // Reset form when currentUserData is loaded
  useEffect(() => {
    if (currentUserData) {
      reset({
        firstName: currentUserData.profile?.first_name || user?.firstName || '',
        lastName: currentUserData.profile?.last_name || user?.lastName || '',
        email: currentUserData.email || user?.email || '',
        phone: currentUserData.profile?.phone || '',
        location: currentUserData.profile?.location || '',
        website: currentUserData.profile?.website || '',
        bio: currentUserData.profile?.bio || '',
        jobTitle: '',
        department: '',
      });
    }
  }, [currentUserData, user, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!token || !user?.id) return;
    
    try {
      await usersAPI.updateUser(user.id, {
        name: `${data.firstName} ${data.lastName}`,
        profile: {
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          location: data.location,
          website: data.website,
          bio: data.bio,
        }
      }, token);
      
      setIsEditing(false);
      
      // Refresh the user data after successful update
      window.location.reload();
    } catch (error: any) {
      // Handle error silently
    }
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };


  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ai-purple border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-text-secondary font-body">Loading profile data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-text mb-2 font-display">Unable to Load Profile</h2>
          <p className="text-ai-red mb-4 font-body">Error: {error}</p>
          <p className="text-neutral-text-secondary text-sm mb-6 font-body">
            Please check your connection and try again
          </p>
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
          <h1 className="text-3xl font-bold text-gradient-ai font-display">My Profile</h1>
          <p className="text-neutral-text-secondary mt-1 font-body">
            View and manage your personal information and account details
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={testAuthMeAPI}
            className="btn-ai-secondary"
          >
            🧪 Test API
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.reload()}
            className="btn-ai-secondary"
          >
            🔄 Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card className="card-ai">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src="" alt={`${user?.firstName} ${user?.lastName}`} />
                    <AvatarFallback className="text-2xl font-semibold bg-gradient-ai text-white shadow-ai-purple-glow">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button
                      size="sm"
                      className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full p-0 btn-ai-primary"
                      onClick={() => {/* Handle photo upload */}}
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-neutral-text font-display">
                    {currentUserData?.profile?.first_name || user?.firstName} {currentUserData?.profile?.last_name || user?.lastName}
                  </h2>
                  <p className="text-neutral-text-secondary font-body">{currentUserData?.email || user?.email}</p>
                  <Badge className="status-badge-ai completed mt-2">
                    {currentUserData?.role || user?.role}
                  </Badge>
                </div>

                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-text-secondary font-body">Member since</span>
                    <span className="text-neutral-text font-body">{currentUserData?.created_at ? formatDate(currentUserData.created_at) : user?.createdAt ? formatDate(user.createdAt) : 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-text-secondary font-body">Last login</span>
                    <span className="text-neutral-text font-body">{currentUserData?.account?.last_login ? formatDateTime(currentUserData.account.last_login) : user?.account?.last_login ? formatDateTime(user.account.last_login) : 'Never'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-text-secondary font-body">Login streak</span>
                    <span className="text-neutral-text font-body">
                      {currentUserData?.account?.login_streak || user?.account?.login_streak || 0} days
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="card-ai mt-6">
            <CardHeader>
              <CardTitle className="text-neutral-text flex items-center gap-2 font-display">
                <Activity className="w-5 h-5 text-ai-cyan" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-neutral-text-secondary font-body">Documents</span>
                <span className="text-neutral-text font-semibold font-body">{currentUserData?.account?.documents_uploaded_count || user?.account?.documents_uploaded_count || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-text-secondary font-body">Analyses</span>
                <span className="text-neutral-text font-semibold font-body">{currentUserData?.account?.analyses_completed_count || user?.account?.analyses_completed_count || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-text-secondary font-body">Storage Used</span>
                <span className="text-neutral-text font-semibold font-body">{currentUserData?.account?.storage_used_mb ? `${currentUserData.account.storage_used_mb.toFixed(2)} MB` : user?.account?.storage_used_mb ? `${user.account.storage_used_mb.toFixed(2)} MB` : '0 MB'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card className="card-ai">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-neutral-text flex items-center gap-2 font-display">
                    <User className="w-5 h-5 text-ai-purple" />
                    Personal Information
                  </CardTitle>
                  <CardDescription className="text-neutral-text-secondary font-body">
                    Your basic profile information
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="btn-ai-secondary"
                >
                  {isEditing ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-neutral-text font-body">
                      First Name
                    </Label>
                    <Input
                      {...register('firstName')}
                      id="firstName"
                      disabled={!isEditing}
                      className="input-ai"
                    />
                    {errors.firstName && (
                      <p className="text-sm text-ai-red font-body">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-neutral-text font-body">
                      Last Name
                    </Label>
                    <Input
                      {...register('lastName')}
                      id="lastName"
                      disabled={!isEditing}
                      className="input-ai"
                    />
                    {errors.lastName && (
                      <p className="text-sm text-ai-red font-body">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-neutral-text font-body">
                    Email Address
                  </Label>
                  <Input
                    {...register('email')}
                    id="email"
                    type="email"
                    disabled={!isEditing}
                    className="input-ai"
                  />
                  {errors.email && (
                    <p className="text-sm text-ai-red font-body">{errors.email.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-neutral-text font-body">
                      Phone Number
                    </Label>
                    <Input
                      {...register('phone')}
                      id="phone"
                      disabled={!isEditing}
                      className="input-ai"
                    />
                    {errors.phone && (
                      <p className="text-sm text-ai-red font-body">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-neutral-text font-body">
                      Location
                    </Label>
                    <Input
                      {...register('location')}
                      id="location"
                      disabled={!isEditing}
                      className="input-ai"
                    />
                    {errors.location && (
                      <p className="text-sm text-ai-red font-body">{errors.location.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-neutral-text font-body">
                    Website
                  </Label>
                  <Input
                    {...register('website')}
                    id="website"
                    disabled={!isEditing}
                    className="input-ai"
                  />
                  {errors.website && (
                    <p className="text-sm text-ai-red font-body">{errors.website.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bio" className="text-neutral-text font-body">
                      Bio
                    </Label>
                    <span className="text-xs text-neutral-text-secondary font-body">
                      {currentUserData?.profile?.bio?.length || 0}/500 characters
                    </span>
                  </div>
                  <textarea
                    {...register('bio')}
                    id="bio"
                    disabled={!isEditing}
                    rows={4}
                    className="input-ai resize-none"
                    placeholder="Tell us about yourself..."
                  />
                  {errors.bio && (
                    <p className="text-sm text-ai-red font-body">{errors.bio.message}</p>
                  )}
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      className="btn-ai-secondary"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!isDirty}
                      className="btn-ai-primary"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card className="card-ai">
            <CardHeader>
              <CardTitle className="text-neutral-text flex items-center gap-2 font-display">
                <Briefcase className="w-5 h-5 text-ai-cyan" />
                Professional Information
              </CardTitle>
              <CardDescription className="text-neutral-text-secondary font-body">
                Your work and professional details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle" className="text-neutral-text font-body">
                    Job Title
                  </Label>
                  <Input
                    {...register('jobTitle')}
                    id="jobTitle"
                    disabled={!isEditing}
                    className="input-ai"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-neutral-text font-body">
                    Department
                  </Label>
                  <Input
                    {...register('department')}
                    id="department"
                    disabled={!isEditing}
                    className="input-ai"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="card-ai">
            <CardHeader>
              <CardTitle className="text-neutral-text flex items-center gap-2 font-display">
                <Activity className="w-5 h-5 text-ai-emerald" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-neutral-text-secondary font-body">
                Your latest actions and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-ai-purple border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-neutral-text-secondary font-body">Loading activity...</p>
                  </div>
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity: any, index: number) => {
                    const Icon = activity.icon;
                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-4 p-3 rounded-xl glass-card hover:shadow-glass-card-hover transition-all duration-300"
                      >
                        <div className="w-10 h-10 bg-gradient-ai-subtle rounded-full flex items-center justify-center">
                          <Icon className="w-5 h-5 text-ai-purple" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-neutral-text font-medium font-body">
                            {activity.title}
                          </p>
                          <p className="text-sm text-neutral-text-secondary font-body">
                            {formatDateTime(activity.timestamp)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-glass-white-50 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-neutral-text-secondary" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-text mb-2 font-display">No Recent Activity</h3>
                  <p className="text-neutral-text-secondary text-sm font-body">
                    Start by uploading documents or running analyses to see your activity here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
