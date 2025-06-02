// src/components/TaskItem.tsx

import React, { useState, useCallback } from 'react'
import { 
  PencilIcon, 
  TrashIcon, 
  CheckIcon, 
  XMarkIcon,
  ArrowPathIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import type { Task } from '../types'
import { TaskStatus } from '../types'
import { getTaskStatusColor, getTaskStatusText } from '../utils'
import { useAppStore } from '../store/appStore'

interface TaskItemProps {
  task: Task
  onEdit: (taskId: string, newPrompt: string) => void
  onDelete: (taskId: string) => void
  onRetry: (taskId: string) => void
  onPreview: (taskId: string) => void
  isGloballyProcessing: boolean
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onEdit,
  onDelete,
  onRetry,
  onPreview,
  isGloballyProcessing
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editablePrompt, setEditablePrompt] = useState(task.prompt)
  
  const { uploadedImages } = useAppStore()

  const handleStartEdit = useCallback(() => {
    setEditablePrompt(task.prompt)
    setIsEditing(true)
  }, [task.prompt])

  const handleSaveEdit = useCallback(() => {
    if (editablePrompt.trim() !== task.prompt) {
      onEdit(task.id, editablePrompt.trim())
    }
    setIsEditing(false)
  }, [task.id, task.prompt, editablePrompt, onEdit])

  const handleCancelEdit = useCallback(() => {
    setEditablePrompt(task.prompt)
    setIsEditing(false)
  }, [task.prompt])

  const handleDelete = useCallback(() => {
    if (window.confirm('确定要删除这个任务吗？')) {
      onDelete(task.id)
    }
  }, [task.id, onDelete])

  const handleRetry = useCallback(() => {
    onRetry(task.id)
  }, [task.id, onRetry])

  const handlePreview = useCallback(() => {
    onPreview(task.id)
  }, [task.id, onPreview])

  const attachedImages = task.attachedImageIds
    ? uploadedImages.filter(img => task.attachedImageIds!.includes(img.id))
    : []

  const isEditable = !isGloballyProcessing && task.status === TaskStatus.Idle
  const isClickable = task.status === TaskStatus.Completed && task.generatedImages.length > 0

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-4 border-l-4 transition-all hover:shadow-lg ${
        task.status === TaskStatus.Completed
          ? 'border-green-500'
          : task.status === TaskStatus.Failed
          ? 'border-red-500'
          : task.status === TaskStatus.Generating
          ? 'border-blue-500'
          : 'border-gray-300'
      } ${isClickable ? 'cursor-pointer' : ''}`}
      onClick={isClickable ? handlePreview : undefined}
    >
      {/* Header with status and actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${getTaskStatusColor(task.status)}`}>
            {getTaskStatusText(task.status)}
          </span>
          {task.status === TaskStatus.Generating && task.progress !== undefined && (
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${task.progress}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500">{task.progress}%</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          {task.status === TaskStatus.Completed && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handlePreview()
              }}
              className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
              title="查看生成的图片"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
          )}
          
          {task.status === TaskStatus.Failed && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleRetry()
              }}
              className="p-1 text-orange-600 hover:text-orange-800 transition-colors"
              title="重试"
              disabled={isGloballyProcessing}
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          )}

          {isEditable && !isEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleStartEdit()
              }}
              className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
              title="编辑提示词"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}

          {isEditable && isEditing && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSaveEdit()
                }}
                className="p-1 text-green-600 hover:text-green-800 transition-colors"
                title="保存"
              >
                <CheckIcon className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCancelEdit()
                }}
                className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                title="取消"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </>
          )}

          {isEditable && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
              className="p-1 text-red-600 hover:text-red-800 transition-colors"
              title="删除任务"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Prompt */}
      <div className="mb-3">
        {isEditing ? (
          <textarea
            value={editablePrompt}
            onChange={(e) => setEditablePrompt(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="text-gray-800 text-sm leading-relaxed">
            {task.prompt}
          </p>
        )}
      </div>

      {/* Attached Images */}
      {attachedImages.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-2">参考图片:</p>
          <div className="flex space-x-2 overflow-x-auto">
            {attachedImages.map((image) => (
              <img
                key={image.id}
                src={image.previewUrl}
                alt={image.name}
                className="w-12 h-12 object-cover rounded border border-gray-200 flex-shrink-0"
              />
            ))}
          </div>
        </div>
      )}

      {/* Generated Images Preview */}
      {task.generatedImages.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">
            生成的图片 ({task.generatedImages.length}):
          </p>
          <div className="flex space-x-2 overflow-x-auto">
            {task.generatedImages.slice(0, 4).map((image, index) => (
              <img
                key={image.id}
                src={image.url}
                alt={`Generated image ${index + 1}`}
                className="w-12 h-12 object-cover rounded border border-gray-200 flex-shrink-0"
              />
            ))}
            {task.generatedImages.length > 4 && (
              <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-gray-500">+{task.generatedImages.length - 4}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {task.status === TaskStatus.Failed && task.error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-xs">{task.error}</p>
        </div>
      )}
    </div>
  )
}

export default TaskItem
