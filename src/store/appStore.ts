// src/store/index.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings, Task, UploadedImage } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { APIService } from '../services/api'

interface AppState {
  // Settings
  settings: AppSettings
  updateSettings: (newSettings: AppSettings) => void

  // Uploaded Images
  uploadedImages: UploadedImage[]
  addUploadedImage: (image: UploadedImage) => void
  addUploadedImages: (images: UploadedImage[]) => void // Optional for batch uploads
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
  persist(
    (set, get) => ({
      // Settings
      settings: DEFAULT_SETTINGS,

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
      partialize: (state) => ({ settings: state.settings }),
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
  )
)
