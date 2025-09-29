import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, BarChart3, History, Settings, Upload, User } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
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
    label: 'Settings',
    path: '/settings',
    icon: Settings,
  },
];

export const MobileNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Floating upload button */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
        <NavLink to="/documents?upload=true">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 bg-gradient-ai rounded-full flex items-center justify-center shadow-ai-purple-glow"
          >
            <Upload className="w-6 h-6 text-white" />
          </motion.div>
        </NavLink>
      </div>

      {/* Navigation bar */}
      <div className="glass border-t border-neutral-border/20 px-4 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'text-ai-purple'
                    : 'text-neutral-text-secondary hover:text-neutral-text'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-ai-purple rounded-full"
                  />
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default MobileNav;