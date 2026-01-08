/**
 * ============================================================================
 * DISCOVER: Premium Header Component
 * Description: Advanced navigation header with animations, theme toggle,
 *              settings dropdown, and command palette trigger
 * ============================================================================
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import {
  Compass,
  Search,
  TrendingUp,
  GitCompare,
  Menu,
  X,
  Github,
  Command,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { SettingsDropdown } from '@/components/ui/SettingsDropdown';
import { UserMenu } from '@/components/ui/UserMenu';
import { useApp } from '@/contexts/AppContext';

// ============================================================================
// Navigation Items
// ============================================================================

const navItems = [
  { href: '/', label: 'Home', icon: Compass },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/rankings', label: 'Rankings', icon: TrendingUp },
  { href: '/compare', label: 'Compare', icon: GitCompare },
];

// ============================================================================
// Nav Link Component
// ============================================================================

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  compact,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  compact?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2 rounded-xl font-medium transition-all duration-200',
        compact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm',
        isActive
          ? 'text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className={cn('shrink-0', compact ? 'h-4 w-4' : 'h-4 w-4')} />
      <span>{label}</span>
      {isActive && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute inset-0 -z-10 rounded-xl bg-secondary"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}
    </Link>
  );
}

// ============================================================================
// Command Palette Trigger
// ============================================================================

function CommandPaletteTrigger() {
  const { setCommandPaletteOpen } = useApp();

  return (
    <motion.button
      onClick={() => setCommandPaletteOpen(true)}
      className={cn(
        'hidden md:flex items-center gap-2 rounded-xl px-3 py-2',
        'bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground',
        'border border-border/50 hover:border-border transition-colors'
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Search className="h-4 w-4" />
      <span className="text-sm">Search...</span>
      <kbd className="ml-4 flex items-center gap-0.5 rounded-md bg-background/80 px-1.5 py-0.5 text-xs">
        <Command className="h-3 w-3" />K
      </kbd>
    </motion.button>
  );
}

// ============================================================================
// Mobile Menu
// ============================================================================

function MobileMenu({
  isOpen,
  onClose,
  pathname,
}: {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
}) {
  const { setCommandPaletteOpen } = useApp();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Menu Panel */}
          <motion.div
            className={cn(
              'fixed inset-x-0 top-0 z-50 md:hidden',
              'bg-background border-b border-border'
            )}
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-16">
              <Link href="/" className="flex items-center gap-2 font-bold text-xl" onClick={onClose}>
                <Compass className="h-6 w-6 text-primary" />
                <span>Discover</span>
              </Link>
              <motion.button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-secondary transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            {/* Navigation */}
            <motion.nav
              className="px-4 pb-4"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05, delayChildren: 0.1 },
                },
              }}
            >
              {/* Search Button */}
              <motion.button
                onClick={() => {
                  onClose();
                  setCommandPaletteOpen(true);
                }}
                className={cn(
                  'w-full flex items-center gap-3 mb-3 px-4 py-3 rounded-xl',
                  'bg-secondary/50 text-muted-foreground',
                  'border border-border/50'
                )}
                variants={{
                  hidden: { opacity: 0, y: -10 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <Search className="h-5 w-5" />
                <span>Search commands...</span>
                <kbd className="ml-auto text-xs bg-background/80 px-2 py-1 rounded">⌘K</kbd>
              </motion.button>

              {/* Nav Links */}
              <div className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <motion.div
                      key={item.href}
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        visible: { opacity: 1, x: 0 },
                      }}
                    >
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                        {isActive && (
                          <Sparkles className="ml-auto h-4 w-4" />
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <motion.div
                className="flex items-center gap-3 mt-6 pt-4 border-t border-border"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1 },
                }}
              >
                <ThemeToggle variant="dropdown" size="md" />
                <SettingsDropdown size="md" />
                <a
                  href="https://github.com/drhazemali"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github className="h-5 w-5" />
                </a>
              </motion.div>
            </motion.nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Header Component
// ============================================================================

export function Header() {
  const pathname = usePathname();
  const { settings } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { scrollY } = useScroll();

  // Track scroll position
  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsScrolled(latest > 10);
  });

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <motion.header
        className={cn(
          'sticky top-0 z-50 w-full transition-all duration-300',
          isScrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border shadow-sm'
            : 'bg-transparent'
        )}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className={cn(
          'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
          'transition-all duration-200',
          settings.compactMode ? 'py-2' : 'py-3'
        )}>
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 group"
            >
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05, rotate: 10 }}
                whileTap={{ scale: 0.95 }}
              >
                <Compass className={cn(
                  'text-primary transition-all duration-200',
                  settings.compactMode ? 'h-5 w-5' : 'h-6 w-6'
                )} />
                {settings.visualEffects && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                )}
              </motion.div>
              <span className={cn(
                'font-bold tracking-tight transition-all duration-200',
                settings.compactMode ? 'text-lg' : 'text-xl'
              )}>
                Discover
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={pathname === item.href}
                  compact={settings.compactMode}
                />
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Command Palette Trigger */}
              <CommandPaletteTrigger />

              {/* Theme Toggle */}
              <div className="hidden sm:block">
                <ThemeToggle
                  variant="icon"
                  size={settings.compactMode ? 'sm' : 'md'}
                />
              </div>

              {/* Settings */}
              <div className="hidden sm:block">
                <SettingsDropdown size={settings.compactMode ? 'sm' : 'md'} />
              </div>

              {/* GitHub Link */}
              <motion.a
                href="https://github.com/drhazemali"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'hidden lg:flex items-center justify-center rounded-xl',
                  'bg-secondary/50 hover:bg-secondary transition-colors',
                  'border border-border/50 hover:border-border',
                  settings.compactMode ? 'h-8 w-8' : 'h-10 w-10'
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="GitHub"
              >
                <Github className={settings.compactMode ? 'h-4 w-4' : 'h-5 w-5'} />
              </motion.a>

              {/* User Menu */}
              <UserMenu compact={settings.compactMode} />

              {/* Mobile Menu Button */}
              <motion.button
                onClick={() => setMobileMenuOpen(true)}
                className={cn(
                  'md:hidden flex items-center justify-center rounded-xl',
                  'bg-secondary/50 hover:bg-secondary transition-colors',
                  'border border-border/50 hover:border-border',
                  settings.compactMode ? 'h-8 w-8' : 'h-10 w-10'
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Open menu"
              >
                <Menu className={settings.compactMode ? 'h-4 w-4' : 'h-5 w-5'} />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        pathname={pathname}
      />
    </>
  );
}

export default Header;
