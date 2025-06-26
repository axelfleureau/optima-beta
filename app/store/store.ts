import { configureStore } from "@reduxjs/toolkit"
import tasksReducer from "./slices/tasks-slice" // Default export
import authReducer from "./slices/auth-slice" // Default export
import clientsReducer from "./slices/clients-slice" // Default export
// Importa altre slice e API RTK Query qui

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: tasksReducer,
    clients: clientsReducer,
    // [api.reducerPath]: api.reducer, // Esempio per RTK Query
  },
  // middleware: (getDefaultMiddleware) =>
  //   getDefaultMiddleware().concat(api.middleware), // Esempio per RTK Query
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
