// src/components/PromptInputArea.tsx

import React, { useState, useCallback } from 'react'
import { PlusIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useAppStore } from '../store/appStore'
import { TaskStatus, type UploadedImage } from '../types'
import { validateImageFile, createImagePreview } from '../utils'
import { APIService } from '../services/api'

const PromptInputArea: React.FC = () => {
  const [dragOver, setDragOver] = useState(false)
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null)
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null)
  // Add touch-specific state
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const {
    mainPrompt,
    setMainPrompt,
    isCreatingTasks,
    setIsCreatingTasks,
    currentUploadedImages,
    addCurrentUploadedImage,
    removeCurrentUploadedImage,
    clearCurrentUploadedImages,
    reorderCurrentUploadedImages,
    addUploadedImages,
    addTasks,
    settings,
    isProcessing
  } = useAppStore()

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    
    for (const file of fileArray) {
      if (validateImageFile(file)) {
        try {
          const previewUrl = await createImagePreview(file)
          const uploadedImage: UploadedImage = {
            id: crypto.randomUUID(),
            file,
            previewUrl,
            name: file.name
          }
          addCurrentUploadedImage(uploadedImage)
        } catch (error) {
          console.error('Error creating image preview:', error)
        }
      }
    }
  }, [addCurrentUploadedImage])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files)
    }
    // Reset input value to allow uploading the same file again
    e.target.value = ''
  }, [handleFileUpload])

  const handleCreateTasks = useCallback(async () => {
    if (!mainPrompt.trim()) {
      alert('请输入提示词')
      return
    }

    if (!settings.llm.apiKey) {
      alert('请先在设置中配置LLM API密钥')
      return
    }

    setIsCreatingTasks(true)
    try {
      const apiService = new APIService(settings)
      const newTasks = await apiService.createTasksFromPrompt(mainPrompt, currentUploadedImages)
      addTasks(newTasks)
      addUploadedImages(currentUploadedImages)
    } catch (error) {
      console.error('Error creating tasks:', error)
      alert('创建任务失败，请检查设置和网络连接')
    } finally {
      setIsCreatingTasks(false)
    }
  }, [mainPrompt, currentUploadedImages, settings, addTasks, setIsCreatingTasks, addUploadedImages])

  const handleDirectCreate = useCallback(() => {
    if (!mainPrompt.trim()) {
      alert('请输入提示词')
      return
    }

    // Create a single task directly from the main prompt
    const directTask = {
      id: crypto.randomUUID(),
      prompt: mainPrompt.trim(),
      originalPrompt: mainPrompt.trim(),
      attachedImageIds: currentUploadedImages?.map(img => img.id) || [],
      status: TaskStatus.Idle,
      generatedImages: []
    }
    console.log('Creating direct task:', directTask)

    addTasks([directTask])
    addUploadedImages(currentUploadedImages)
  }, [mainPrompt, currentUploadedImages, addTasks, addUploadedImages])

  const handleReset = useCallback(() => {
    setMainPrompt('')
    clearCurrentUploadedImages()
    setDraggedImageId(null)
    setDragOverImageId(null)
  }, [setMainPrompt, clearCurrentUploadedImages])

  const removeImage = useCallback((id: string) => {
    removeCurrentUploadedImage(id)
  }, [removeCurrentUploadedImage])

  const handleImageDragStart = useCallback((e: React.DragEvent, imageId: string) => {
    setDraggedImageId(imageId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleImageDragEnd = useCallback(() => {
    setDraggedImageId(null)
    setDragOverImageId(null)
  }, [])

  const handleImageDragOver = useCallback((e: React.DragEvent, imageId: string) => {
    e.preventDefault()
    if (draggedImageId && draggedImageId !== imageId) {
      setDragOverImageId(imageId)
      e.dataTransfer.dropEffect = 'move'
    }
  }, [draggedImageId])

  const handleImageDrop = useCallback((e: React.DragEvent, targetImageId: string) => {
    e.preventDefault()
    if (draggedImageId && draggedImageId !== targetImageId) {
      reorderCurrentUploadedImages(draggedImageId, targetImageId)
    }
    setDragOverImageId(null)
  }, [draggedImageId, reorderCurrentUploadedImages])

  // Add touch event handlers for mobile support
  const handleTouchStart = useCallback((e: React.TouchEvent, imageId: string) => {
    const touch = e.touches[0]
    setTouchStartPos({ x: touch.clientX, y: touch.clientY })
    setDraggedImageId(imageId)
    setIsDragging(false)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!draggedImageId || !touchStartPos) return
    
    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStartPos.x)
    const deltaY = Math.abs(touch.clientY - touchStartPos.y)
    
    // Start dragging if moved more than 10px
    if (!isDragging && (deltaX > 10 || deltaY > 10)) {
      setIsDragging(true)
    }
    
    if (isDragging) {
      
      // Find the element under the touch point
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY)
      const imageElement = elementBelow?.closest('[data-image-id]')
      
      if (imageElement) {
        const targetImageId = imageElement.getAttribute('data-image-id')
        if (targetImageId && targetImageId !== draggedImageId) {
          setDragOverImageId(targetImageId)
        } else {
          setDragOverImageId(null)
        }
      } else {
        setDragOverImageId(null)
      }
    }
  }, [draggedImageId, touchStartPos, isDragging])

  const handleTouchEnd = useCallback(() => {
    if (isDragging && draggedImageId && dragOverImageId) {
      reorderCurrentUploadedImages(draggedImageId, dragOverImageId)
    }
    
    setDraggedImageId(null)
    setDragOverImageId(null)
    setTouchStartPos(null)
    setIsDragging(false)
  }, [isDragging, draggedImageId, dragOverImageId, reorderCurrentUploadedImages])

  return (
    <div className="w-full max-w-5xl p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">AI生图批量任务工具</h2>
      
      {/* Main Prompt Input */}
      <div className="mb-6">
        <label htmlFor="mainPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          主提示词
        </label>
        <textarea
          id="mainPrompt"
          value={mainPrompt}
          onChange={(e) => setMainPrompt(e.target.value)}
          placeholder="描述你想要生成的图片，AI将为你创建多个具体的生图任务..."
          className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          disabled={isProcessing}
        />
      </div>

      {/* Image Upload Area */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          参考图片 (可选)
        </label>
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing}
          />
          <div className="text-center">
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              点击上传或拖拽图片到此处
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              支持 JPEG, PNG, WebP 格式，最大 10MB
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Images Preview */}
      {currentUploadedImages.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            已上传图片 ({currentUploadedImages.length}) - 可拖拽调整顺序
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {currentUploadedImages.map((image) => (
              <div 
                key={image.id}
                data-image-id={image.id}
                className={`relative group cursor-move transition-all duration-200 ${
                  draggedImageId === image.id ? 'opacity-50 scale-95' : ''
                } ${
                  dragOverImageId === image.id ? 'scale-105 ring-2 ring-blue-500' : ''
                } ${
                  isDragging && draggedImageId === image.id ? 'z-50' : ''
                }`}
                draggable
                onDragStart={(e) => handleImageDragStart(e, image.id)}
                onDragEnd={handleImageDragEnd}
                onDragOver={(e) => handleImageDragOver(e, image.id)}
                onDrop={(e) => handleImageDrop(e, image.id)}
                onTouchStart={(e) => handleTouchStart(e, image.id)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                  touchAction: 'none' // Prevent default touch behaviors
                }}
              >
                <div className="relative w-full h-full aspect-square rounded-lg border border-gray-200 dark:border-gray-600">
                  <img
                    src={image.previewUrl}
                    alt={image.name}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-full max-h-full object-contain"
                  />
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                    disabled={isProcessing}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                    {image.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Tasks Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleReset}
          disabled={isCreatingTasks}
          className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <XMarkIcon className="h-5 w-5 mr-2" />
          重置
        </button>
        <button
          onClick={handleDirectCreate}
          disabled={!mainPrompt.trim() || isProcessing}
          className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 dark:bg-green-700 text-white font-medium rounded-md hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          直接创建
        </button>
        
        <button
          onClick={handleCreateTasks}
          disabled={!mainPrompt.trim() || isCreatingTasks || isProcessing}
          className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white font-medium rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCreatingTasks ? (
            <>
              <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              创建任务中...
            </>
          ) : (
            <>
              <PlusIcon className="h-5 w-5 mr-2" />
              智能创建任务
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default PromptInputArea
