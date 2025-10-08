'use client'

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, useReducedMotion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { glassCardVariants as motionVariants, glassCardVariantsReducedMotion } from "@/lib/animations/glass-variants";

const glassCardVariants = cva(
  "relative overflow-hidden rounded-lg transition-all duration-liquid-smooth ease-liquid-smooth will-change-transform",
  {
    variants: {
      variant: {
        default:
          "bg-white/70 dark:bg-black/40 backdrop-blur-md border border-white/30 dark:border-white/10 shadow-glass-md",
        elevated:
          "bg-white/80 dark:bg-black/50 backdrop-blur-lg border border-white/40 dark:border-white/20 shadow-glass-lg",
        interactive:
          "bg-white/70 dark:bg-black/40 backdrop-blur-md border border-white/30 dark:border-white/10 shadow-glass-md hover:shadow-glass-lg hover:border-purple-500/30 cursor-pointer",
        gradient:
          "bg-gradient-to-br from-white/80 via-purple-50/50 to-pink-50/50 dark:from-black/50 dark:via-purple-950/30 dark:to-pink-950/30 backdrop-blur-lg border border-purple-500/20 shadow-glass-md hover:shadow-glow-purple",
      },
      glow: {
        none: "",
        subtle: "hover:shadow-glow-purple/50",
        medium: "hover:shadow-glow-purple",
        strong: "shadow-glow-purple hover:shadow-glow-pink",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
        xl: "p-10",
      },
    },
    defaultVariants: {
      variant: "default",
      glow: "none",
      padding: "md",
    },
  }
);

export interface GlassCardProps
  extends Omit<HTMLMotionProps<"div">, "ref" | "children">,
    VariantProps<typeof glassCardVariants> {
  children?: React.ReactNode;
  asChild?: boolean;
  animated?: boolean;
  hover?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant, glow, padding, animated = false, hover = true, children, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion();
    const variants = shouldReduceMotion ? glassCardVariantsReducedMotion : motionVariants;

    return (
      <motion.div
        ref={ref}
        variants={hover ? variants : undefined}
        initial="initial"
        whileHover={hover ? "hover" : undefined}
        whileTap={hover ? "tap" : undefined}
        className={cn(
          glassCardVariants({ variant, glow, padding }),
          animated && "animate-liquid-glow",
          className
        )}
        {...props}
      >
        <div className="absolute inset-0 bg-gradient-mesh-subtle opacity-50 pointer-events-none" />
        <div className="relative z-10">{children}</div>
      </motion.div>
    );
  }
);
GlassCard.displayName = "GlassCard";

const GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5", className)}
    {...props}
  />
));
GlassCardHeader.displayName = "GlassCardHeader";

const GlassCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 dark:from-purple-400 dark:via-pink-400 dark:to-blue-400 bg-clip-text text-transparent",
      className
    )}
    {...props}
  />
));
GlassCardTitle.displayName = "GlassCardTitle";

const GlassCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
GlassCardDescription.displayName = "GlassCardDescription";

const GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("pt-0", className)} {...props} />
));
GlassCardContent.displayName = "GlassCardContent";

const GlassCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-6", className)}
    {...props}
  />
));
GlassCardFooter.displayName = "GlassCardFooter";

export {
  GlassCard,
  GlassCardHeader,
  GlassCardFooter,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
};
