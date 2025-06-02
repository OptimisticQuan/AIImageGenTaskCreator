import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { useAppStore } from './store/appStore'
import PromptInputArea from './components/PromptInputArea'
import TaskList from './components/TaskList'
import SettingsModal from './components/SettingsModal'
import ImagePreviewModal from './components/ImagePreviewModal'

function App() {
  const { setIsSettingsModalOpen } = useAppStore()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left Panel - Input Area */}
        <div className="lg:w-1/3 lg:max-w-2xl p-6 bg-white lg:bg-gray-50 border-r border-gray-200">
          <div className="sticky top-6">
            <PromptInputArea />
          </div>
        </div>

        {/* Right Panel - Task List */}
        <div className="flex-1 p-6">
          <TaskList />
        </div>
      </div>

      {/* Settings Button */}
      <button
        onClick={() => setIsSettingsModalOpen(true)}
        className="fixed bottom-6 left-6 p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors z-40"
        title="设置"
      >
        <Cog6ToothIcon className="h-6 w-6" />
      </button>

      {/* Modals */}
      <SettingsModal />
      <ImagePreviewModal />
    </div>
  )
}

export default App
