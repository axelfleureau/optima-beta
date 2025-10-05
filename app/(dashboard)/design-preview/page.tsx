"use client";

import * as React from "react";
import { 
  GlassCard, 
  GlassCardContent, 
  GlassCardDescription, 
  GlassCardFooter, 
  GlassCardHeader, 
  GlassCardTitle 
} from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { useTheme } from "next-themes";
import { Moon, Sun, Sparkles, Heart, Zap, Star, CheckCircle, XCircle } from "lucide-react";

export default function DesignPreviewPage() {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-mesh-purple p-8 space-y-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 dark:from-purple-400 dark:via-pink-400 dark:to-blue-400 bg-clip-text text-transparent mb-2">
              Liquid Glass Design System
            </h1>
            <p className="text-muted-foreground">
              Production-ready glassmorphic components for Optima platform
            </p>
          </div>
          
          <GlassButton
            variant="glass"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </GlassButton>
        </div>

        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">GlassCard Variants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <GlassCard variant="default">
                <GlassCardHeader>
                  <GlassCardTitle>Default Card</GlassCardTitle>
                  <GlassCardDescription>
                    Standard frosted glass effect with subtle border
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent>
                  <p className="text-sm text-muted-foreground">
                    Perfect for general content containers
                  </p>
                </GlassCardContent>
              </GlassCard>

              <GlassCard variant="elevated">
                <GlassCardHeader>
                  <GlassCardTitle>Elevated Card</GlassCardTitle>
                  <GlassCardDescription>
                    Enhanced glass with stronger shadows
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent>
                  <p className="text-sm text-muted-foreground">
                    Use for important content sections
                  </p>
                </GlassCardContent>
              </GlassCard>

              <GlassCard variant="interactive">
                <GlassCardHeader>
                  <GlassCardTitle>Interactive Card</GlassCardTitle>
                  <GlassCardDescription>
                    Clickable with hover glow effect
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent>
                  <p className="text-sm text-muted-foreground">
                    Hover me to see the effect!
                  </p>
                </GlassCardContent>
              </GlassCard>

              <GlassCard variant="gradient" animated>
                <GlassCardHeader>
                  <GlassCardTitle>Gradient Card</GlassCardTitle>
                  <GlassCardDescription>
                    AI-themed gradient with animation
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent>
                  <p className="text-sm text-muted-foreground">
                    Features animated glow effect
                  </p>
                </GlassCardContent>
              </GlassCard>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">GlassCard with Content</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard variant="elevated" glow="medium">
                <GlassCardHeader>
                  <GlassCardTitle>AI Assistant</GlassCardTitle>
                  <GlassCardDescription>
                    Powered by advanced language models
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm mb-1">Intelligent Responses</h4>
                      <p className="text-xs text-muted-foreground">
                        Get contextual answers powered by AI
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-pink-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm mb-1">Lightning Fast</h4>
                      <p className="text-xs text-muted-foreground">
                        Optimized for speed and performance
                      </p>
                    </div>
                  </div>
                </GlassCardContent>
                <GlassCardFooter>
                  <GlassButton variant="gradient" className="w-full">
                    <Sparkles className="h-4 w-4" />
                    Try AI Assistant
                  </GlassButton>
                </GlassCardFooter>
              </GlassCard>

              <GlassCard variant="gradient" padding="lg">
                <GlassCardHeader>
                  <GlassCardTitle>Premium Features</GlassCardTitle>
                  <GlassCardDescription>
                    Unlock the full potential of Optima
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Advanced AI capabilities</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Priority support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Custom integrations</span>
                  </div>
                </GlassCardContent>
                <GlassCardFooter>
                  <GlassButton variant="primary" className="w-full">
                    Upgrade Now
                  </GlassButton>
                </GlassCardFooter>
              </GlassCard>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">GlassButton Variants</h2>
            <GlassCard variant="elevated" padding="lg">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">Primary Buttons</h3>
                  <div className="flex flex-wrap gap-3">
                    <GlassButton variant="primary" size="sm">
                      Small
                    </GlassButton>
                    <GlassButton variant="primary">
                      <Star className="h-4 w-4" />
                      Default
                    </GlassButton>
                    <GlassButton variant="primary" size="lg">
                      Large
                    </GlassButton>
                    <GlassButton variant="primary" size="xl">
                      <Heart className="h-5 w-5" />
                      Extra Large
                    </GlassButton>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">All Variants</h3>
                  <div className="flex flex-wrap gap-3">
                    <GlassButton variant="primary">Primary</GlassButton>
                    <GlassButton variant="secondary">Secondary</GlassButton>
                    <GlassButton variant="ghost">Ghost</GlassButton>
                    <GlassButton variant="glass">Glass</GlassButton>
                    <GlassButton variant="gradient">
                      <Sparkles className="h-4 w-4" />
                      Gradient
                    </GlassButton>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">With Glow Effects</h3>
                  <div className="flex flex-wrap gap-3">
                    <GlassButton variant="glass" glow="subtle">
                      Subtle Glow
                    </GlassButton>
                    <GlassButton variant="glass" glow="medium">
                      Medium Glow
                    </GlassButton>
                    <GlassButton variant="glass" glow="strong">
                      Strong Glow
                    </GlassButton>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">Loading State</h3>
                  <div className="flex flex-wrap gap-3">
                    <GlassButton variant="primary" loading={loading} onClick={handleLoadingDemo}>
                      {loading ? "Processing..." : "Click to Load"}
                    </GlassButton>
                    <GlassButton variant="gradient" loading>
                      Always Loading
                    </GlassButton>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">States</h3>
                  <div className="flex flex-wrap gap-3">
                    <GlassButton variant="primary" disabled>
                      Disabled
                    </GlassButton>
                    <GlassButton variant="secondary" disabled>
                      Disabled
                    </GlassButton>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">GlassInput Variants</h2>
            <GlassCard variant="elevated" padding="lg">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassInput
                    variant="default"
                    label="Default Input"
                    placeholder="Enter text..."
                    helperText="This is a helper text"
                  />
                  <GlassInput
                    variant="glass"
                    label="Glass Input"
                    placeholder="Enhanced glass effect..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassInput
                    variant="gradient"
                    label="Gradient Input"
                    placeholder="With gradient border..."
                  />
                  <GlassInput
                    variant="default"
                    inputSize="lg"
                    label="Large Input"
                    placeholder="Larger size..."
                  />
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-4 text-muted-foreground">Floating Labels</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassInput
                      variant="glass"
                      label="Email Address"
                      placeholder="your@email.com"
                      floatingLabel
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <GlassInput
                      variant="glass"
                      label="Password"
                      type="password"
                      placeholder="••••••••"
                      floatingLabel
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-4 text-muted-foreground">Input States</h3>
                  <div className="space-y-4">
                    <GlassInput
                      variant="glass"
                      label="Success State"
                      placeholder="Valid input..."
                      success="Perfect! This input is valid."
                    />
                    <GlassInput
                      variant="glass"
                      label="Error State"
                      placeholder="Invalid input..."
                      error="Oops! Something went wrong."
                    />
                    <GlassInput
                      variant="glass"
                      label="Warning State"
                      placeholder="Warning input..."
                      state="warning"
                      helperText="Please review this input."
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Complete Form Example</h2>
            <GlassCard variant="gradient" padding="lg" glow="medium">
              <GlassCardHeader>
                <GlassCardTitle>Sign Up for AI Access</GlassCardTitle>
                <GlassCardDescription>
                  Join thousands of users leveraging AI-powered tools
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GlassInput
                    variant="glass"
                    label="First Name"
                    placeholder="John"
                    floatingLabel
                  />
                  <GlassInput
                    variant="glass"
                    label="Last Name"
                    placeholder="Doe"
                    floatingLabel
                  />
                </div>
                <GlassInput
                  variant="glass"
                  label="Email Address"
                  type="email"
                  placeholder="john@example.com"
                  floatingLabel
                />
                <GlassInput
                  variant="glass"
                  label="Password"
                  type="password"
                  placeholder="Create a strong password"
                  floatingLabel
                  helperText="Must be at least 8 characters"
                />
              </GlassCardContent>
              <GlassCardFooter className="flex flex-col gap-3">
                <GlassButton variant="primary" className="w-full" size="lg">
                  <Sparkles className="h-5 w-5" />
                  Create Account
                </GlassButton>
                <GlassButton variant="ghost" className="w-full">
                  Already have an account? Sign in
                </GlassButton>
              </GlassCardFooter>
            </GlassCard>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Interactive Showcase</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassCard variant="interactive" glow="subtle">
                <GlassCardHeader>
                  <div className="flex items-center justify-between">
                    <Star className="h-8 w-8 text-purple-500" />
                    <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      4.9
                    </span>
                  </div>
                  <GlassCardTitle>User Rating</GlassCardTitle>
                  <GlassCardDescription>
                    Based on 1,234 reviews
                  </GlassCardDescription>
                </GlassCardHeader>
              </GlassCard>

              <GlassCard variant="interactive" glow="subtle">
                <GlassCardHeader>
                  <div className="flex items-center justify-between">
                    <Zap className="h-8 w-8 text-pink-500" />
                    <span className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-blue-600 bg-clip-text text-transparent">
                      99.9%
                    </span>
                  </div>
                  <GlassCardTitle>Uptime</GlassCardTitle>
                  <GlassCardDescription>
                    Rock-solid reliability
                  </GlassCardDescription>
                </GlassCardHeader>
              </GlassCard>

              <GlassCard variant="interactive" glow="subtle">
                <GlassCardHeader>
                  <div className="flex items-center justify-between">
                    <Heart className="h-8 w-8 text-blue-500" />
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      10k+
                    </span>
                  </div>
                  <GlassCardTitle>Happy Users</GlassCardTitle>
                  <GlassCardDescription>
                    Growing community
                  </GlassCardDescription>
                </GlassCardHeader>
              </GlassCard>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
