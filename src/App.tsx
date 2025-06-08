import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { useAppStore } from './store/appStore'
import PromptInputArea from './components/PromptInputArea'
import TaskList from './components/TaskList'
import SettingsModal from './components/SettingsModal'
import ImagePreviewModal from './components/ImagePreviewModal'
import MobileTabBar from './components/MobileTabBar'
import ThemeToggle from './components/ThemeToggle'
import { useEffect } from 'react'
import { cn } from './utils'

function App() {
  const { 
    setIsSettingsModalOpen, 
    settings,
    isMobile,
    setIsMobile,
    mobileActiveTab
  } = useAppStore()

  // Handle responsive layout and theme initialization
  useEffect(() => {
    // Initialize theme from settings
    if (settings.common?.theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Handle responsive layout
    const handleResize = () => {
      const mobile = window.innerWidth < 1024 // lg breakpoint
      setIsMobile(mobile)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [settings.common?.theme, setIsMobile])

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Main Layout */}
      <div className="flex flex-row h-full">
        {/* Desktop Layout */}
        {!isMobile && (
          <>
            {/* Left Panel - Input Area */}
            <div className="w-1/3 max-w-2xl bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
              <div className="p-6">
                <PromptInputArea />
              </div>
            </div>

            {/* Right Panel - Task List */}
            <div className="flex-1 min-h-0">
              <TaskList />
            </div>
          </>
        )}

        {/* Mobile Layout */}
        {isMobile && (
          <div className="flex-1 pb-16"> {/* Add bottom padding for tab bar */}
            {mobileActiveTab === 'input' && (
              <div className="h-full overflow-y-auto bg-white dark:bg-gray-800">
                <div className="p-4">
                  <PromptInputArea />
                </div>
              </div>
            )}
            {mobileActiveTab === 'tasks' && (
              <div className="h-full">
                <TaskList />
              </div>
            )}
          </div>
        )}
      </div>

      
      <div className={cn(
        "fixed flex z-40",
        isMobile ? "flex-col-reverse left-1 bottom-20 space-y-3 space-y-reverse" : "flex-row left-6 bottom-6 space-x-3"
        )}>
        {/* Settings Button */}
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="p-3 bg-gray-800 dark:bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
          title="设置"
        >
          <Cog6ToothIcon className="h-6 w-6" />
        </button>

        <ThemeToggle />
        
        {/* GitHub Button */}
        <a
          href="https://github.com/OptimisticQuan/AIImageGenTaskCreator"
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 bg-gray-800 dark:bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
          title="查看源代码"
        >
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
      </div>

      {/* Mobile Tab Bar */}
      {isMobile && <MobileTabBar />}

      {/* Modals */}
      <SettingsModal />
      <ImagePreviewModal />
    </div>
  )
}

export default App
