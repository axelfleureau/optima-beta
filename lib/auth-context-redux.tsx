/**
 * Auth Context Redux - Compatibility Layer
 *
 * This provides backward compatibility with the existing auth-context.tsx interface
 * while internally using the new Redux MVVM architecture.
 *
 * This allows for gradual migration without breaking existing code.
 */

"use client";

import type React from "react";
import { createContext, useContext, useEffect, useCallback } from "react";
import { type User as FirebaseUser } from "firebase/auth";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import {
  hasPermission,
  canManageUser,
  canAssignTaskTo,
  getAssignableRoles,
  getManageableRoles,
  canViewResource,
  getRoleDisplayName,
  getRoleColor,
  type UserRole,
} from "@/lib/role-hierarchy";
import {
  useAuthViewModel,
  useAuthStatus,
  useAuthUser,
  useAuthActions,
} from "@/hooks/viewmodels";

// Legacy interface - maintained for backward compatibility
interface AuthContextType {
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isDirezione: boolean;
  isCapoReparto: boolean;
  isJunior: boolean;
  isClient: boolean;
  isSuspended: boolean;
  signOut: () => Promise<void>;
  // Role hierarchy functions
  hasPermission: (permission: any) => boolean;
  canManageUser: (targetRole: UserRole) => boolean;
  canAssignTaskTo: (assigneeRole: UserRole) => boolean;
  getAssignableRoles: () => UserRole[];
  getManageableRoles: () => UserRole[];
  canViewResource: (resourceOwnerId: string) => boolean;
  getRoleDisplayName: () => string;
  getRoleColor: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Use Redux-based ViewModels internally
  const {
    isAuthenticated,
    isInitialized,
    loading: authLoading,
  } = useAuthStatus();
  const { user: reduxUser, ...roleHelpers } = useAuthUser();
  const { signOut: reduxSignOut, initialize } = useAuthActions();

  // Initialize auth on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Automatic redirects for client users
  useEffect(() => {
    if (!authLoading && reduxUser && roleHelpers.isClient) {
      const currentPath = window.location.pathname;
      const allowedClientPaths = [
        "/workspace",
        "/crediti",
        "/ai-assistant",
        "/login",
        "/register",
        "/suspended",
      ];

      if (!allowedClientPaths.some((path) => currentPath.startsWith(path))) {
        router.push("/workspace");
      }
    }
  }, [reduxUser, roleHelpers.isClient, authLoading, router]);

  // Redirect for suspended accounts
  useEffect(() => {
    if (
      !authLoading &&
      reduxUser &&
      roleHelpers.isSuspended &&
      window.location.pathname !== "/suspended"
    ) {
      router.push("/suspended");
    }
  }, [reduxUser, roleHelpers.isSuspended, authLoading, router]);

  // Handle successful authentication redirect
  useEffect(() => {
    if (isAuthenticated && reduxUser && !roleHelpers.isSuspended) {
      if (
        typeof window !== "undefined" &&
        window.location.pathname === "/login"
      ) {
        window.dispatchEvent(new CustomEvent("auth-success"));
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, reduxUser, roleHelpers.isSuspended, router]);

  // Legacy signOut function
  const signOut = useCallback(async () => {
    try {
      await reduxSignOut();
      router.push("/login");
    } catch (error) {
      console.error("Errore nel logout:", error);
    }
  }, [reduxSignOut, router]);

  // Convert Redux user to legacy format
  const legacyUser: FirebaseUser | null = reduxUser
    ? ({
        uid: reduxUser.id,
        email: reduxUser.email,
        emailVerified: true, // Assume verified for existing users
        displayName: `${reduxUser.firstName} ${reduxUser.lastName}`,
        photoURL: null,
        phoneNumber: null,
        providerId: "firebase",
        tenantId: reduxUser.tenantId,
        metadata: {
          creationTime: reduxUser.createdAt.toString(),
          lastSignInTime: new Date().toString(),
        },
        // Add Firebase User methods as no-ops for compatibility
        getIdToken: async () => "",
        getIdTokenResult: async () => ({}) as any,
        reload: async () => {},
        toJSON: () => ({}),
        delete: async () => {},
        isAnonymous: false,
        providerData: [],
        refreshToken: "",
      } as FirebaseUser)
    : null;

  // Convert Redux user to legacy userData format
  const legacyUserData: User | null = reduxUser
    ? {
        id: reduxUser.id,
        email: reduxUser.email,
        firstName: reduxUser.firstName,
        lastName: reduxUser.lastName,
        role: reduxUser.role,
        tenantId: reduxUser.tenantId,
        parentTenantId: reduxUser.parentTenantId,
        clientId: reduxUser.clientId,
        companyName: reduxUser.companyName,
        createdAt: reduxUser.createdAt,
        updatedAt: reduxUser.updatedAt,
        aiTokensUsed: reduxUser.aiTokensUsed,
        aiTokensLimit: reduxUser.aiTokensLimit,
        isSuspended: reduxUser.isSuspended,
        assignedClientIds: reduxUser.assignedClientIds,
        plan: reduxUser.plan,
      }
    : null;

  // Role hierarchy helper functions (using existing role-hierarchy module)
  const userRole = legacyUserData?.role as UserRole;
  const userId = legacyUserData?.id || "";

  const roleHelpersLegacy = {
    hasPermission: (permission: any) =>
      userRole ? hasPermission(userRole, permission) : false,
    canManageUser: (targetRole: UserRole) =>
      userRole ? canManageUser(userRole, targetRole) : false,
    canAssignTaskTo: (assigneeRole: UserRole) =>
      userRole ? canAssignTaskTo(userRole, assigneeRole) : false,
    getAssignableRoles: () => (userRole ? getAssignableRoles(userRole) : []),
    getManageableRoles: () => (userRole ? getManageableRoles(userRole) : []),
    canViewResource: (resourceOwnerId: string) =>
      userRole ? canViewResource(userRole, resourceOwnerId, userId) : false,
    getRoleDisplayName: () => (userRole ? getRoleDisplayName(userRole) : ""),
    getRoleColor: () => (userRole ? getRoleColor(userRole) : ""),
  };

  // Build legacy context value
  const value: AuthContextType = {
    user: legacyUser,
    userData: legacyUserData,
    loading: authLoading,
    isSuperAdmin: roleHelpers.isSuperAdmin,
    isAdmin: roleHelpers.isAdmin,
    isDirezione: roleHelpers.isDirezione,
    isCapoReparto: roleHelpers.isCapoReparto,
    isJunior: roleHelpers.isJunior,
    isClient: roleHelpers.isClient,
    isSuspended: roleHelpers.isSuspended,
    signOut,
    ...roleHelpersLegacy,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Migration utilities for gradual transition
 */

// Helper to check if using legacy auth context
export function isUsingLegacyAuth() {
  try {
    const context = useContext(AuthContext);
    return context !== undefined;
  } catch {
    return false;
  }
}

// Hook that provides both legacy and new auth interfaces
export function useAuthBridge() {
  const legacyAuth = useAuth();
  const newAuth = useAuthViewModel();

  return {
    legacy: legacyAuth,
    redux: newAuth,
    // Utility to check which implementation is active
    isLegacy: true, // This will be true when using this compatibility layer
    isRedux: false,
  };
}

/**
 * Higher-order component for gradual migration
 */
export function withAuthCompatibility<P extends object>(
  Component: React.ComponentType<P>,
  useRedux = false,
) {
  return function AuthCompatibilityWrapper(props: P) {
    if (useRedux) {
      // Use Redux auth directly (for new components)
      return <Component {...props} />;
    } else {
      // Use legacy auth context (for existing components)
      return (
        <AuthProvider>
          <Component {...props} />
        </AuthProvider>
      );
    }
  };
}
