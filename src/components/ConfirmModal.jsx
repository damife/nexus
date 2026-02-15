import React from 'react'

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) => {
  if (!isOpen) return null

  const iconClass = type === 'warning' ? 'bi-exclamation-triangle' : 
                    type === 'danger' ? 'bi-exclamation-circle' : 
                    'bi-question-circle'
  
  const iconColors = {
    warning: 'bg-yellow-100 text-yellow-600',
    danger: 'bg-red-100 text-red-600',
    info: 'bg-blue-100 text-blue-600'
  }

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl max-w-md w-[90%] shadow-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 p-6 border-b border-gray-200 relative">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${iconColors[type]}`}>
            <i className={`bi ${iconClass} text-xl`}></i>
          </div>
          <h2 className="flex-1 text-xl font-semibold text-gray-900 font-mono">{title || 'Confirm Action'}</h2>
          <button 
            className="bg-transparent border-none text-gray-500 cursor-pointer p-2 rounded-lg flex items-center justify-center text-xl transition-all hover:bg-gray-100 hover:text-gray-900"
            onClick={onClose}
            title="Close"
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
        <div className="p-6">
          <p className="text-base text-gray-900 leading-relaxed font-mono">{message}</p>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-4">
          <button 
            className="px-6 py-2.5 bg-gray-100 text-gray-900 rounded-lg font-medium cursor-pointer transition-all hover:bg-gray-200 font-mono"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            className={`px-6 py-2.5 rounded-lg font-medium cursor-pointer transition-all font-mono ${
              type === 'danger' 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal

