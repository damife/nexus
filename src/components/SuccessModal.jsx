import React from 'react'

const SuccessModal = ({ isOpen, onClose, message, title = 'Success' }) => {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl max-w-lg w-[90%] max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 p-6 border-b border-gray-200 relative">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100 text-green-600">
            <i className="bi bi-check-circle-fill text-xl"></i>
          </div>
          <h2 className="flex-1 text-xl font-semibold text-gray-900 font-mono">{title}</h2>
          <button 
            className="bg-transparent border-none text-gray-500 cursor-pointer p-2 rounded-lg flex items-center justify-center text-xl transition-all hover:bg-gray-100 hover:text-gray-900"
            onClick={onClose}
            title="Close"
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
        <div className="p-6">
          <p className="text-base text-green-600 leading-relaxed font-mono">{message}</p>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-4">
          <button 
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium cursor-pointer flex items-center gap-2 transition-all hover:bg-blue-700 font-mono"
            onClick={onClose}
          >
            <i className="bi bi-check"></i>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

export default SuccessModal
