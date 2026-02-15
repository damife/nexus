import React from 'react'

const ErrorModal = ({ isOpen, onClose, title, message, errors = [], type = 'error' }) => {
  if (!isOpen) return null

  const iconClass = type === 'error' ? 'bi-exclamation-triangle' : 
                    type === 'warning' ? 'bi-exclamation-circle' : 
                    'bi-info-circle'
  
  const iconColors = {
    error: 'bg-red-100 text-red-600',
    warning: 'bg-yellow-100 text-yellow-600',
    info: 'bg-green-100 text-green-600'
  }

  const borderColors = {
    error: 'border-red-500',
    warning: 'border-yellow-500',
    info: 'border-blue-500'
  }

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
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${iconColors[type]}`}>
            <i className={`bi ${iconClass} text-xl`}></i>
          </div>
          <h2 className="flex-1 text-xl font-semibold text-gray-900 font-mono">{title || 'Error'}</h2>
          <button 
            className="bg-transparent border-none text-gray-500 cursor-pointer p-2 rounded-lg flex items-center justify-center text-xl transition-all hover:bg-gray-100 hover:text-gray-900"
            onClick={onClose}
            title="Close"
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
        <div className="p-6">
          {message && (
            <p className="text-base text-gray-900 leading-relaxed mb-4 font-mono">{message}</p>
          )}
          {errors && errors.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Details:</h3>
              <ul className="list-none p-0 m-0 space-y-2">
                {errors.map((error, index) => (
                  <li 
                    key={index}
                    className={`p-3 bg-gray-50 rounded-lg text-sm text-gray-900 border-l-4 ${borderColors[type]} font-mono`}
                  >
                    {typeof error === 'string' ? error : error.message || JSON.stringify(error)}
                  </li>
                ))}
              </ul>
            </div>
          )}
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

export default ErrorModal
