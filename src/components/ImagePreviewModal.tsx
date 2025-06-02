// src/components/ImagePreviewModal.tsx

import React, { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { 
  XMarkIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ArrowDownTrayIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'
import { useAppStore } from '../store/appStore'
import { TaskStatus } from '../types'
import { downloadImage, downloadImagesAsZip, generateUniqueFilename } from '../utils'

const ImagePreviewModal: React.FC = () => {
  const [currentView, setCurrentView] = useState<'single' | 'gallery'>('single')

  const {
    isImagePreviewModalOpen,
    setIsImagePreviewModalOpen,
    previewTaskIndex,
    previewImageIndex,
    setPreviewIndexes,
    tasks
  } = useAppStore()

  // Filter completed tasks with images
  const completedTasks = tasks.filter(task => 
    task.status === TaskStatus.Completed && task.generatedImages.length > 0
  )

  // Create flat array of all images with task info
  const allImages = completedTasks.flatMap((task, taskIndex) => 
    task.generatedImages.map((image, imageIndex) => ({
      ...image,
      taskIndex,
      imageIndex,
      task
    }))
  )

  const currentTask = completedTasks[previewTaskIndex]
  const currentImage = currentTask?.generatedImages[previewImageIndex]

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isImagePreviewModalOpen) return

      switch (e.key) {
        case 'ArrowLeft':
          handlePreviousImage()
          break
        case 'ArrowRight':
          handleNextImage()
          break
        case 'ArrowUp':
          handlePreviousTask()
          break
        case 'ArrowDown':
          handleNextTask()
          break
        case 'Escape':
          handleClose()
          break
        case 'g':
          setCurrentView(prev => prev === 'single' ? 'gallery' : 'single')
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isImagePreviewModalOpen, previewTaskIndex, previewImageIndex, completedTasks.length])

  const handleClose = useCallback(() => {
    setIsImagePreviewModalOpen(false)
    setCurrentView('single')
  }, [setIsImagePreviewModalOpen])

  const handlePreviousImage = useCallback(() => {
    if (!currentTask) return
    
    const newImageIndex = previewImageIndex > 0 
      ? previewImageIndex - 1 
      : currentTask.generatedImages.length - 1
    
    setPreviewIndexes(previewTaskIndex, newImageIndex)
  }, [currentTask, previewImageIndex, previewTaskIndex, setPreviewIndexes])

  const handleNextImage = useCallback(() => {
    if (!currentTask) return
    
    const newImageIndex = previewImageIndex < currentTask.generatedImages.length - 1 
      ? previewImageIndex + 1 
      : 0
    
    setPreviewIndexes(previewTaskIndex, newImageIndex)
  }, [currentTask, previewImageIndex, previewTaskIndex, setPreviewIndexes])

  const handlePreviousTask = useCallback(() => {
    if (completedTasks.length === 0) return
    
    const newTaskIndex = previewTaskIndex > 0 
      ? previewTaskIndex - 1 
      : completedTasks.length - 1
    
    setPreviewIndexes(newTaskIndex, 0)
  }, [completedTasks.length, previewTaskIndex, setPreviewIndexes])

  const handleNextTask = useCallback(() => {
    if (completedTasks.length === 0) return
    
    const newTaskIndex = previewTaskIndex < completedTasks.length - 1 
      ? previewTaskIndex + 1 
      : 0
    
    setPreviewIndexes(newTaskIndex, 0)
  }, [completedTasks.length, previewTaskIndex, setPreviewIndexes])

  const handleDownloadCurrent = useCallback(() => {
    if (!currentImage || !currentTask) return
    
    const filename = generateUniqueFilename(
      'generated_image.png',
      currentTask.prompt,
      previewImageIndex
    )
    downloadImage(currentImage.url, filename)
  }, [currentImage, currentTask, previewImageIndex])

  const handleDownloadAll = useCallback(async () => {
    if (!currentTask) return
    
    const imageUrls = currentTask.generatedImages.map(img => img.url)
    const zipFilename = `${currentTask.prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_all_images.zip`
    
    try {
      await downloadImagesAsZip(imageUrls, zipFilename)
    } catch (error) {
      console.error('Error downloading images as zip:', error)
      alert('下载失败，请重试')
    }
  }, [currentTask])

  const handleImageClick = useCallback((taskIndex: number, imageIndex: number) => {
    setPreviewIndexes(taskIndex, imageIndex)
    setCurrentView('single')
  }, [setPreviewIndexes])

  if (!isImagePreviewModalOpen || !currentTask) {
    return null
  }

  return (
    <Dialog open={isImagePreviewModalOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/90" />
      
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className="max-w-6xl w-full max-h-[95vh] bg-white rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-medium text-gray-900">
                任务 {previewTaskIndex + 1} / {completedTasks.length}
              </h3>
              {currentView === 'single' && (
                <span className="text-sm text-gray-500">
                  图片 {previewImageIndex + 1} / {currentTask.generatedImages.length}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentView(prev => prev === 'single' ? 'gallery' : 'single')}
                className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                title={currentView === 'single' ? '显示图库' : '显示单张'}
              >
                <PhotoIcon className="h-5 w-5" />
              </button>
              
              {currentView === 'single' && (
                <button
                  onClick={handleDownloadCurrent}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                  title="下载当前图片"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                </button>
              )}
              
              {currentView === 'gallery' && (
                <button
                  onClick={handleDownloadAll}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  title="下载所有图片"
                >
                  下载全部
                </button>
              )}
              
              <button
                onClick={handleClose}
                className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="relative">
            {currentView === 'single' ? (
              /* Single Image View */
              <div className="relative">
                <div className="flex items-center justify-center h-[600px] bg-gray-100">
                  {currentImage && (
                    <img
                      src={currentImage.url}
                      alt={`Generated image ${previewImageIndex + 1}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  )}
                </div>

                {/* Navigation Arrows */}
                {currentTask.generatedImages.length > 1 && (
                  <>
                    <button
                      onClick={handlePreviousImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/80 rounded-full shadow-lg hover:bg-white transition-colors"
                    >
                      <ChevronLeftIcon className="h-6 w-6" />
                    </button>
                    
                    <button
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/80 rounded-full shadow-lg hover:bg-white transition-colors"
                    >
                      <ChevronRightIcon className="h-6 w-6" />
                    </button>
                  </>
                )}

                {/* Task Navigation */}
                {completedTasks.length > 1 && (
                  <>
                    <button
                      onClick={handlePreviousTask}
                      className="absolute left-4 top-4 px-3 py-1 bg-black/50 text-white text-sm rounded hover:bg-black/70 transition-colors"
                    >
                      上一个任务
                    </button>
                    
                    <button
                      onClick={handleNextTask}
                      className="absolute right-4 top-4 px-3 py-1 bg-black/50 text-white text-sm rounded hover:bg-black/70 transition-colors"
                    >
                      下一个任务
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* Gallery View */
              <div className="p-4 max-h-[600px] overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {allImages.map((imageInfo, index) => (
                    <div
                      key={`${imageInfo.taskIndex}-${imageInfo.imageIndex}`}
                      className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                        imageInfo.taskIndex === previewTaskIndex && imageInfo.imageIndex === previewImageIndex
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleImageClick(imageInfo.taskIndex, imageInfo.imageIndex)}
                    >
                      <div className="w-full" style={{ aspectRatio: '1' }}>
                        <img
                          src={imageInfo.url}
                          alt={`Generated image ${imageInfo.imageIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">
                        <div className="text-center">任务{imageInfo.taskIndex + 1}-{imageInfo.imageIndex + 1}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">提示词:</p>
              <p className="text-xs leading-relaxed">{currentTask.prompt}</p>
            </div>
            
            <div className="mt-3 text-xs text-gray-500">
              快捷键: ← → 切换图片 | ↑ ↓ 切换任务 | G 切换视图 | ESC 关闭
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export default ImagePreviewModal
