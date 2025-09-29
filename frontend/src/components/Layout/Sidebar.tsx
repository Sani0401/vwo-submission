import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  FileText,
  BarChart3,
  History,
  Settings,
  User,
  X,
  Upload,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

const sidebarItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: BarChart3,
  },
  {
    label: 'Documents',
    path: '/documents',
    icon: FileText,
  },
  {
    label: 'History',
    path: '/history',
    icon: History,
  },
  {
    label: 'Profile',
    path: '/profile',
    icon: User,
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: Settings,
  },
];

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobile = false, onClose, collapsed = false, onToggle }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleToggleCollapse = () => {
    if (onToggle) {
      onToggle();
    }
  };

  const handleClose = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };


  return (
    <>
      {/* Mobile overlay */}
      {isMobile && !collapsed && (
        <div
          className="fixed inset-0 bg-neutral-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={handleClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen glass-sidebar shadow-glass-card flex flex-col z-50 transition-all duration-300 ease-in-out',
          isMobile ? 'lg:fixed' : 'fixed',
          collapsed ? 'w-20' : 'w-[280px]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-border/20">
          {!collapsed && (
            <div className="flex items-center gap-3 transition-opacity duration-200">
              <div className="w-8 h-8 bg-gradient-ai rounded-lg flex items-center justify-center shadow-ai-purple-glow">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-lg text-gradient-ai">
                Fin Doc Scanner
              </span>
            </div>
          )}

          {/* Toggle/Close buttons */}
          <div className="flex items-center gap-2">
            {isMobile ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-neutral-text hover:text-ai-purple"
              >
                <X className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleCollapse}
                className="text-neutral-text hover:text-ai-purple"
              >
                {collapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Upload Button */}
        <div className="p-4 border-b border-neutral-border/20">
          <NavLink to="/documents?upload=true">
            <Button
              className="w-full btn-ai-primary justify-center gap-2"
              onClick={handleClose}
            >
              <Upload className="w-4 h-4" />
              {!collapsed && (
                <span className="transition-opacity duration-200">
                  Upload
                </span>
              )}
            </Button>
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={handleClose}
                    className={cn(
                      'sidebar-item-ai w-full',
                      isActive && 'active'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && (
                      <span className="font-medium transition-opacity duration-200">
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-neutral-border/20">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-glass-white-50 rounded-xl p-2 transition-all duration-300"
            onClick={() => {
              navigate('/profile');
              handleClose();
            }}
          >
            <div className="w-10 h-10 bg-gradient-ai rounded-full flex items-center justify-center text-white font-semibold shadow-ai-purple-glow">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 transition-opacity duration-200">
                <p className="text-neutral-text font-medium truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-neutral-text-secondary text-sm truncate">
                  {user?.email}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;