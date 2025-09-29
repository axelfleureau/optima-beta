# Auth Migration Guide - From Context to Redux MVVM

## Overview

This guide explains how to migrate from the legacy `auth-context.tsx` to the new Redux MVVM architecture gradually without breaking existing functionality.

## Architecture Overview

### Legacy Architecture
```
auth-context.tsx → useAuth() → Components
```

### New Architecture 
```
Redux Store → ViewModel Hooks → Components
lib/store/auth-slice.ts → hooks/viewmodels/use-auth-viewmodel.ts → Components
```

### Compatibility Layer
```
auth-context-redux.tsx → Redux Store → ViewModel Hooks
(Provides legacy useAuth() interface)
```

## Migration Strategy

### Phase 1: Setup Compatibility Layer ✅
- ✅ Redux store configured with middleware
- ✅ Enhanced auth slice with full MVVM support
- ✅ ViewModel hooks with memoization
- ✅ Firebase service abstraction
- ✅ Compatibility layer created

### Phase 2: Gradual Component Migration

#### Step 1: Enable Compatibility Layer
Replace `auth-context.tsx` imports with `auth-context-redux.tsx`:

```typescript
// OLD - lib/auth-context.tsx
import { useAuth } from "@/lib/auth-context"

// NEW - lib/auth-context-redux.tsx  
import { useAuth } from "@/lib/auth-context-redux"
```

#### Step 2: Test Existing Components
All existing components using `useAuth()` should work without changes:

```typescript
function ExistingComponent() {
  const { user, userData, isAdmin, signOut } = useAuth()
  // This continues to work exactly as before
}
```

#### Step 3: Migrate Components to Redux (Optional)
For new components or when refactoring, use ViewModel hooks directly:

```typescript
// Instead of useAuth()
import { useAuthViewModel } from "@/hooks/viewmodels"

function NewComponent() {
  const { user, isAuthenticated, signOut, hasPermission } = useAuthViewModel()
  // Modern Redux-based approach
}
```

#### Step 4: Fine-grained Performance Optimization
Use specialized hooks for better performance:

```typescript
import { 
  useAuthStatus,
  useAuthUser, 
  useAuthPermissions,
  useAuthActions 
} from "@/hooks/viewmodels"

function OptimizedComponent() {
  // Only re-renders when auth status changes
  const { isAuthenticated } = useAuthStatus()
  
  // Only re-renders when user data changes
  const { user, isAdmin } = useAuthUser()
  
  // Only re-renders when permissions change
  const { hasPermission } = useAuthPermissions()
  
  // Actions only (no state, no re-renders)
  const { signOut } = useAuthActions()
}
```

## Usage Examples

### 1. Legacy Compatibility (No Changes Required)
```typescript
// components/app-sidebar.tsx - works unchanged
export function AppSidebar() {
  const { userData, isSuperAdmin, isAdmin, signOut } = useAuth()
  // Existing code continues to work
}
```

### 2. Bridge Usage (Gradual Migration)
```typescript
import { useAuthBridge } from "@/lib/auth-context-redux"

function ComponentInTransition() {
  const { legacy, redux, isLegacy } = useAuthBridge()
  
  if (isLegacy) {
    // Use legacy interface
    const { userData } = legacy
  } else {
    // Use Redux interface  
    const { user } = redux
  }
}
```

### 3. Full Redux MVVM (New Components)
```typescript
import { useAuthViewModel } from "@/hooks/viewmodels"

function ModernComponent() {
  const {
    user,
    isAuthenticated,
    loading,
    permissions,
    hasPermission,
    signOut
  } = useAuthViewModel()
  
  const canCreateUsers = hasPermission('canInviteUsers')
  
  return (
    <div>
      {isAuthenticated && user && (
        <div>
          Welcome {user.firstName}!
          {canCreateUsers && <button>Create User</button>}
        </div>
      )}
    </div>
  )
}
```

## Key Benefits

### Performance Optimizations
1. **Memoized Selectors**: All selectors use `shallowEqual` for optimal re-renders
2. **Granular Subscriptions**: Components only re-render for relevant state changes
3. **Specialized Hooks**: Use only what you need (status, user, permissions, etc.)

### Type Safety
1. **Strict TypeScript**: Complete type coverage for auth state
2. **Typed Permissions**: All permission checks are type-safe
3. **Role Validation**: Type-safe role hierarchy checking

### Developer Experience
1. **Redux DevTools**: Full state inspection and time-travel debugging
2. **Async State**: Built-in loading and error states for all operations
3. **Centralized Logic**: All auth logic in one place

## Testing Migration

### 1. Current Components (Should Work Unchanged)
- ✅ `components/app-sidebar.tsx`
- ✅ `components/protected-route.tsx`
- ✅ All pages using `useAuth()`

### 2. New Features (Use Redux MVVM)
- 🔄 New auth-related components
- 🔄 Performance-critical components
- 🔄 Components needing fine-grained permissions

## Rollback Plan

If issues arise, easily rollback by:

1. Restore original `auth-context.tsx` import
2. Remove Redux provider from layout
3. All existing functionality preserved

## Next Steps

1. ✅ Complete Phase 1 (Setup) 
2. 🔄 Test compatibility layer with existing components
3. 🔄 Migrate critical components to Redux MVVM
4. 🔄 Performance optimization for high-traffic components
5. 🔄 Complete migration and remove legacy layer

## Performance Monitoring

Monitor these metrics during migration:
- Component re-render frequency
- Auth state update latency  
- Memory usage of auth state
- Error rates in auth operations