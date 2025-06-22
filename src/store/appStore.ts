// src/store/index.ts

import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import type { AppSettings, Task, UploadedImage } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { APIService } from '../services/api'

interface AppState {
  // Settings
  settings: AppSettings
  updateSettings: (newSettings: AppSettings) => void

  // Theme management
  toggleTheme: () => void

  // Mobile UI state
  isMobile: boolean
  setIsMobile: (isMobile: boolean) => void
  mobileActiveTab: 'input' | 'tasks'
  setMobileActiveTab: (tab: 'input' | 'tasks') => void

  // Main prompt input state
  mainPrompt: string
  setMainPrompt: (prompt: string) => void
  isCreatingTasks: boolean
  setIsCreatingTasks: (isCreating: boolean) => void

  // Uploaded Images for current input
  currentUploadedImages: UploadedImage[]
  addCurrentUploadedImage: (image: UploadedImage) => void
  removeCurrentUploadedImage: (id: string) => void
  setCurrentUploadedImages: (images: UploadedImage[]) => void
  clearCurrentUploadedImages: () => void
  reorderCurrentUploadedImages: (draggedId: string, targetId: string) => void

  // Uploaded Images (persistent storage)
  uploadedImages: UploadedImage[]
  addUploadedImage: (image: UploadedImage) => void
  addUploadedImages: (images: UploadedImage[]) => void
  removeUploadedImage: (id: string) => void
  clearUploadedImages: () => void

  // Tasks
  tasks: Task[]
  addTasks: (newTasks: Task[]) => void
  updateTask: (taskId: string, updates: Partial<Task>) => void
  deleteTask: (taskId: string) => void
  clearTasks: () => void

  // Processing state
  isProcessing: boolean
  setIsProcessing: (isProcessing: boolean) => void

  // Modal states
  isSettingsModalOpen: boolean
  setIsSettingsModalOpen: (isOpen: boolean) => void
  
  isImagePreviewModalOpen: boolean
  setIsImagePreviewModalOpen: (isOpen: boolean) => void
  previewTaskIndex: number
  previewImageIndex: number
  setPreviewIndexes: (taskIndex: number, imageIndex: number) => void

  // API Service instance
  apiService: APIService | null
  initializeApiService: () => void
}

export const useAppStore = create<AppState>()(
  devtools(persist(
    (set, get) => ({
      // Settings
      settings: DEFAULT_SETTINGS,

      // Mobile UI state
      isMobile: false,
      mobileActiveTab: 'input',

      // Main prompt input state
      mainPrompt: '',
      isCreatingTasks: false,

      // Current uploaded images (for input area)
      currentUploadedImages: [],

      // Uploaded Images
      uploadedImages: [],

      // Tasks
      tasks: [],

      // Processing state
      isProcessing: false,

      // Modal states
      isSettingsModalOpen: false,
      isImagePreviewModalOpen: false,
      previewTaskIndex: 0,
      previewImageIndex: 0,

      // API Service instance
      apiService: null,

      updateSettings: (newSettings: AppSettings) => {
        set({ settings: newSettings })
        const { apiService } = get()
        if (apiService) {
          apiService.updateSettings(newSettings)
        }
        // Apply theme to document
        if (newSettings.common?.theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },
      toggleTheme: () => {
        set(state => {
          const currentTheme = state.settings.common?.theme || 'light'
          const newTheme: 'light' | 'dark' = currentTheme === 'light' ? 'dark' : 'light'
          const newSettings = {
            ...state.settings,
            common: {
              batchSize: state.settings.common?.batchSize || DEFAULT_SETTINGS.common?.batchSize || 2,
              theme: newTheme
            }
          }
          
          // Apply theme to document
          if (newTheme === 'dark') {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
          
          return { settings: newSettings }
        })
      },
      setIsMobile: (isMobile: boolean) => {
        set({ isMobile })
      },
      setMobileActiveTab: (tab: 'input' | 'tasks') => {
        set({ mobileActiveTab: tab })
      },
      setMainPrompt: (prompt: string) => {
        set({ mainPrompt: prompt })
      },
      setIsCreatingTasks: (isCreating: boolean) => {
        set({ isCreatingTasks: isCreating })
      },
      addCurrentUploadedImage: (image: UploadedImage) => {
        set(state => {
          if (state.currentUploadedImages.some(img => img.id === image.id)) {
            return {}
          }
          return {
            currentUploadedImages: [...state.currentUploadedImages, image]
          }
        })
      },
      removeCurrentUploadedImage: (id: string) => {
        set(state => ({
          currentUploadedImages: state.currentUploadedImages.filter(img => img.id !== id)
        }))
      },
      setCurrentUploadedImages: (images: UploadedImage[]) => {
        set({ currentUploadedImages: images })
      },
      clearCurrentUploadedImages: () => {
        set({ currentUploadedImages: [] })
      },
      reorderCurrentUploadedImages: (draggedId: string, targetId: string) => {
        set(state => {
          const draggedIndex = state.currentUploadedImages.findIndex(img => img.id === draggedId)
          const targetIndex = state.currentUploadedImages.findIndex(img => img.id === targetId)
          
          if (draggedIndex !== -1 && targetIndex !== -1) {
            const newImages = [...state.currentUploadedImages]
            const [draggedImage] = newImages.splice(draggedIndex, 1)
            newImages.splice(targetIndex, 0, draggedImage)
            return { currentUploadedImages: newImages }
          }
          return {}
        })
      },
      addUploadedImage: (image: UploadedImage) => {
        set(state => {
          if (state.uploadedImages.some(img => img.id === image.id)) {
            // If image already exists, update it
            return {}
          }
          return ({
            uploadedImages: [...state.uploadedImages, image]
          })
        })
      },
      addUploadedImages: (images: UploadedImage[]) => {
        set(state => {
          const existingIds = new Set(state.uploadedImages.map(img => img.id))
          const newImages = images.filter(img => !existingIds.has(img.id))
          if (newImages.length === 0) {
            // If all images already exist, do nothing
            return {}
          }
          return ({
            uploadedImages: [...state.uploadedImages, ...images]
          })
        })
      },
      removeUploadedImage: (id: string) => {
        set(state => ({
          uploadedImages: state.uploadedImages.filter(img => img.id !== id)
        }))
      },
      clearUploadedImages: () => {
        set({ uploadedImages: [] })
      },
      addTasks: (newTasks: Task[]) => {
        set(state => ({
          tasks: [...state.tasks, ...newTasks]
        }))
      },
      updateTask: (taskId: string, updates: Partial<Task>) => {
        set(state => ({
          tasks: state.tasks.map(task => 
            task.id === taskId ? { ...task, ...updates } : task
          )
        }))
      },
      deleteTask: (taskId: string) => {
        set(state => ({
          tasks: state.tasks.filter(task => task.id !== taskId)
        }))
      },
      clearTasks: () => {
        set({ tasks: [] })
      },
      setIsProcessing: (isProcessing: boolean) => {
        set({ isProcessing })
      },
      setIsSettingsModalOpen: (isOpen: boolean) => {
        set({ isSettingsModalOpen: isOpen })
      },
      setIsImagePreviewModalOpen: (isOpen: boolean) => {
        set({ isImagePreviewModalOpen: isOpen })
      },
      setPreviewIndexes: (taskIndex: number, imageIndex: number) => {
        set({ previewTaskIndex: taskIndex, previewImageIndex: imageIndex })
      },
      initializeApiService: () => {
        const { settings } = get()
        const apiService = new APIService(settings)
        set({ apiService })
      },
    }),
    {
      name: 'ai-image-gen-storage',
      version: 1,
      // Only persist settings, not temporary data like tasks and images
      partialize: (state) => ({ 
        settings: state.settings,
        mainPrompt: state.mainPrompt,
        currentUploadedImages: state.currentUploadedImages
      }),
      // Merge function to handle potential schema changes
      merge: (persistedState, currentState) => ({
        ...currentState,
        settings: {
          ...DEFAULT_SETTINGS,
          ...(persistedState as any)?.settings,
        },
      }),
      // Handle storage errors gracefully
      onRehydrateStorage: () => (state) => {
        if (state && !state.settings) {
          state.settings = DEFAULT_SETTINGS
        }
      },
    }
  ))
)
