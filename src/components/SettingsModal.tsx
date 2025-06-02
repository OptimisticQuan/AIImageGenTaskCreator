// src/components/SettingsModal.tsx

import React, { useState, useEffect } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { XMarkIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { useAppStore } from '../store/appStore'
import type { AppSettings } from '../types'

type TabType = 'basic' | 'llm' | 'imageGeneration'

const SettingsModal: React.FC = () => {
  const {
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

  return (
    <Dialog open={isSettingsModalOpen} onClose={handleCancel} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className="max-w-4xl w-full max-h-[90vh] overflow-hidden bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <DialogTitle className="flex items-center text-lg font-semibold text-gray-900">
              <Cog6ToothIcon className="h-5 w-5 mr-2" />
              设置
            </DialogTitle>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex h-[600px]">
            {/* Tab Navigation */}
            <div className="w-48 border-r border-gray-200 bg-gray-50">
              <nav className="p-4 space-y-2">
                <button
                  onClick={() => setActiveTab('basic')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'basic'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  基本设置
                </button>
                <button
                  onClick={() => setActiveTab('llm')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'llm'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  大语言模型设置
                </button>
                <button
                  onClick={() => setActiveTab('imageGeneration')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'imageGeneration'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  图片生成模型设置
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'basic' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    批量处理设置
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      每批处理数量
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.common?.batchSize}
                      onChange={(e) => handleInputChange('common', 'batchSize', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      同时处理的任务数量，建议根据API限制和性能调整
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'llm' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    任务创建 (大语言模型)
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Base URL
                      </label>
                      <input
                        type="url"
                        value={formData.llm.baseUrl}
                        onChange={(e) => handleInputChange('llm', 'baseUrl', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://api.openai.com/v1/chat/completions"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={formData.llm.apiKey}
                        onChange={(e) => handleInputChange('llm', 'apiKey', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        模型名称
                      </label>
                      <input
                        type="text"
                        value={formData.llm.modelName}
                        onChange={(e) => handleInputChange('llm', 'modelName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="gpt-3.5-turbo"
                      />
                    </div>

                    <button
                      onClick={() => handleTestConnection('llm')}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      测试连接
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'imageGeneration' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    图片生成
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        供应商
                      </label>
                      <select
                        value={formData.imageGeneration.supplier}
                        onChange={(e) => handleInputChange('imageGeneration', 'supplier', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {/* <option value="StableDiffusionWebUI">Stable Diffusion WebUI</option>
                        <option value="ComfyUI">ComfyUI</option> */}
                        <option value="OpenAI">OpenAI</option>
                        <option value="Tuzi">兔子</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Base URL
                      </label>
                      <input
                        type="url"
                        value={formData.imageGeneration.baseUrl}
                        onChange={(e) => handleInputChange('imageGeneration', 'baseUrl', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={
                          formData.imageGeneration.supplier === 'OpenAI'
                            ? 'https://api.openai.com/v1/images/generations'
                            : 'http://localhost:7860'
                        }
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={formData.imageGeneration.apiKey || ''}
                        onChange={(e) => handleInputChange('imageGeneration', 'apiKey', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        模型名称
                      </label>
                      <input
                        type="text"
                        value={formData.imageGeneration.modelName || ''}
                        onChange={(e) => handleInputChange('imageGeneration', 'modelName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={
                          formData.imageGeneration.supplier === 'OpenAI'
                            ? 'dall-e-3'
                            : 'sd_xl_base_1.0.safetensors'
                        }
                      />
                    </div>

                    <button
                      onClick={() => handleTestConnection('imageGeneration')}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      测试连接
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
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
