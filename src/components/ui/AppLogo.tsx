import { Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export function AppLogo({ size = 'md', className }: AppLogoProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Music className={cn(sizeClasses[size], 'text-primary')} />
    </div>
  );
}
