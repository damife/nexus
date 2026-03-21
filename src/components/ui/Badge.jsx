import React from 'react'
import { Badge as UIBadge } from '../UIComponents'

export const Badge = ({ variant = 'default', ...props }) => (
  <UIBadge variant={variant === 'destructive' ? 'danger' : variant} {...props} />
)
