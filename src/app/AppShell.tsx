import { motion } from 'motion/react';
import { Outlet, useLocation } from 'react-router';
import { Navbar } from './Navbar';
import { OfflineBanner } from './OfflineBanner';

export function AppShell() {
  const location = useLocation();
  return (
    <div className="mx-auto min-h-dvh max-w-[480px] pt-[env(safe-area-inset-top)] pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <OfflineBanner />
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="px-4 pt-4"
      >
        <Outlet />
      </motion.main>
      <Navbar />
    </div>
  );
}
