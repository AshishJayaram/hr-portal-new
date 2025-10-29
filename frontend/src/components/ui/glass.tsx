import React from 'react';
import { cn } from '@/lib/utils';

// Glass Card Component
interface GlassCardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  variant?: 'default' | 'purple' | 'blue' | 'gradient';
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  shadow?: 'sm' | 'md' | 'lg';
  borderRadius?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'default',
  blur = 'lg',
  padding = 'md',
  shadow = 'md',
  borderRadius = 'md',
  onClick,
  className,
  ...props
}) => {
  const baseClasses = 'relative overflow-hidden border border-white/20';

  const variantClasses = {
    default: 'bg-liquid-glass-white dark:bg-liquid-glass-black',
    purple: 'bg-liquid-glass-purple',
    blue: 'bg-liquid-glass-blue',
    gradient: 'bg-liquid-primary dark:bg-liquid-dark-primary',
  };

  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl',
  };

  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };

  const shadowClasses = {
    sm: 'shadow-liquid',
    md: 'shadow-liquid',
    lg: 'shadow-liquid-glass',
  };

  const borderRadiusClasses = {
    sm: 'rounded-liquid-sm',
    md: 'rounded-liquid-md',
    lg: 'rounded-liquid-lg',
    xl: 'rounded-liquid-xl',
  };

  const classes = cn(
    baseClasses,
    variantClasses[variant],
    blurClasses[blur],
    paddingClasses[padding],
    shadowClasses[shadow],
    borderRadiusClasses[borderRadius],
    onClick && 'cursor-pointer hover:scale-[1.02] transition-transform duration-200',
    className
  );

  return (
    <div
      className={cn(classes, onClick && 'cursor-pointer')}
      onClick={onClick}
      {...(props as React.HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </div>
  );
};

// Glass Button Component
interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  ...props
}) => {
  const baseClasses = 'relative overflow-hidden border border-white/20 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantClasses = {
    primary: 'bg-liquid-primary hover:bg-liquid-primary/90 text-white focus:ring-liquid-primary-purple border-liquid-primary-purple',
    secondary: 'bg-liquid-secondary hover:bg-liquid-secondary/90 text-white focus:ring-liquid-secondary-orange border-liquid-secondary-orange',
    accent: 'bg-liquid-accent hover:bg-liquid-accent/90 text-white focus:ring-liquid-accent-blue border-liquid-accent-blue',
    outline: 'bg-transparent hover:bg-liquid-glass-white dark:hover:bg-liquid-glass-black text-liquid-primary-purple dark:text-liquid-primary-purple-light border-liquid-primary-purple hover:border-liquid-primary-purple-light',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-liquid-sm',
    md: 'px-4 py-2 text-base rounded-liquid-md',
    lg: 'px-6 py-3 text-lg rounded-liquid-lg',
  };

  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    loading && 'opacity-50 cursor-not-allowed',
    disabled && 'opacity-50 cursor-not-allowed',
    className
  );

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <span className={loading ? 'opacity-0' : ''}>
        {children}
      </span>
    </button>
  );
};

// Glass Input Component
interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  error,
  className,
  ...props
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={cn(
            'w-full px-4 py-3 bg-liquid-glass-white dark:bg-liquid-glass-black border border-white/20 rounded-liquid-md backdrop-blur-md shadow-liquid focus:outline-none focus:ring-2 focus:ring-liquid-primary-purple focus:border-liquid-primary-purple text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

// Glass Container for backgrounds
interface GlassContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'dark';
}

export const GlassContainer: React.FC<GlassContainerProps> = ({
  children,
  variant = 'primary',
  className,
  ...props
}) => {
  const variantClasses = {
    primary: 'bg-liquid-primary',
    secondary: 'bg-liquid-secondary',
    accent: 'bg-liquid-accent',
    dark: 'bg-liquid-dark-primary',
  };

  return (
    <div
      className={cn('min-h-screen', variantClasses[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
};
