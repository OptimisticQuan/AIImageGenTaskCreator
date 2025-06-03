// src/components/PromptInputArea.tsx

import React, { useState, useCallback } from 'react'
import { PlusIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useAppStore } from '../store/appStore'
import { TaskStatus, type UploadedImage } from '../types'
import { validateImageFile, createImagePreview } from '../utils'
import { APIService } from '../services/api'

const PromptInputArea: React.FC = () => {
  const [mainPrompt, setMainPrompt] = useState('')
  const [isCreatingTasks, setIsCreatingTasks] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null)
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null)

  const {
    uploadedImages,
    addUploadedImage,
    removeUploadedImage,
    reorderUploadedImages,
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
          addUploadedImage(uploadedImage)
        } catch (error) {
          console.error('Error creating image preview:', error)
        }
      }
    }
  }, [addUploadedImage])

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
      const newTasks = await apiService.createTasksFromPrompt(mainPrompt, uploadedImages)
      addTasks(newTasks)
      
      // Clear input after successful task creation
      setMainPrompt('')
    } catch (error) {
      console.error('Error creating tasks:', error)
      alert('创建任务失败，请检查设置和网络连接')
    } finally {
      setIsCreatingTasks(false)
    }
  }, [mainPrompt, uploadedImages, settings, addTasks])

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
      referenceImages: uploadedImages?.map(img => img.id) || [],
      status: TaskStatus.Idle,
      generatedImages: []
    }

    addTasks([directTask])
    
    // Clear input after successful task creation
    setMainPrompt('')
  }, [mainPrompt, uploadedImages, addTasks])

  const removeImage = useCallback((id: string) => {
    removeUploadedImage(id)
  }, [removeUploadedImage])

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
      const draggedIndex = uploadedImages.findIndex(img => img.id === draggedImageId)
      const targetIndex = uploadedImages.findIndex(img => img.id === targetImageId)
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newImages = [...uploadedImages]
        const [draggedImage] = newImages.splice(draggedIndex, 1)
        newImages.splice(targetIndex, 0, draggedImage)
        reorderUploadedImages(newImages)
      }
    }
    setDragOverImageId(null)
  }, [draggedImageId, uploadedImages, reorderUploadedImages])

  return (
    <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">AI批量生图工具</h2>
      
      {/* Main Prompt Input */}
      <div className="mb-6">
        <label htmlFor="mainPrompt" className="block text-sm font-medium text-gray-700 mb-2">
          主提示词
        </label>
        <textarea
          id="mainPrompt"
          value={mainPrompt}
          onChange={(e) => setMainPrompt(e.target.value)}
          placeholder="描述你想要生成的图片，AI将为你创建多个具体的生图任务..."
          className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isProcessing}
        />
      </div>

      {/* Image Upload Area */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          参考图片 (可选)
        </label>
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
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
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              点击上传或拖拽图片到此处
            </p>
            <p className="text-xs text-gray-500">
              支持 JPEG, PNG, WebP 格式，最大 10MB
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Images Preview */}
      {uploadedImages.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            已上传图片 ({uploadedImages.length}) - 可拖拽调整顺序
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {uploadedImages.map((image) => (
              <div 
                key={image.id} 
                className={`relative group cursor-move transition-all duration-200 ${
                  draggedImageId === image.id ? 'opacity-50' : ''
                } ${
                  dragOverImageId === image.id ? 'scale-105 ring-2 ring-blue-500' : ''
                }`}
                draggable
                onDragStart={(e) => handleImageDragStart(e, image.id)}
                onDragEnd={handleImageDragEnd}
                onDragOver={(e) => handleImageDragOver(e, image.id)}
                onDrop={(e) => handleImageDrop(e, image.id)}
              >
                <div className="relative w-full" style={{ aspectRatio: 'auto' }}>
                  <img
                    src={image.previewUrl}
                    alt={image.name}
                    className="w-full h-auto object-contain rounded-lg border border-gray-200 max-h-32"
                    style={{ minHeight: '80px' }}
                  />
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
          onClick={handleDirectCreate}
          disabled={!mainPrompt.trim() || isProcessing}
          className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          直接创建
        </button>
        
        <button
          onClick={handleCreateTasks}
          disabled={!mainPrompt.trim() || isCreatingTasks || isProcessing}
          className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCreatingTasks ? (
            <>
              <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              创建任务中...
            </>
          ) : (
            <>
              <PlusIcon className="h-5 w-5 mr-2" />
              创建任务
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default PromptInputArea
