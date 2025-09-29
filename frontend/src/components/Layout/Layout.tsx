import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '../../hooks';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';
import { cn } from '../../lib/utils';

export const Layout: React.FC = () => {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1023px)');

  const handleMobileMenuToggle = () => {
    setShowMobileSidebar(!showMobileSidebar);
  };

  const handleMobileSidebarClose = () => {
    setShowMobileSidebar(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-background via-neutral-background-2 to-neutral-background-3">
      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />}

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobile && showMobileSidebar && (
          <Sidebar isMobile onClose={handleMobileSidebarClose} />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div
        className={cn(
          'flex flex-col transition-all duration-300',
          isMobile
            ? 'ml-0'
            : sidebarCollapsed
            ? 'ml-20'
            : 'ml-70'
        )}
      >
        {/* Header */}
        <Header onMobileMenuToggle={handleMobileMenuToggle} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className={cn(
            'p-4 lg:p-6 min-h-full',
            isMobile && 'pb-20' // Add bottom padding for mobile nav
          )}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="min-h-full"
            >
              <Outlet />
            </motion.div>
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
};

export default Layout;