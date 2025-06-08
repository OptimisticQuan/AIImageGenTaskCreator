// src/components/MobileTabBar.tsx
import React from 'react'
import { PencilIcon, ListBulletIcon } from '@heroicons/react/24/outline'
import { useAppStore } from '../store/appStore'

const MobileTabBar: React.FC = () => {
  const { mobileActiveTab, setMobileActiveTab, tasks } = useAppStore()

  const tabConfig = [
    {
      id: 'input' as const,
      label: '创建任务',
      icon: PencilIcon,
      badge: null
    },
    {
      id: 'tasks' as const,
      label: '任务列表',
      icon: ListBulletIcon,
      badge: tasks.length > 0 ? tasks.length : null
    }
  ]

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
      <div className="flex">
        {tabConfig.map((tab) => {
          const Icon = tab.icon
          const isActive = mobileActiveTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => setMobileActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-4 relative ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="relative">
                <Icon className="h-6 w-6 mb-1" />
                {tab.badge && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MobileTabBar
