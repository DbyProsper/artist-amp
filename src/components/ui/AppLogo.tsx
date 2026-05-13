import { cn } from '@/lib/utils';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4',
  md: 'h-6',
  lg: 'h-8',
  xl: 'h-12',
};

export function AppLogo({ size = 'md', className }: AppLogoProps) {
  return (
    <img
      src="/MusicInsta_Logo.png"
      alt="MusicInsta Logo"
      className={cn(sizeClasses[size], 'w-auto', className)}
    />
  );
}
