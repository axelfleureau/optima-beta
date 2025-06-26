import { createSlice, type PayloadAction, createAsyncThunk } from "@reduxjs/toolkit"
import type { Task } from "@/lib/types" // Assicurati che i tipi siano corretti
import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase" // Assicurati che il path sia corretto

interface TasksState {
  tasks: Task[]
  loading: boolean
  error: string | null
  selectedTask: Task | null
}

const initialState: TasksState = {
  tasks: [],
  loading: false,
  error: null,
  selectedTask: null,
}

export const fetchTasksByClient = createAsyncThunk(
  "tasks/fetchByClient",
  async (clientId: string, { rejectWithValue }) => {
    try {
      const tasksQuery = query(collection(db, "tasks"), where("clientId", "==", clientId))
      const querySnapshot = await getDocs(tasksQuery)
      const tasks = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Task)
      return tasks
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  },
)

export const addTask = createAsyncThunk(
  "tasks/addTask",
  async (
    taskData: Omit<Task, "id" | "createdAt" | "updatedAt" | "comments" | "subItems" | "attachments"> & {
      tenantId: string
      clientId: string // Assicurati che clientId sia passato
    },
    { rejectWithValue },
  ) => {
    try {
      const newTaskData = {
        ...taskData,
        comments: [],
        subItems: [],
        attachments: [],
        status: taskData.status || "todo", // Default status
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const docRef = await addDoc(collection(db, "tasks"), newTaskData)
      return { id: docRef.id, ...newTaskData } as Task
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  },
)

export const updateTask = createAsyncThunk(
  "tasks/updateTask",
  async (taskData: Partial<Task> & { id: string }, { rejectWithValue }) => {
    try {
      const { id, ...dataToUpdate } = taskData
      const taskDocRef = doc(db, "tasks", id)
      await updateDoc(taskDocRef, { ...dataToUpdate, updatedAt: new Date() })
      return { id, ...dataToUpdate, updatedAt: new Date().toISOString() } as Partial<Task> & { id: string }
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  },
)

export const deleteTask = createAsyncThunk("tasks/deleteTask", async (taskId: string, { rejectWithValue }) => {
  try {
    const taskDocRef = doc(db, "tasks", taskId)
    await deleteDoc(taskDocRef)
    return taskId
  } catch (error: any) {
    return rejectWithValue(error.message)
  }
})

export const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    setSelectedTask: (state, action: PayloadAction<Task | null>) => {
      state.selectedTask = action.payload
    },
    updateLocalTaskOptimistic: (state, action: PayloadAction<Partial<Task> & { id: string }>) => {
      const index = state.tasks.findIndex((t) => t.id === action.payload.id)
      if (index !== -1) {
        state.tasks[index] = { ...state.tasks[index], ...action.payload }
      }
      if (state.selectedTask?.id === action.payload.id) {
        state.selectedTask = { ...state.selectedTask, ...action.payload } as Task
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasksByClient.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTasksByClient.fulfilled, (state, action: PayloadAction<Task[]>) => {
        state.loading = false
        state.tasks = action.payload
      })
      .addCase(fetchTasksByClient.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(addTask.fulfilled, (state, action: PayloadAction<Task>) => {
        state.tasks.push(action.payload)
      })
      .addCase(addTask.rejected, (state, action) => {
        state.error = action.payload as string
      })
      .addCase(updateTask.fulfilled, (state, action: PayloadAction<Partial<Task> & { id: string }>) => {
        const index = state.tasks.findIndex((t) => t.id === action.payload.id)
        if (index !== -1) {
          state.tasks[index] = { ...state.tasks[index], ...action.payload }
        }
        if (state.selectedTask?.id === action.payload.id) {
          state.selectedTask = { ...state.selectedTask, ...action.payload } as Task
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.error = action.payload as string
      })
      .addCase(deleteTask.fulfilled, (state, action: PayloadAction<string>) => {
        state.tasks = state.tasks.filter((t) => t.id !== action.payload)
        if (state.selectedTask?.id === action.payload) {
          state.selectedTask = null
        }
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.error = action.payload as string
      })
  },
})

export const { setSelectedTask, updateLocalTaskOptimistic } = tasksSlice.actions

export const selectAllTasks = (state: { tasks: TasksState }) => state.tasks.tasks
export const selectTaskById = (state: { tasks: TasksState }, taskId: string) =>
  state.tasks.tasks.find((task) => task.id === taskId)
export const selectTasksLoading = (state: { tasks: TasksState }) => state.tasks.loading
export const selectTasksError = (state: { tasks: TasksState }) => state.tasks.error
export const selectCurrentSelectedTask = (state: { tasks: TasksState }) => state.tasks.selectedTask

export default tasksSlice.reducer
