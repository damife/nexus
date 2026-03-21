import React, { useState } from 'react'

const SelectContext = React.createContext(null)

export const Select = ({ value, onValueChange, children }) => {
  const [open, setOpen] = useState(false)
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative inline-block w-full">{children}</div>
    </SelectContext.Provider>
  )
}

export const SelectTrigger = ({ children, className = '' }) => {
  const { setOpen } = React.useContext(SelectContext)
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white text-left text-sm ${className}`}
    >
      {children}
    </button>
  )
}

export const SelectValue = ({ placeholder }) => {
  const { value } = React.useContext(SelectContext)
  return <span>{value || placeholder}</span>
}

export const SelectContent = ({ children, className = '' }) => {
  const { open, setOpen } = React.useContext(SelectContext)
  if (!open) return null
  return (
    <div
      className={`absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-auto ${className}`}
    >
      <div onClick={() => setOpen(false)}>{children}</div>
    </div>
  )
}

export const SelectItem = ({ value, children, key }) => {
  const { onValueChange, setOpen } = React.useContext(SelectContext)
  return (
    <div
      key={key}
      role="button"
      tabIndex={0}
      className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
      onClick={() => {
        onValueChange(value)
        setOpen(false)
      }}
      onKeyDown={(e) => e.key === 'Enter' && (onValueChange(value), setOpen(false))}
    >
      {children}
    </div>
  )
}
