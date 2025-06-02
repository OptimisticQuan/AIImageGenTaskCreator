import { AppSettings, Task, UploadedImage, TaskStatus } from '../types'
import { LLMService } from './llm/llmService'
import { 
  BaseImageGenerator, 
  ImageGeneratorFactory, 
  GenerationProgress, 
  GenerationResult 
} from './imageGeneration/factory'

export class APIService {
  private settings: AppSettings
  private llmService: LLMService
  private imageGenerator: BaseImageGenerator | null = null
  private onProgress?: (progress: GenerationProgress) => void
  private onComplete?: (result: GenerationResult) => void

  constructor(settings: AppSettings) {
    this.settings = settings
    this.llmService = new LLMService({
      apiKey: settings.llm.apiKey,
      baseURL: settings.llm.baseUrl,
      modelName: settings.llm.modelName
    })
    this.initializeImageGenerator()
  }

  updateSettings(settings: AppSettings) {
    this.settings = settings
    this.llmService.updateConfig({
      apiKey: settings.llm.apiKey,
      baseURL: settings.llm.baseUrl,
      modelName: settings.llm.modelName
    })
    this.initializeImageGenerator()
  }

  setProgressCallback(callback: (progress: GenerationProgress) => void) {
    this.onProgress = callback
    if (this.imageGenerator) {
      this.imageGenerator.setProgressCallback(callback)
    }
  }

  setCompleteCallback(callback: (result: GenerationResult) => void) {
    this.onComplete = callback
    if (this.imageGenerator) {
      this.imageGenerator.setCompleteCallback(callback)
    }
  }

  private initializeImageGenerator() {
    try {
      const provider = this.settings.imageGeneration.supplier === 'StableDiffusionWebUI' 
        ? 'StableDiffusion' as const
        : this.settings.imageGeneration.supplier as 'OpenAI' | 'StableDiffusion'

      this.imageGenerator = ImageGeneratorFactory.create({
        provider,
        apiKey: this.settings.imageGeneration.apiKey,
        baseURL: this.settings.imageGeneration.baseUrl,
        modelName: this.settings.imageGeneration.modelName
      })

      if (this.onProgress) {
        this.imageGenerator.setProgressCallback(this.onProgress)
      }
      if (this.onComplete) {
        this.imageGenerator.setCompleteCallback(this.onComplete)
      }
    } catch (error) {
      console.error('Failed to initialize image generator:', error)
      this.imageGenerator = null
    }
  }

  async createTasksFromPrompt(mainPrompt: string, uploadedImages: UploadedImage[]): Promise<Task[]> {
    try {
      const taskPrompts = await this.llmService.createTasksFromPrompt({
        mainPrompt,
        uploadedImagesCount: uploadedImages.length,
        maxTasks: 8
      })

      const tasks: Task[] = taskPrompts.map((taskData) => ({
        id: crypto.randomUUID(),
        originalPrompt: mainPrompt,
        prompt: taskData.prompt,
        attachedImageIds: uploadedImages.map(img => img.id),
        status: TaskStatus.Idle,
        generatedImages: []
      }))

      return tasks
    } catch (error) {
      console.error('Error creating tasks from prompt:', error)
      throw new Error('Failed to create tasks from prompt')
    }
  }

  async generateImage(task: Task, uploadedImages: UploadedImage[]): Promise<string[]> {
    try {
      if (!this.imageGenerator) {
        throw new Error('Image generator not initialized')
      }

      const attachedFiles = task.attachedImageIds 
        ? uploadedImages.filter(img => task.attachedImageIds?.includes(img.id)).map(img => img.file)
        : []

      const imageUrls = await this.imageGenerator.generateImages(task.id, {
        prompt: task.prompt,
        attachedImages: attachedFiles,
        count: 4,
        width: 512,
        height: 512
      })

      return imageUrls
    } catch (error) {
      console.error('Error generating image:', error)
      throw error
    }
  }

  async improvePrompt(originalPrompt: string): Promise<string> {
    try {
      return await this.llmService.improvePrompt(originalPrompt)
    } catch (error) {
      console.error('Error improving prompt:', error)
      return originalPrompt
    }
  }
}
