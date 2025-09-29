import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  User,
  Menu,
  Sun,
  Moon,
  Settings,
  LogOut,
  Contrast,
} from 'lucide-react';
import { useClickOutside } from '../../hooks';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState({ mode: 'light', highContrast: false });
  const [notifications, setNotifications] = useState<any[]>([]);
  const navigate = useNavigate();
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useClickOutside(userMenuRef, () => setShowUserMenu(false));
  useClickOutside(notificationsRef, () => setShowNotifications(false));

  const unreadNotifications = notifications.filter(n => !n.read);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const handleThemeToggle = () => {
    setTheme(prev => ({ ...prev, mode: prev.mode === 'light' ? 'dark' : 'light' }));
  };

  const handleHighContrastToggle = () => {
    setTheme(prev => ({ ...prev, highContrast: !prev.highContrast }));
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadNotifications.length > 0) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  return (
    <header className="h-16 glass-header shadow-glass-card flex items-center justify-between px-4 lg:px-6">
      {/* Left section */}
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden text-neutral-text hover:text-ai-purple"
          onClick={onMobileMenuToggle}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-text-secondary" />
          <Input
            placeholder="Search documents, analyses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-ai pl-10 pr-4 w-full border-2 border-neutral-border/30 focus:border-ai-purple"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleThemeToggle}
          className="text-neutral-text hover:text-ai-purple"
          aria-label="Toggle theme"
        >
          {theme.mode === 'light' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </Button>

        {/* High contrast toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleHighContrastToggle}
          className={cn(
            "text-neutral-text hover:text-ai-purple",
            theme.highContrast && "text-ai-purple"
          )}
          aria-label="Toggle high contrast"
        >
          <Contrast className="w-5 h-5" />
        </Button>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNotificationClick}
            className="text-neutral-text hover:text-ai-purple relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications.length > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 w-5 h-5 text-xs p-0 flex items-center justify-center bg-ai-purple text-white"
              >
                {unreadNotifications.length}
              </Badge>
            )}
          </Button>

          {/* Notifications dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed right-4 top-20 w-80 glass-card max-h-96 overflow-y-auto z-[9999]"
              >
                <div className="p-3 border-b border-neutral-border/20">
                  <h3 className="font-semibold text-neutral-text">Notifications</h3>
                </div>
                
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-neutral-text-secondary">
                    No notifications yet
                  </div>
                ) : (
                  <div className="p-2">
                    {notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-3 rounded-lg mb-2 transition-colors",
                          notification.read
                            ? "text-neutral-text-secondary"
                            : "text-neutral-text bg-glass-white-50"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                              notification.type === 'error' && "bg-ai-red",
                              notification.type === 'warning' && "bg-ai-amber",
                              notification.type === 'success' && "bg-ai-emerald",
                              notification.type === 'info' && "bg-ai-cyan"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">
                              {notification.title}
                            </p>
                            <p className="text-xs mt-1 opacity-80">
                              {notification.message}
                            </p>
                            <p className="text-xs mt-1 opacity-60">
                              {new Date(notification.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="text-neutral-text hover:text-ai-purple flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-gradient-ai rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-ai-purple-glow">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </Button>

          {/* User dropdown */}
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed right-4 top-20 w-56 glass-card z-[9999]"
              >
                <div className="p-3 border-b border-neutral-border/20">
                  <p className="font-semibold text-neutral-text">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-sm text-neutral-text-secondary">{user?.email}</p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {user?.role}
                  </Badge>
                </div>
                
                <div className="p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-neutral-text hover:text-ai-purple"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/profile');
                    }}
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-neutral-text hover:text-ai-purple"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/settings');
                    }}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                  
                  <hr className="my-1 border-neutral-border/20" />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-ai-red hover:text-ai-red hover:bg-ai-red/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;