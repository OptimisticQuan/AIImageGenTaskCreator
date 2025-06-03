// src/services/llm/llmService.ts

import OpenAI from 'openai'

export interface LLMConfig {
  apiKey: string
  baseURL?: string
  modelName?: string
}

export interface CreateTasksOptions {
  mainPrompt: string
  uploadedImagesCount: number
}

export interface TaskPromptOriginal {
  prompt: string,
  attachment: string[]
}

export interface TaskPrompt {
  prompt: string,
  imageIndexs?: number[] // 可选，表示关联的图片索引
}

export class LLMService {
  private client: OpenAI
  private config: LLMConfig

  constructor(config: LLMConfig) {
    this.config = config
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      dangerouslyAllowBrowser: true
    })
  }

  updateConfig(config: LLMConfig) {
    this.config = config
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      dangerouslyAllowBrowser: true
    })
  }

  async createTasksFromPrompt(options: CreateTasksOptions): Promise<TaskPrompt[]> {
    try {
      const { mainPrompt, uploadedImagesCount} = options
      const prompt = `你是AI批量任务创建助手。请根据用户提示词及可选的参考图，生成JSON任务列表。
输出JSON Codeblock。每个任务对象有 "prompt" 字段；若用图，则有 "attachment" 字段（含文件名数组）。

核心逻辑：
1.  **解读用户意图**：分析用户提示词（###包裹部分）以确定：
    *   是否需要参考图。
    *   若无参考图，则按描述生成纯文本任务。
    *   若有参考图，是为每个图生成独立任务，还是将多个图组合成一个任务。
2.  **构建任务**：
    *   **纯文本任务**：只有 "prompt" 字段。
    *   **单图任务** (e.g., "所有图片转风格A")：为每个上传图片生成一个任务。"attachment" 含单个文件名。"prompt" 中用 "图1" 指代该附件。
    *   **多图组合任务** (e.g., "图A风格画图B")：根据提示词组合图片。"attachment" 含多个文件名。"prompt" 中用 "图n" (n从1开始) 指代附件列表中的第n张图 (如 "图1", "图2")。

重要："图n" 始终指代当前任务 "attachment" 列表中的第 n 个文件。

示例1 (纯文本，多任务):
用户提示词: 用吉卜力、像素风、赛博朋克风分别生一个女孩
输出:
\`\`\`json
[{
  "prompt": "吉卜力风格的女孩"
}, {
  "prompt": "像素风格的女孩"
}, {
  "prompt": "赛博朋克风格的女孩"
}]
\`\`\`

示例2 (单图任务，批量处理):
用户文件: ["0.png", "1.png"]
用户提示词: 将所有图片转为吉卜力风格
输出:
\`\`\`json
[{
  "prompt": "把图1转为吉卜力风格",
  "attachment": ["0.png"]
}, {
  "prompt": "把图1转为吉卜力风格",
  "attachment": ["1.png"]
}]
\`\`\`

示例3 (多图组合任务):
用户文件: ["0.png", "1.png", "2.png", "3.png"]
用户提示词: 将参考图两个一组，用第一张图的风格重绘第二张图
输出:
\`\`\`json
[{
  "prompt": "用图1的风格重绘图2",
  "attachment": ["0.png", "1.png"]
}, {
  "prompt": "用图1的风格重绘图2",
  "attachment": ["2.png", "3.png"]
}]
\`\`\`

用户提供的文件列表为：[${uploadedImagesCount > 0 ? Array.from({ length: uploadedImagesCount }, (_, i) => `"${i}.png"`).join(', ') : '[]'}]

用户提示词：
###
${mainPrompt}
###
`;

      const response = await this.client.chat.completions.create({
        model: this.config.modelName || 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 1,
        max_tokens: 2000
      })

      const content = response.choices[0]?.message?.content
      console.log('LLM response:', content)
      if (!content) {
        throw new Error('No response from LLM')
      }

      let parsedTasks: TaskPromptOriginal[]
      const trimedContent = content.replace(/```json|```/g, '').trim() // 移除代码块标记
      try {
        parsedTasks = JSON.parse(trimedContent)
      } catch (parseError) {
        // Fallback: try to extract JSON from the response
        const jsonMatch = trimedContent.match(/\[.*\]/s)
        if (jsonMatch) {
          parsedTasks = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('Failed to parse LLM response as JSON')
        }
      }

      // 验证返回的数据格式
      if (!Array.isArray(parsedTasks)) {
        throw new Error('LLM response is not an array')
      }

      // 确保每个任务都有 prompt 字段
      const validTasks = parsedTasks.filter(task => 
        task && typeof task === 'object' && typeof task.prompt === 'string' && task.prompt.trim()
      )

      if (validTasks.length === 0) {
        throw new Error('No valid tasks found in LLM response')
      }

      return validTasks.map(task => {
        const imageIndexs = task.attachment?.map((vImg) => parseInt(vImg.substring(0, vImg.length - 4))) || []
        return {
          prompt: task.prompt.trim(),
          imageIndexs: imageIndexs.length > 0 ? imageIndexs : undefined // 如果没有图片索引则不返回该字段
        }
      });
    } catch (error) {
      console.error('Error creating tasks from prompt:', error)
      throw new Error(`Failed to create tasks from prompt: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async improvePrompt(originalPrompt: string): Promise<string> {
    try {
      const systemPrompt = `
You are an expert at creating detailed, high-quality prompts for AI image generation.

Given a user's original prompt, enhance it to be more detailed and specific for better image generation results.

Guidelines:
1. Keep the original intent and subject matter
2. Add specific details about style, lighting, composition, colors
3. Include technical photography terms if appropriate
4. Make it more descriptive and vivid
5. Ensure the prompt is still concise and focused

Return only the improved prompt, no additional text or explanation.`

      const response = await this.client.chat.completions.create({
        model: this.config.modelName || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: originalPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })

      const improvedPrompt = response.choices[0]?.message?.content?.trim()
      if (!improvedPrompt) {
        throw new Error('No response from LLM')
      }

      return improvedPrompt
    } catch (error) {
      console.error('Error improving prompt:', error)
      // 如果改进失败，返回原始提示词
      return originalPrompt
    }
  }
}
