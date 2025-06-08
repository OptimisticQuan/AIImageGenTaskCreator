// src/components/SettingsModal.tsx

import React, { useState, useEffect } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { XMarkIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { useAppStore } from '../store/appStore'
import type { AppSettings } from '../types'
import { cn } from '../utils'

type TabType = 'basic' | 'llm' | 'imageGeneration'

const SettingsModal: React.FC = () => {
  const {
    isMobile,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    settings,
    updateSettings
  } = useAppStore()

  const [formData, setFormData] = useState<AppSettings>(settings)
  const [activeTab, setActiveTab] = useState<TabType>('basic')

  useEffect(() => {
    setFormData(settings)
  }, [settings])

  const handleInputChange = (section: keyof AppSettings, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, any>),
        [field]: value
      }
    }))
  }

  const handleSave = () => {
    updateSettings(formData)
    setIsSettingsModalOpen(false)
  }

  const handleCancel = () => {
    setFormData(settings)
    setIsSettingsModalOpen(false)
  }

  const handleTestConnection = async (type: 'llm' | 'imageGeneration') => {
    // Basic test - just check if URL is reachable
    try {
      const baseUrl = type === 'llm' ? formData.llm.baseUrl : formData.imageGeneration.baseUrl
      await fetch(baseUrl, { method: 'HEAD', mode: 'no-cors' })
      alert('连接测试完成')
    } catch (error) {
      alert('连接测试失败，请检查URL和网络连接')
    }
  }

  const handleGetApiKey = (supplier: string) => {
    let url = ''
    switch (supplier) {
      case 'OpenAI':
        url = 'https://platform.openai.com/api-keys'
        break
      case 'Tuzi':
        url = 'https://api.tu-zi.com/register?aff=jIii'
        break
      default:
        return
    }
    window.open(url, '_blank')
  }

  return (
    <Dialog open={isSettingsModalOpen} onClose={handleCancel} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 dark:bg-black/50" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className={cn(
          "w-full max-h-[90vh] overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-xl",
          isMobile ? "max-w-sm" : "max-w-4xl"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="flex items-center text-lg font-semibold text-gray-900 dark:text-gray-100">
              <Cog6ToothIcon className="h-5 w-5 mr-2" />
              设置
            </DialogTitle>
            <button
              onClick={handleCancel}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className={cn(
            "flex",
            isMobile ? "flex-col h-[500px]" : "h-[600px]"
          )}>
            {/* Tab Navigation */}
            <div className={cn(
              "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900",
              isMobile 
                ? "w-full border-b flex-shrink-0" 
                : "w-48 border-r"
            )}>
              <nav className={cn(
                "p-4",
                isMobile ? "flex space-x-2 overflow-x-auto" : "space-y-2"
              )}>
                <button
                  onClick={() => setActiveTab('basic')}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isMobile ? "flex-shrink-0 whitespace-nowrap" : "w-full text-left",
                    activeTab === 'basic'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  基本设置
                </button>
                <button
                  onClick={() => setActiveTab('llm')}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isMobile ? "flex-shrink-0 whitespace-nowrap" : "w-full text-left",
                    activeTab === 'llm'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  大语言模型
                </button>
                <button
                  onClick={() => setActiveTab('imageGeneration')}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isMobile ? "flex-shrink-0 whitespace-nowrap" : "w-full text-left",
                    activeTab === 'imageGeneration'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  图片生成
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-gray-800">
              {activeTab === 'basic' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    基本设置
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        批量执行每批数量
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.common?.batchSize || 2}
                        onChange={(e) => handleInputChange('common', 'batchSize', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'llm' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    大语言模型
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Base URL
                      </label>
                      <input
                        type="url"
                        value={formData.llm.baseUrl}
                        onChange={(e) => handleInputChange('llm', 'baseUrl', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://api.openai.com/v1"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        API Key
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="password"
                          value={formData.llm.apiKey || ''}
                          onChange={(e) => handleInputChange('llm', 'apiKey', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={() => handleGetApiKey('OpenAI')}
                          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                        >
                          获取
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        模型名称
                      </label>
                      <input
                        type="text"
                        value={formData.llm.modelName || ''}
                        onChange={(e) => handleInputChange('llm', 'modelName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="gpt-3.5-turbo"
                      />
                    </div>

                    <button
                      onClick={() => handleTestConnection('llm')}
                      className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    >
                      测试连接
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'imageGeneration' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    图片生成
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        供应商
                      </label>
                      <select
                        value={formData.imageGeneration.supplier}
                        onChange={(e) => handleInputChange('imageGeneration', 'supplier', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="OpenAI">OpenAI</option>
                        <option value="Tuzi">兔子</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Base URL
                      </label>
                      <input
                        type="url"
                        value={formData.imageGeneration.baseUrl}
                        onChange={(e) => handleInputChange('imageGeneration', 'baseUrl', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={
                          formData.imageGeneration.supplier === 'OpenAI'
                            ? 'https://api.openai.com/v1'
                            : 'https://api.tu-zi.com/v1'
                        }
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        API Key
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="password"
                          value={formData.imageGeneration.apiKey || ''}
                          onChange={(e) => handleInputChange('imageGeneration', 'apiKey', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={() => handleGetApiKey(formData.imageGeneration.supplier)}
                          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                        >
                          获取
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        模型名称
                      </label>
                      <input
                        type="text"
                        value={formData.imageGeneration.modelName || ''}
                        onChange={(e) => handleInputChange('imageGeneration', 'modelName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={
                          formData.imageGeneration.supplier === 'OpenAI'
                            ? 'dall-e-3'
                            : 'gpt-4o-image-vip'
                        }
                      />
                    </div>

                    <button
                      onClick={() => handleTestConnection('imageGeneration')}
                      className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    >
                      测试连接
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={cn(
            "flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700",
            isMobile ? "space-x-2" : "space-x-3"
          )}>
            <button
              onClick={handleCancel}
              className={cn(
                "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors",
                isMobile ? "px-3 py-2 text-sm" : "px-4 py-2"
              )}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className={cn(
                "text-white bg-blue-600 dark:bg-blue-700 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors",
                isMobile ? "px-3 py-2 text-sm" : "px-4 py-2"
              )}
            >
              保存
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export default SettingsModal
