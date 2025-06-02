// src/components/TaskList.tsx

import React, { useCallback, useRef, useState } from 'react'
import { PlayIcon, PauseIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useAppStore } from '../store/appStore'
import { TaskStatus } from '../types'
import type { GeneratedImage } from '../types'
import { APIService } from '../services/api'
import { delay } from '../utils'
import TaskItem from './TaskItem'

const TaskList: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false)
  const processingQueueRef = useRef<string[]>([])
  const currentlyProcessingRef = useRef<Set<string>>(new Set())

  const {
    tasks,
    updateTask,
    deleteTask,
    clearTasks,
    isProcessing,
    setIsProcessing,
    settings,
    uploadedImages,
    setIsImagePreviewModalOpen,
    setPreviewIndexes
  } = useAppStore()

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

  const processTask = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status !== TaskStatus.Idle) return

    try {
      updateTask(taskId, { status: TaskStatus.Pending })
      
      // Wait for any currently processing tasks to reduce load
      while (currentlyProcessingRef.current.size >= settings.batchSize) {
        await delay(1000)
        if (isPaused) return
      }

      currentlyProcessingRef.current.add(taskId)
      updateTask(taskId, { status: TaskStatus.Generating, progress: 0 })

      const apiService = new APIService(settings)
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        const currentTask = tasks.find(t => t.id === taskId)
        if (currentTask?.status === TaskStatus.Generating) {
          const currentProgress = currentTask.progress || 0
          if (currentProgress < 90) {
            updateTask(taskId, { progress: Math.min(90, currentProgress + Math.random() * 20) })
          }
        }
      }, 2000)

      const imageUrls = await apiService.generateImage(task, uploadedImages)
      clearInterval(progressInterval)

      const generatedImages: GeneratedImage[] = imageUrls.map((url) => ({
        id: crypto.randomUUID(),
        url,
      }))

      updateTask(taskId, {
        status: TaskStatus.Completed,
        progress: 100,
        generatedImages,
        error: undefined
      })

    } catch (error) {
      console.error('Error processing task:', error)
      updateTask(taskId, {
        status: TaskStatus.Failed,
        error: error instanceof Error ? error.message : '未知错误'
      })
    } finally {
      currentlyProcessingRef.current.delete(taskId)
    }
  }, [tasks, updateTask, settings, uploadedImages, isPaused])

  const startBatchProcessing = useCallback(async () => {
    if (!settings.imageGeneration.baseUrl) {
      alert('请先在设置中配置图片生成API')
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
        const taskId = processingQueueRef.current.shift()
        if (taskId) {
          await processTask(taskId)
          await delay(500) // Small delay between tasks
        }
      }

      // Wait for any remaining tasks to complete
      while (currentlyProcessingRef.current.size > 0) {
        await delay(1000)
      }

      setIsProcessing(false)
    }

    processQueue()
  }, [tasks, settings, setIsProcessing, processTask])

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
        const taskId = processingQueueRef.current.shift()
        if (taskId) {
          await processTask(taskId)
          await delay(500)
        }
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
      clearTasks()
    }
  }, [isProcessing, clearTasks])

  const completedTasksCount = tasks.filter(task => task.status === TaskStatus.Completed).length
  const failedTasksCount = tasks.filter(task => task.status === TaskStatus.Failed).length
  const processingTasksCount = tasks.filter(task => 
    task.status === TaskStatus.Generating || task.status === TaskStatus.Pending
  ).length

  return (
    <div className="w-full max-w-4xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          任务列表 ({tasks.length})
        </h2>
        
        <div className="flex items-center space-x-4">
          {/* Stats */}
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-green-600">
              完成: {completedTasksCount}
            </span>
            <span className="text-red-600">
              失败: {failedTasksCount}
            </span>
            <span className="text-blue-600">
              处理中: {processingTasksCount}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {!isProcessing ? (
              <button
                onClick={startBatchProcessing}
                disabled={tasks.length === 0}
                className="flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                全部生成
              </button>
            ) : (
              <button
                onClick={isPaused ? resumeProcessing : pauseProcessing}
                className="flex items-center px-4 py-2 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
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
              className="flex items-center px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              清空全部
            </button>
          </div>
        </div>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">暂无任务</p>
          <p className="text-gray-400 text-sm mt-2">
            在左侧输入提示词并点击"创建任务"开始
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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
  )
}

export default TaskList
