import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, FileText, Loader2, User, Mail, Phone, MapPin, Globe, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  role: z.enum(['user', 'admin', 'viewer'], {
    message: 'Please select a role',
  }),
  phone: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

export const SignupForm: React.FC = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const { isLoading, error, register: registerUser, clearError } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  React.useEffect(() => {
    // Clear any previous errors when component mounts
    clearError();
  }, [clearError]);

  const onSubmit = async (data: SignupFormData) => {
    try {
      const { confirmPassword, ...userData } = data;
      await registerUser(userData);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      // Error is handled by the context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-background via-neutral-background-2 to-neutral-background-3 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="card-ai">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-ai rounded-2xl mb-4 shadow-ai-purple-glow">
              <UserCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gradient-ai mb-2 font-display">
              Create Account
            </h1>
            <p className="text-neutral-text-secondary font-body">
              Join the Fin Doc Scanner platform
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6 border-ai-red/20 bg-ai-red/10">
              <AlertDescription className="text-ai-red font-body">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-text flex items-center gap-2 font-display">
                <User className="w-5 h-5 text-ai-purple" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-neutral-text font-body">
                    First Name *
                  </Label>
                  <Input
                    {...register('firstName')}
                    id="firstName"
                    type="text"
                    placeholder="Enter your first name"
                    className="input-ai"
                    disabled={isLoading}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-ai-red font-body">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-neutral-text font-body">
                    Last Name *
                  </Label>
                  <Input
                    {...register('lastName')}
                    id="lastName"
                    type="text"
                    placeholder="Enter your last name"
                    className="input-ai"
                    disabled={isLoading}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-ai-red font-body">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-neutral-text font-body">
                  Email Address *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-text-secondary" />
                  <Input
                    {...register('email')}
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    className="input-ai pl-10"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-ai-red font-body">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-neutral-text font-body">
                  Role *
                </Label>
                <Select onValueChange={(value) => setValue('role', value as 'user' | 'admin' | 'viewer')}>
                  <SelectTrigger className="input-ai">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User - Standard access to upload and analyze documents</SelectItem>
                    <SelectItem value="admin">Admin - Full access to all features and user management</SelectItem>
                    <SelectItem value="viewer">Viewer - Read-only access to view analyses</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-ai-red font-body">{errors.role.message}</p>
                )}
              </div>
            </div>

            {/* Security Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-text flex items-center gap-2 font-display">
                <UserCheck className="w-5 h-5 text-ai-emerald" />
                Security
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-neutral-text font-body">
                  Password *
                </Label>
                <div className="relative">
                  <Input
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    className="input-ai pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-text-secondary hover:text-neutral-text transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-ai-red font-body">{errors.password.message}</p>
                )}
                <p className="text-xs text-neutral-text-secondary font-body">
                  Must be at least 8 characters with uppercase, lowercase, and number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-neutral-text font-body">
                  Confirm Password *
                </Label>
                <div className="relative">
                  <Input
                    {...register('confirmPassword')}
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    className="input-ai pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-text-secondary hover:text-neutral-text transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-ai-red font-body">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Optional Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-neutral-text flex items-center gap-2 font-display">
                <User className="w-5 h-5 text-ai-cyan" />
                Additional Information (Optional)
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-neutral-text font-body">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-text-secondary" />
                  <Input
                    {...register('phone')}
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    className="input-ai pl-10"
                    disabled={isLoading}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-ai-red font-body">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-neutral-text font-body">
                  Location
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-text-secondary" />
                  <Input
                    {...register('location')}
                    id="location"
                    type="text"
                    placeholder="City, Country"
                    className="input-ai pl-10"
                    disabled={isLoading}
                  />
                </div>
                {errors.location && (
                  <p className="text-sm text-ai-red font-body">{errors.location.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-neutral-text font-body">
                  Website
                </Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-text-secondary" />
                  <Input
                    {...register('website')}
                    id="website"
                    type="url"
                    placeholder="https://your-website.com"
                    className="input-ai pl-10"
                    disabled={isLoading}
                  />
                </div>
                {errors.website && (
                  <p className="text-sm text-ai-red font-body">{errors.website.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-neutral-text font-body">
                  Bio
                </Label>
                <Textarea
                  {...register('bio')}
                  id="bio"
                  placeholder="Tell us a bit about yourself..."
                  className="input-ai min-h-[100px] resize-none"
                  disabled={isLoading}
                />
                {errors.bio && (
                  <p className="text-sm text-ai-red font-body">{errors.bio.message}</p>
                )}
                <p className="text-xs text-neutral-text-secondary font-body">
                  {watch('bio')?.length || 0}/500 characters
                </p>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start gap-3 p-4 glass-card rounded-lg">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  required
                  className="w-4 h-4 text-ai-purple bg-glass-white border-neutral-border rounded focus:ring-ai-purple focus:ring-2"
                />
              </div>
              <label htmlFor="terms" className="text-sm text-neutral-text-secondary font-body">
                I agree to the{' '}
                <Link to="/terms" className="text-ai-purple hover:text-ai-purple/80 transition-colors">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-ai-purple hover:text-ai-purple/80 transition-colors">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full btn-ai-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="mt-8 text-center">
            <p className="text-neutral-text-secondary font-body">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-ai-purple hover:text-ai-purple/80 transition-colors font-medium"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Features Preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="p-4 glass-card rounded-xl text-center">
            <FileText className="w-8 h-8 text-ai-purple mx-auto mb-2" />
            <h4 className="font-semibold text-neutral-text mb-1 font-display">Document Analysis</h4>
            <p className="text-xs text-neutral-text-secondary font-body">
              Upload and analyze financial documents with AI
            </p>
          </div>
          <div className="p-4 glass-card rounded-xl text-center">
            <UserCheck className="w-8 h-8 text-ai-emerald mx-auto mb-2" />
            <h4 className="font-semibold text-neutral-text mb-1 font-display">Secure Platform</h4>
            <p className="text-xs text-neutral-text-secondary font-body">
              Enterprise-grade security for your data
            </p>
          </div>
          <div className="p-4 glass-card rounded-xl text-center">
            <Globe className="w-8 h-8 text-ai-cyan mx-auto mb-2" />
            <h4 className="font-semibold text-neutral-text mb-1 font-display">Global Access</h4>
            <p className="text-xs text-neutral-text-secondary font-body">
              Access your analyses from anywhere
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SignupForm;
