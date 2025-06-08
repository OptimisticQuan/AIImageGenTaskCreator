// src/components/ThemeToggle.tsx
import React from 'react'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useAppStore } from '../store/appStore'

const ThemeToggle: React.FC = () => {
  const { settings, toggleTheme } = useAppStore()
  const isDark = settings.common?.theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className="p-3 bg-gray-800 dark:bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
      title={isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      {isDark ? (
        <SunIcon className="h-6 w-6" />
      ) : (
        <MoonIcon className="h-6 w-6" />
      )}
    </button>
  )
}

export default ThemeToggle
