import { AppSettings, Task, UploadedImage, TaskStatus } from '../types'
import { LLMService } from './llm/llmService'
import { 
  BaseImageGenerator, 
  ImageGeneratorFactory, 
  GenerationProgress, 
  GenerationResult,
  EImageGenerationProvider
} from './imageGeneration/factory'

export class APIService {
  private settings: AppSettings
  private llmService: LLMService
  private taskGenerators: Map<string, BaseImageGenerator> = new Map()

  constructor(settings: AppSettings) {
    this.settings = settings
    this.llmService = new LLMService({
      apiKey: settings.llm.apiKey,
      baseURL: settings.llm.baseUrl,
      modelName: settings.llm.modelName
    })
  }

  updateSettings(settings: AppSettings) {
    this.settings = settings
    this.llmService.updateConfig({
      apiKey: settings.llm.apiKey,
      baseURL: settings.llm.baseUrl,
      modelName: settings.llm.modelName
    })
    // Clear existing generators as settings changed
    this.taskGenerators.clear()
  }

  createTaskGenerator(
    taskId: string,
    onProgress: (progress: GenerationProgress) => void,
    onComplete: (result: GenerationResult) => void
  ): BaseImageGenerator {
    try {
      const provider = this.settings.imageGeneration.supplier === 'StableDiffusionWebUI' 
        ? EImageGenerationProvider.StableDiffusion
        : this.settings.imageGeneration.supplier === 'Tuzi'
        ? EImageGenerationProvider.Tuzi
        : EImageGenerationProvider.OpenAI

      const generator = ImageGeneratorFactory.create({
        provider,
        apiKey: this.settings.imageGeneration.apiKey,
        baseURL: this.settings.imageGeneration.baseUrl,
        modelName: this.settings.imageGeneration.modelName
      })

      generator.setProgressCallback(onProgress)
      generator.setCompleteCallback(onComplete)

      this.taskGenerators.set(taskId, generator)
      return generator
    } catch (error) {
      console.error('Failed to create task generator:', error)
      throw error
    }
  }

  getTaskGenerator(taskId: string): BaseImageGenerator | undefined {
    return this.taskGenerators.get(taskId)
  }

  removeTaskGenerator(taskId: string): void {
    this.taskGenerators.delete(taskId)
  }

  clearAllGenerators(): void {
    this.taskGenerators.clear()
  }

  async createTasksFromPrompt(mainPrompt: string, uploadedImages: UploadedImage[]): Promise<Task[]> {
    try {
      const taskPrompts = await this.llmService.createTasksFromPrompt({
        mainPrompt,
        uploadedImagesCount: uploadedImages.length,
      })

      const tasks: Task[] = taskPrompts.map((taskData) => ({
        id: crypto.randomUUID(),
        originalPrompt: mainPrompt,
        prompt: taskData.prompt,
        attachedImageIds: taskData.imageIndexs?.map(index => uploadedImages[index]?.id) || [],
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
      const generator = this.getTaskGenerator(task.id)
      if (!generator) {
        throw new Error('Task generator not found')
      }

      const attachedFiles = task.attachedImageIds 
        ? uploadedImages.filter(img => task.attachedImageIds?.includes(img.id)).map(img => img.file)
        : []

      const imageUrls = await generator.generateImages(task.id, {
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
