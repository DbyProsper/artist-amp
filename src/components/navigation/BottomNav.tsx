import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, PlusSquare, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/discover', icon: Search, label: 'Discover' },
  { path: '/upload', icon: PlusSquare, label: 'Upload' },
  { path: '/messages', icon: MessageCircle, label: 'Messages' },
  { path: '/profile', icon: User, label: 'Profile' },
];

// Routes where bottom nav should be hidden
const hiddenRoutes = ['/landing', '/auth', '/onboarding'];

export function BottomNav() {
  const location = useLocation();
  const { user, loading } = useAuth();

  // Hide on landing, auth, and onboarding pages
  const shouldHide = hiddenRoutes.some(route => location.pathname.startsWith(route));
  
  // Also hide if not logged in and on landing page
  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center flex-1 h-full"
            >
              <div className="relative">
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 -m-2 rounded-xl bg-primary/20"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon
                  className={cn(
                    "w-6 h-6 relative z-10 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                  fill={isActive ? "currentColor" : "none"}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 transition-colors",
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
