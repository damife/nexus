import React from 'react'
import { Alert as UIAlert } from '../UIComponents'

export const Alert = ({ children, variant = 'info', className = '', ...props }) => (
  <UIAlert variant={variant === 'destructive' ? 'danger' : variant} className={className} {...props}>
    {children}
  </UIAlert>
)

export const AlertDescription = ({ children, className = '', ...props }) => (
  <span className={className} {...props}>{children}</span>
)
