// src/services/imageGeneration/base.ts

export interface GenerationProgress {
  taskId: string
  progress: number // 0-100
  stage: string // 'preparing' | 'generating' | 'processing' | 'completed'
  message?: string
}

export interface GenerationResult {
  taskId: string
  images: string[] // URLs or base64 data URLs
  success: boolean
  error?: string
}

export interface ImageGenerationOptions {
  prompt: string
  attachedImages?: File[]
  width?: number
  height?: number
  count?: number
  model?: string
  seed?: number
  steps?: number
  cfgScale?: number
  samplerName?: string
  denoisingStrength?: number
}

export abstract class BaseImageGenerator {
  protected onProgress?: (progress: GenerationProgress) => void
  protected onComplete?: (result: GenerationResult) => void

  setProgressCallback(callback: (progress: GenerationProgress) => void) {
    this.onProgress = callback
  }

  setCompleteCallback(callback: (result: GenerationResult) => void) {
    this.onComplete = callback
  }

  protected emitProgress(taskId: string, progress: number, stage: string, message?: string) {
    if (this.onProgress) {
      this.onProgress({ taskId, progress, stage, message })
    }
  }

  protected emitComplete(taskId: string, images: string[], success: boolean, error?: string) {
    if (this.onComplete) {
      this.onComplete({ taskId, images, success, error })
    }
  }

  abstract generateImages(taskId: string, options: ImageGenerationOptions): Promise<string[]>
  
  protected async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  protected base64ToBlob(base64: string, mimeType: string = 'image/png'): string {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mimeType })
    return URL.createObjectURL(blob)
  }
}
