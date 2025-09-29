import { configureStore } from "@reduxjs/toolkit"
import { combineReducers } from '@reduxjs/toolkit'
import tasksReducer from "./slices/tasks-slice"
import authReducer from "../../lib/store/auth-slice" 
import clientsReducer from "./slices/clients-slice"

// Combined reducers
const rootReducer = combineReducers({
  auth: authReducer,
  tasks: tasksReducer,
  clients: clientsReducer,
})

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Configure serializable check for Firebase Timestamps and Dates
      serializableCheck: {
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['auth.user.metadata'],
        // Allow Firebase timestamps
        isSerializable: (value: any) => {
          if (value instanceof Date) return true
          if (value?.constructor?.name === 'Timestamp') return true
          return true
        }
      },
      // Performance optimizations
      immutableCheck: {
        warnAfter: 32,
      },
      // Enhanced thunk configuration
      thunk: {
        extraArgument: {
          // Can add Firebase instances here if needed
        }
      }
    }),
  // Enable Redux DevTools only in development
  devTools: process.env.NODE_ENV !== 'production' && {
    name: 'Optima Redux Store',
    trace: true,
    traceLimit: 25,
  },
})

// Typed hooks for better TypeScript support
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Type-safe useSelector hook with performance optimization
import { useSelector, TypedUseSelectorHook } from 'react-redux'
import { shallowEqual } from 'react-redux'

export const useAppSelector: TypedUseSelectorHook<RootState> = (selector) => 
  useSelector(selector, shallowEqual)

// Type-safe useDispatch hook
import { useDispatch } from 'react-redux'
export const useAppDispatch = () => useDispatch<AppDispatch>()
