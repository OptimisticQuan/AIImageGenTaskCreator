// src/services/api.ts

import axios from 'axios'
import { AppSettings, Task, UploadedImage } from '../types'

export class APIService {
  private settings: AppSettings

  constructor(settings: AppSettings) {
    this.settings = settings
  }

  updateSettings(settings: AppSettings) {
    this.settings = settings
  }

  async createTasksFromPrompt(mainPrompt: string, uploadedImages: UploadedImage[]): Promise<Task[]> {
    try {
      const systemPrompt = `
You are an AI assistant that helps create multiple image generation tasks from a user's main prompt and uploaded reference images.

Given a main prompt and potentially some reference images, create multiple specific prompts for image generation.

Requirements:
1. Generate 3-8 specific prompts based on the main prompt
2. Each prompt should be detailed and specific for image generation
3. Consider different styles, compositions, or variations
4. If reference images are provided, incorporate visual elements from them
5. Return a JSON array of objects with this structure: [{"prompt": "detailed prompt text"}]

Main prompt: "${mainPrompt}"
Reference images count: ${uploadedImages.length}

Return only valid JSON array, no additional text.`

      const response = await axios.post(
        this.settings.llm.baseUrl,
        {
          model: this.settings.llm.modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: mainPrompt }
          ],
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.settings.llm.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const content = response.data.choices[0].message.content
      let parsedTasks: { prompt: string }[]
      
      try {
        parsedTasks = JSON.parse(content)
      } catch (parseError) {
        // Fallback: try to extract JSON from the response
        const jsonMatch = content.match(/\[.*\]/s)
        if (jsonMatch) {
          parsedTasks = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('Failed to parse LLM response as JSON')
        }
      }

      const tasks: Task[] = parsedTasks.map((taskData, index) => ({
        id: crypto.randomUUID(),
        originalPrompt: mainPrompt,
        prompt: taskData.prompt,
        attachedImageIds: uploadedImages.map(img => img.id),
        status: 'idle' as const,
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
      if (this.settings.imageGeneration.supplier === 'StableDiffusionWebUI') {
        return await this.generateWithStableDiffusion(task, uploadedImages)
      } else if (this.settings.imageGeneration.supplier === 'OpenAI') {
        return await this.generateWithOpenAI(task)
      } else {
        throw new Error(`Unsupported image generation supplier: ${this.settings.imageGeneration.supplier}`)
      }
    } catch (error) {
      console.error('Error generating image:', error)
      throw error
    }
  }

  private async generateWithStableDiffusion(task: Task, uploadedImages: UploadedImage[]): Promise<string[]> {
    const endpoint = task.attachedImageIds && task.attachedImageIds.length > 0 
      ? `${this.settings.imageGeneration.baseUrl}/sdapi/v1/img2img`
      : `${this.settings.imageGeneration.baseUrl}/sdapi/v1/txt2img`

    const payload: any = {
      prompt: task.prompt,
      steps: 20,
      sampler_name: "DPM++ 2M",
      cfg_scale: 7,
      width: 512,
      height: 512,
      batch_size: 1,
      n_iter: 4, // Generate 4 images
    }

    if (this.settings.imageGeneration.modelName) {
      // Note: Setting model in SD WebUI requires additional API call
      // For simplicity, we'll assume the model is already loaded
    }

    if (task.attachedImageIds && task.attachedImageIds.length > 0) {
      // For img2img, we need to include the first uploaded image as base64
      const baseImage = uploadedImages.find(img => img.id === task.attachedImageIds![0])
      if (baseImage) {
        const base64 = await this.fileToBase64(baseImage.file)
        payload.init_images = [base64]
        payload.denoising_strength = 0.7
      }
    }

    const response = await axios.post(endpoint, payload)
    
    // Convert base64 images to blob URLs
    const imageUrls = response.data.images.map((base64Image: string) => {
      const byteCharacters = atob(base64Image)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'image/png' })
      return URL.createObjectURL(blob)
    })

    return imageUrls
  }

  private async generateWithOpenAI(task: Task): Promise<string[]> {
    const response = await axios.post(
      this.settings.imageGeneration.baseUrl,
      {
        model: this.settings.imageGeneration.modelName || "dall-e-3",
        prompt: task.prompt,
        n: 1, // DALL-E 3 only supports n=1
        size: "1024x1024",
        quality: "standard"
      },
      {
        headers: {
          'Authorization': `Bearer ${this.settings.imageGeneration.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data.data.map((image: any) => image.url)
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data:image/...;base64, prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}
