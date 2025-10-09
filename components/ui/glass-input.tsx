import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassInputVariants = cva(
  "flex w-full rounded-lg px-4 py-3 text-sm transition-all duration-liquid-smooth ease-liquid-smooth file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-white/70 dark:bg-black/40 backdrop-blur-md border border-white/40 dark:border-white/20 shadow-glass-sm focus-visible:shadow-glass-md focus-visible:border-purple-500/50 focus-visible:ring-2 focus-visible:ring-purple-500/20",
        glass:
          "bg-white/60 dark:bg-black/30 backdrop-blur-lg border border-white/50 dark:border-white/10 shadow-glass-md focus-visible:shadow-glow-purple focus-visible:border-purple-500/60 focus-visible:ring-2 focus-visible:ring-purple-500/30",
        gradient:
          "bg-gradient-to-r from-white/70 via-purple-50/50 to-pink-50/50 dark:from-black/40 dark:via-purple-950/30 dark:to-pink-950/30 backdrop-blur-md border border-purple-500/30 shadow-glass-sm focus-visible:shadow-glow-purple focus-visible:border-purple-500/60",
      },
      inputSize: {
        sm: "h-9 px-3 py-2 text-xs",
        default: "h-11 px-4 py-3",
        lg: "h-12 px-5 py-4 text-base",
      },
      state: {
        default: "",
        error:
          "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/20 shadow-glow-pink/30",
        success:
          "border-green-500/50 focus-visible:border-green-500 focus-visible:ring-green-500/20",
        warning:
          "border-yellow-500/50 focus-visible:border-yellow-500 focus-visible:ring-yellow-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
      state: "default",
    },
  }
);

export interface GlassInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof glassInputVariants> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  floatingLabel?: boolean;
}

const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  (
    {
      className,
      variant,
      inputSize,
      state: stateProp,
      type,
      label,
      error,
      success,
      helperText,
      floatingLabel = false,
      id,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const state = error ? "error" : success ? "success" : stateProp;

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(e.target.value !== "");
      props.onBlur?.(e);
    };

    const showFloatingLabel = floatingLabel && (isFocused || hasValue);

    return (
      <div className="w-full space-y-2">
        {label && !floatingLabel && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground mb-2"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {floatingLabel && label && (
            <label
              htmlFor={inputId}
              className={cn(
                "absolute left-4 transition-all duration-liquid-smooth pointer-events-none text-muted-foreground",
                showFloatingLabel
                  ? "-top-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium px-1 backdrop-blur-sm"
                  : "top-3 text-sm"
              )}
            >
              {label}
            </label>
          )}
          
          <input
            type={type}
            id={inputId}
            className={cn(glassInputVariants({ variant, inputSize, state }), className)}
            ref={ref}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
          
          {isFocused && (
            <div className="absolute inset-0 rounded-lg pointer-events-none">
              <div className="absolute inset-0 rounded-lg bg-slate-500/10 dark:bg-slate-400/10 opacity-50" />
            </div>
          )}
        </div>

        {(error || success || helperText) && (
          <p
            className={cn(
              "text-xs transition-all duration-liquid-fast",
              error && "text-red-500",
              success && "text-green-500",
              !error && !success && "text-muted-foreground"
            )}
          >
            {error || success || helperText}
          </p>
        )}
      </div>
    );
  }
);
GlassInput.displayName = "GlassInput";

export { GlassInput, glassInputVariants };
