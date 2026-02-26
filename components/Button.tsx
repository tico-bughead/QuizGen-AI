import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  fullWidth = false,
  className = '',
  icon,
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center px-6 py-3 border text-base font-medium rounded-3xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "border-transparent text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-0.5",
    secondary: "border-transparent text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:ring-indigo-500",
    outline: "border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus:ring-indigo-500",
    ghost: "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
          Processando...
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};