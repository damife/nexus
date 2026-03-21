import React from 'react'

const TabsContext = React.createContext({ value: '', onValueChange: () => {} })

export const Tabs = ({ value, onValueChange, children, className = '' }) => (
  <TabsContext.Provider value={{ value, onValueChange }}>
    <div className={className}>{children}</div>
  </TabsContext.Provider>
)

export const TabsList = ({ children, className = '' }) => {
  const { value, onValueChange } = React.useContext(TabsContext)
  return (
    <div className={`flex border-b border-gray-200 mb-4 ${className}`}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) && child.props.value
          ? React.cloneElement(child, { active: child.props.value === value, onSelect: () => onValueChange(child.props.value) })
          : child
      )}
    </div>
  )
}

export const TabsTrigger = ({ children, value, active, onSelect, className = '' }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
      active ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    } ${className}`}
  >
    {children}
  </button>
)

export const TabsContent = ({ value, children, className = '' }) => {
  const { value: activeValue } = React.useContext(TabsContext)
  if (value !== activeValue) return null
  return <div className={className}>{children}</div>
}
