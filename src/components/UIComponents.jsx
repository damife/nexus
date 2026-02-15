import React from 'react'

// Modern Button Component - No Purple Colors
export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  loading = false, 
  className = '', 
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 disabled:bg-gray-50',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-green-300',
    warning: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500 disabled:bg-orange-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300',
    outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500'
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
      )}
      {children}
    </button>
  )
}

// Modern Card Component
export const Card = ({ children, className = '', hover = false, ...props }) => {
  const baseClasses = 'bg-white rounded-lg shadow-sm border border-gray-200'
  const hoverClasses = hover ? 'hover:shadow-md hover:border-gray-300 transition-all duration-200' : ''
  
  return (
    <div className={`${baseClasses} ${hoverClasses} ${className}`} {...props}>
      {children}
    </div>
  )
}

// Modern Badge Component
export const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className = '' 
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full'
  
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-orange-100 text-orange-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-cyan-100 text-cyan-800'
  }
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-sm'
  }

  return (
    <span className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  )
}

// Modern Input Component
export const Input = ({ 
  label, 
  error, 
  helper, 
  className = '', 
  ...props 
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 font-mono">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${
          error ? 'border-red-300 focus:ring-red-500' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 font-mono">{error}</p>
      )}
      {helper && !error && (
        <p className="text-sm text-gray-500 font-mono">{helper}</p>
      )}
    </div>
  )
}

// Modern Select Component
export const Select = ({ 
  label, 
  error, 
  helper, 
  options = [], 
  className = '', 
  ...props 
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 font-mono">
          {label}
        </label>
      )}
      <select
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono bg-white ${
          error ? 'border-red-300 focus:ring-red-500' : ''
        } ${className}`}
        {...props}
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600 font-mono">{error}</p>
      )}
      {helper && !error && (
        <p className="text-sm text-gray-500 font-mono">{helper}</p>
      )}
    </div>
  )
}

// Modern Textarea Component
export const Textarea = ({ 
  label, 
  error, 
  helper, 
  className = '', 
  ...props 
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 font-mono">
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono resize-none ${
          error ? 'border-red-300 focus:ring-red-500' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 font-mono">{error}</p>
      )}
      {helper && !error && (
        <p className="text-sm text-gray-500 font-mono">{helper}</p>
      )}
    </div>
  )
}

// Modern Alert Component
export const Alert = ({ 
  children, 
  variant = 'info', 
  className = '', 
  ...props 
}) => {
  const baseClasses = 'p-4 rounded-lg border'
  
  const variants = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-orange-50 border-orange-200 text-orange-800',
    danger: 'bg-red-50 border-red-200 text-red-800'
  }

  const icons = {
    info: 'bi-info-circle',
    success: 'bi-check-circle',
    warning: 'bi-exclamation-triangle',
    danger: 'bi-x-circle'
  }

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
      <div className="flex items-start gap-2">
        <i className={`bi ${icons[variant]} mt-0.5`}></i>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}

// Modern Loading Spinner
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <div className={`inline-block animate-spin rounded-full border-b-2 border-blue-600 ${sizes[size]} ${className}`}></div>
  )
}

// Modern Modal Component
export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  className = '' 
}) => {
  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className={`bg-white rounded-xl shadow-2xl w-full mx-4 ${sizes[size]} ${className}`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 font-mono">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="bi bi-x text-xl"></i>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

// Modern Tabs Component
export const Tabs = ({ tabs, activeTab, onTabChange, className = '' }) => {
  return (
    <div className={className}>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm font-mono transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-4">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  )
}

// Modern Progress Bar
export const ProgressBar = ({ 
  value = 0, 
  max = 100, 
  variant = 'primary', 
  className = '' 
}) => {
  const percentage = Math.min((value / max) * 100, 100)
  
  const variants = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-orange-600',
    danger: 'bg-red-600'
  }

  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div
        className={`${variants[variant]} h-2 rounded-full transition-all duration-300`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  )
}

// Modern Tooltip Component
export const Tooltip = ({ 
  children, 
  content, 
  position = 'top',
  className = '' 
}) => {
  const [isVisible, setIsVisible] = React.useState(false)

  const positions = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className={className}
      >
        {children}
      </div>
      {isVisible && (
        <div className={`absolute z-10 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap ${positions[position]}`}>
          {content}
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45"></div>
        </div>
      )}
    </div>
  )
}

// Modern Skeleton Loader
export const Skeleton = ({ 
  lines = 1, 
  className = '' 
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{ width: index === lines - 1 ? '60%' : '100%' }}
        ></div>
      ))}
    </div>
  )
}

// Modern Breadcrumb Component
export const Breadcrumb = ({ 
  items, 
  className = '' 
}) => {
  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <i className="bi bi-chevron-right text-gray-400"></i>
          )}
          {item.href ? (
            <a
              href={item.href}
              className="text-gray-500 hover:text-gray-700 font-mono"
            >
              {item.label}
            </a>
          ) : (
            <span className="text-gray-900 font-medium font-mono">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
