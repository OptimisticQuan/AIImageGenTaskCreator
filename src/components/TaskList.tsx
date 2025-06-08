// src/components/TaskList.tsx

import React, { useCallback, useRef, useState, useEffect } from 'react'
import { PlayIcon, PauseIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useAppStore } from '../store/appStore'
import { TaskStatus } from '../types'
import type { GeneratedImage } from '../types'
import { GenerationProgress, GenerationResult } from '../services/imageGeneration/factory'
import { cn, delay } from '../utils'
import TaskItem from './TaskItem'

const TaskList: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false)
  const processingQueueRef = useRef<string[]>([])
  const currentlyProcessingRef = useRef<Set<string>>(new Set())

  const {
    isMobile,
    clearUploadedImages,
    tasks,
    updateTask,
    deleteTask,
    clearTasks,
    isProcessing,
    setIsProcessing,
    settings,
    uploadedImages,
    setIsImagePreviewModalOpen,
    setPreviewIndexes,
    apiService,
    initializeApiService
  } = useAppStore()

  // Initialize API service on mount
  useEffect(() => {
    if (!apiService) {
      initializeApiService()
    }
  }, [apiService, initializeApiService])

  const handleEditTask = useCallback((taskId: string, newPrompt: string) => {
    updateTask(taskId, { prompt: newPrompt })
  }, [updateTask])

  const handleDeleteTask = useCallback((taskId: string) => {
    deleteTask(taskId)
  }, [deleteTask])

  const handleRetryTask = useCallback((taskId: string) => {
    updateTask(taskId, { 
      status: TaskStatus.Idle, 
      error: undefined,
      generatedImages: []
    })
    
    if (isProcessing && !isPaused) {
      // Add to processing queue if currently processing
      processingQueueRef.current.push(taskId)
    }
  }, [updateTask, isProcessing, isPaused])

  const handlePreviewTask = useCallback((taskId: string) => {
    const completedTasks = tasks.filter(task => 
      task.status === TaskStatus.Completed && task.generatedImages.length > 0
    )
    const taskIndex = completedTasks.findIndex(task => task.id === taskId)
    
    if (taskIndex >= 0) {
      setPreviewIndexes(taskIndex, 0)
      setIsImagePreviewModalOpen(true)
    }
  }, [tasks, setPreviewIndexes, setIsImagePreviewModalOpen])

  const handleTaskProgress = useCallback((progress: GenerationProgress) => {
    updateTask(progress.taskId, { 
      progress: progress.progress,
      status: progress.stage === 'completed' ? TaskStatus.Completed : TaskStatus.Generating
    })
  }, [updateTask])

  const handleTaskComplete = useCallback((result: GenerationResult) => {
    if (result.success) {
      const generatedImages: GeneratedImage[] = result.images.map((url) => ({
        id: crypto.randomUUID(),
        url,
      }))

      updateTask(result.taskId, {
        status: TaskStatus.Completed,
        progress: 100,
        generatedImages,
        error: undefined
      })
    } else {
      updateTask(result.taskId, {
        status: TaskStatus.Failed,
        error: result.error || '生成失败'
      })
    }

    // Remove from currently processing set
    currentlyProcessingRef.current.delete(result.taskId)
    
    // Clean up generator
    if (apiService) {
      apiService.removeTaskGenerator(result.taskId)
    }
  }, [updateTask, apiService])

  const processTask = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status !== TaskStatus.Idle || !apiService) return

    try {
      updateTask(taskId, { status: TaskStatus.Pending })
      
      currentlyProcessingRef.current.add(taskId)
      updateTask(taskId, { status: TaskStatus.Generating, progress: 0 })

      // Create task generator with callbacks
      apiService.createTaskGenerator(
        taskId,
        handleTaskProgress,
        handleTaskComplete
      )

      // Start generation (the callbacks will handle progress and completion)
      await apiService.generateImage(task, uploadedImages)

    } catch (error) {
      console.error('Error processing task:', error)
      updateTask(taskId, {
        status: TaskStatus.Failed,
        error: error instanceof Error ? error.message : '未知错误'
      })
      currentlyProcessingRef.current.delete(taskId)
      if (apiService) {
        apiService.removeTaskGenerator(taskId)
      }
    }
  }, [tasks, updateTask, settings, uploadedImages, isPaused, apiService, handleTaskProgress, handleTaskComplete])

  const startBatchProcessing = useCallback(async () => {
    if (!settings.imageGeneration.baseUrl) {
      alert('请先在设置中配置图片生成API')
      return
    }

    if (!apiService) {
      alert('API服务未初始化')
      return
    }

    const idleTasks = tasks.filter(task => task.status === TaskStatus.Idle)
    if (idleTasks.length === 0) {
      alert('没有待处理的任务')
      return
    }

    setIsProcessing(true)
    setIsPaused(false)
    processingQueueRef.current = idleTasks.map(task => task.id)

    const processQueue = async () => {
      while (processingQueueRef.current.length > 0 && !isPaused) {
        // 启动批量任务，不超过batchSize
        const tasksToStart: Promise<void>[] = []
        
        while (
          tasksToStart.length < settings.common!.batchSize && 
          processingQueueRef.current.length > 0 && 
          currentlyProcessingRef.current.size < settings.common!.batchSize
        ) {
          const taskId = processingQueueRef.current.shift()
          if (taskId) {
            tasksToStart.push(processTask(taskId))
          }
        }

        // 等待这批任务完成或者有任务完成释放槽位
        if (tasksToStart.length > 0) {
          await Promise.race([
            Promise.all(tasksToStart),
            // 或者等待直到有槽位释放
            new Promise<void>(resolve => {
              const checkSlots = () => {
                if (currentlyProcessingRef.current.size < settings.common!.batchSize) {
                  resolve()
                } else {
                  setTimeout(checkSlots, 500)
                }
              }
              checkSlots()
            })
          ])
        }

        // 小延迟避免过于频繁的检查
        await delay(100)
      }

      // Wait for any remaining tasks to complete
      while (currentlyProcessingRef.current.size > 0) {
        await delay(1000)
      }

      setIsProcessing(false)
    }

    processQueue()
  }, [tasks, settings, setIsProcessing, processTask, apiService])

  const pauseProcessing = useCallback(() => {
    setIsPaused(true)
    processingQueueRef.current = []
  }, [])

  const resumeProcessing = useCallback(() => {
    setIsPaused(false)
    const idleTasks = tasks.filter(task => task.status === TaskStatus.Idle)
    processingQueueRef.current = idleTasks.map(task => task.id)
    
    const processQueue = async () => {
      while (processingQueueRef.current.length > 0 && !isPaused) {
        // 启动批量任务，不超过batchSize
        const tasksToStart: Promise<void>[] = []
        
        while (
          tasksToStart.length < settings.common!.batchSize && 
          processingQueueRef.current.length > 0 && 
          currentlyProcessingRef.current.size < settings.common!.batchSize
        ) {
          const taskId = processingQueueRef.current.shift()
          if (taskId) {
            tasksToStart.push(processTask(taskId))
          }
        }

        // 等待这批任务完成或者有任务完成释放槽位
        if (tasksToStart.length > 0) {
          await Promise.race([
            Promise.all(tasksToStart),
            // 或者等待直到有槽位释放
            new Promise<void>(resolve => {
              const checkSlots = () => {
                if (currentlyProcessingRef.current.size < settings.common!.batchSize) {
                  resolve()
                } else {
                  setTimeout(checkSlots, 500)
                }
              }
              checkSlots()
            })
          ])
        }

        await delay(100)
      }

      while (currentlyProcessingRef.current.size > 0) {
        await delay(1000)
      }

      setIsProcessing(false)
    }

    processQueue()
  }, [tasks, processTask])

  const handleClearAll = useCallback(() => {
    if (isProcessing) {
      alert('请先停止处理再清空任务')
      return
    }
    
    if (window.confirm('确定要清空所有任务吗？此操作不可撤销。')) {
      // Clear all generators
      if (apiService) {
        apiService.clearAllGenerators()
      }
      clearTasks()
      clearUploadedImages()
    }
  }, [isProcessing, clearTasks, apiService])

  const completedTasksCount = tasks.filter(task => task.status === TaskStatus.Completed).length
  const failedTasksCount = tasks.filter(task => task.status === TaskStatus.Failed).length
  const processingTasksCount = tasks.filter(task => 
    task.status === TaskStatus.Generating || task.status === TaskStatus.Pending
  ).length

  return (
    <div className="w-full h-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            任务列表 ({tasks.length})
          </h2>
          
          <div className="flex items-center space-x-4">
            {/* Stats */}
            <div className={cn("flex items-center text-sm"
              , isMobile ? "flex-col space-y-1" : "flex-row space-x-4"
            )}>
              <span className="text-green-600 dark:text-green-400">
                完成: {completedTasksCount}
              </span>
              <span className="text-red-600 dark:text-red-400">
                失败: {failedTasksCount}
              </span>
              <span className="text-blue-600 dark:text-blue-400">
                处理中: {processingTasksCount}
              </span>
            </div>

            {/* Action buttons */}
            <div className={cn(
              "flex items-center",
              isMobile ? "flex-col space-y-2" : "flex-row space-x-2"
            )}>
              {!isProcessing ? (
                <button
                  onClick={startBatchProcessing}
                  disabled={tasks.length === 0}
                  className="flex items-center px-4 py-2 bg-green-600 dark:bg-green-700 text-white font-medium rounded-md hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  全部生成
                </button>
              ) : (
                <button
                  onClick={isPaused ? resumeProcessing : pauseProcessing}
                  className="flex items-center px-4 py-2 bg-orange-600 dark:bg-orange-700 text-white font-medium rounded-md hover:bg-orange-700 dark:hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                >
                  {isPaused ? (
                    <>
                      <PlayIcon className="h-4 w-4 mr-2" />
                      继续执行
                    </>
                  ) : (
                    <>
                      <PauseIcon className="h-4 w-4 mr-2" />
                      暂停执行
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handleClearAll}
                disabled={isProcessing}
                className="flex items-center px-4 py-2 bg-red-600 dark:bg-red-700 text-white font-medium rounded-md hover:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                清空全部
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Task List */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center">
              <div className="text-gray-400 dark:text-gray-500 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">暂无任务</h3>
              <p className="text-gray-500 dark:text-gray-400">
                在左侧输入提示词创建你的第一个AI生图任务
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onRetry={handleRetryTask}
                onPreview={handlePreviewTask}
                isGloballyProcessing={isProcessing}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TaskList
