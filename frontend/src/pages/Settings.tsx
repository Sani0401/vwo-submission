import React, { useState } from 'react';
import {
  Shield,
  Palette,
  Users,
  Mail,
  Save,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Contrast,
  Trash2,
  Plus,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { cn } from '../lib/utils';
import { usersAPI } from '../services/api';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'user', 'viewer']),
});

type PasswordFormData = z.infer<typeof passwordSchema>;
type InviteUserFormData = z.infer<typeof inviteUserSchema>;


const SecuritySettings: React.FC = () => {
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = (data: PasswordFormData) => {
    // Simulate API call
    console.log('Updating password');
    // You can use toast notifications here instead
    console.log('Password Updated: Your password has been changed successfully.');
    reset();
  };

  return (
    <Card className="card-ai">
      <CardHeader>
        <CardTitle className="text-neutral-text flex items-center gap-2 font-display">
          <Shield className="w-5 h-5 text-ai-purple" />
          Security Settings
        </CardTitle>
        <CardDescription className="text-neutral-text-secondary font-body">
          Manage your password and security preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-neutral-text font-body">
              Current Password
            </Label>
            <div className="relative">
              <Input
                {...register('currentPassword')}
                id="currentPassword"
                type={showPasswords.current ? 'text' : 'password'}
                className="input-ai pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-text-secondary hover:text-neutral-text"
              >
                {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-sm text-ai-red font-body">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-neutral-text font-body">
              New Password
            </Label>
            <div className="relative">
              <Input
                {...register('newPassword')}
                id="newPassword"
                type={showPasswords.new ? 'text' : 'password'}
                className="input-ai pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-text-secondary hover:text-neutral-text"
              >
                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-sm text-ai-red font-body">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-neutral-text font-body">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                {...register('confirmPassword')}
                id="confirmPassword"
                type={showPasswords.confirm ? 'text' : 'password'}
                className="input-ai pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-text-secondary hover:text-neutral-text"
              >
                {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-ai-red font-body">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="btn-ai-primary">
              <Save className="w-4 h-4 mr-2" />
              Update Password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const ThemeSettings: React.FC = () => {
  const [theme, setTheme] = useState({ mode: 'light', highContrast: false });

  const handleThemeToggle = () => {
    setTheme(prev => ({ ...prev, mode: prev.mode === 'light' ? 'dark' : 'light' }));
  };

  const handleHighContrastToggle = () => {
    setTheme(prev => ({ ...prev, highContrast: !prev.highContrast }));
  };

  return (
    <Card className="card-ai">
      <CardHeader>
        <CardTitle className="text-neutral-text flex items-center gap-2 font-display">
          <Palette className="w-5 h-5 text-ai-cyan" />
          Appearance
        </CardTitle>
        <CardDescription className="text-neutral-text-secondary font-body">
          Customize the look and feel of the application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-neutral-text font-body">Theme</Label>
            <p className="text-sm text-neutral-text-secondary font-body">
              Switch between light and dark mode
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-neutral-text-secondary" />
            <Switch
              checked={theme.mode === 'dark'}
              onCheckedChange={handleThemeToggle}
            />
            <Moon className="w-4 h-4 text-neutral-text-secondary" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-neutral-text font-body">High Contrast</Label>
            <p className="text-sm text-neutral-text-secondary font-body">
              Increase contrast for better accessibility
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Contrast className="w-4 h-4 text-neutral-text-secondary" />
            <Switch
              checked={theme.highContrast}
              onCheckedChange={handleHighContrastToggle}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-neutral-text font-body">Preview</Label>
          <div className="p-4 rounded-xl border border-neutral-border/20 bg-glass-white-30">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-ai-purple rounded-full"></div>
                <span className="text-neutral-text font-medium font-body">Primary Accent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-ai-cyan rounded-full"></div>
                <span className="text-neutral-text font-medium font-body">Secondary Accent</span>
              </div>
              <div className="p-3 bg-glass-white-50 rounded-lg">
                <p className="text-neutral-text text-sm font-body">
                  This is how your text will appear in cards and panels
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const UserManagement: React.FC = () => {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, token } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      role: 'user',
    },
  });

  // Fetch users on component mount
  React.useEffect(() => {
    const fetchUsers = async () => {
      if (!token || user?.role !== 'admin') {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await usersAPI.getAllUsers(token);
        setUsers(response.data || []);
      } catch (error: any) {
        console.error('Failed to fetch users:', error);
        setError(error.message || 'Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [token, user?.role]);

  const onInviteSubmit = async (data: InviteUserFormData) => {
    try {
      // For now, we'll simulate the invite since the backend doesn't have an invite endpoint
      console.log('Inviting user:', data);
      console.log('User Invited: Invitation sent to ' + data.email);
      reset();
      setShowInviteDialog(false);
    } catch (error: any) {
      console.error('Failed to invite user:', error);
    }
  };

  const handleRevokeAccess = async (userId: string, email: string) => {
    if (!token) return;
    
    try {
      await usersAPI.deleteUser(userId, token);
      setUsers(prev => prev.filter(u => u.id !== userId));
      console.log('Access Revoked: Access revoked for ' + email);
    } catch (error: any) {
      console.error('Failed to revoke access:', error);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <Card className="card-ai">
        <CardContent className="p-6 text-center">
          <Shield className="w-12 h-12 text-neutral-text-secondary mx-auto mb-4" />
          <p className="text-neutral-text font-medium mb-2 font-display">Admin Access Required</p>
          <p className="text-neutral-text-secondary font-body">You need admin privileges to manage users.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-ai">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-neutral-text flex items-center gap-2 font-display">
              <Users className="w-5 h-5 text-ai-emerald" />
              User Management
            </CardTitle>
            <CardDescription className="text-neutral-text-secondary font-body">
              Manage user accounts and permissions
            </CardDescription>
          </div>
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button className="btn-ai-primary">
                <Plus className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border border-neutral-border/20">
              <DialogHeader>
                <DialogTitle className="text-neutral-text font-display">Invite New User</DialogTitle>
                <DialogDescription className="text-neutral-text-secondary font-body">
                  Send an invitation to a new user to join your organization.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onInviteSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail" className="text-neutral-text font-body">
                    Email Address
                  </Label>
                  <Input
                    {...register('email')}
                    id="inviteEmail"
                    type="email"
                    placeholder="user@example.com"
                    className="input-ai"
                  />
                  {errors.email && (
                    <p className="text-sm text-ai-red font-body">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-neutral-text font-body">
                    Role
                  </Label>
                  <select
                    {...register('role')}
                    id="role"
                    className="input-ai"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  {errors.role && (
                    <p className="text-sm text-ai-red font-body">{errors.role.message}</p>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowInviteDialog(false)} className="btn-ai-secondary">
                    Cancel
                  </Button>
                  <Button type="submit" className="btn-ai-primary">
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-border/20">
                <TableHead className="text-neutral-text font-display">User</TableHead>
                <TableHead className="text-neutral-text font-display">Role</TableHead>
                <TableHead className="text-neutral-text font-display">Joined</TableHead>
                <TableHead className="text-neutral-text font-display">Last Login</TableHead>
                <TableHead className="text-neutral-text font-display">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-ai-purple border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span className="font-body">Loading users...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-ai-red font-body">
                    Error: {error}
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-neutral-text-secondary font-body">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((userData) => (
                  <TableRow key={userData.id} className="border-neutral-border/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-ai rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {userData.profile?.first_name?.[0] || userData.name?.[0] || 'U'}
                          {userData.profile?.last_name?.[0] || userData.name?.split(' ')[1]?.[0] || ''}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-text font-body">
                            {userData.profile?.first_name && userData.profile?.last_name 
                              ? `${userData.profile.first_name} ${userData.profile.last_name}`
                              : userData.name || 'Unknown User'
                            }
                          </p>
                          <p className="text-sm text-neutral-text-secondary font-body">{userData.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          userData.role?.toLowerCase() === 'admin' && "status-badge-ai completed",
                          userData.role?.toLowerCase() === 'user' && "status-badge-ai active",
                          userData.role?.toLowerCase() === 'viewer' && "status-badge-ai idle"
                        )}
                      >
                        {userData.role?.toLowerCase() || 'user'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-neutral-text font-body">
                      {new Date(userData.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-neutral-text font-body">
                      {userData.account?.last_login ? new Date(userData.account.last_login).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                    {userData.id !== user?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-ai-red hover:text-ai-red hover:bg-ai-red/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-card border border-neutral-border/20">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-neutral-text font-display">Revoke Access</AlertDialogTitle>
                            <AlertDialogDescription className="text-neutral-text-secondary font-body">
                              Are you sure you want to revoke access for {userData.profile?.first_name || userData.name?.split(' ')[0] || 'this user'} {userData.profile?.last_name || userData.name?.split(' ')[1] || ''}? 
                              This will immediately terminate their session and prevent future access.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="btn-ai-secondary">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRevokeAccess(userData.id, userData.email)}
                              className="btn-ai-destructive"
                            >
                              Revoke Access
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gradient-ai font-display">Settings</h1>
        <p className="text-neutral-text-secondary mt-1 font-body">
          Manage your account, preferences, and organization settings
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="security" className="space-y-6">
        <TabsList className="bg-glass-white-50 border border-neutral-border/20">
          <TabsTrigger value="security" className="text-neutral-text-secondary hover:text-neutral-text data-[state=active]:bg-ai-purple data-[state=active]:text-white">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
         
          <TabsTrigger value="users" className="text-neutral-text-secondary hover:text-neutral-text data-[state=active]:bg-ai-purple data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-6">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <ThemeSettings />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;