// This file is replaced by Landing.jsx for admin
// Keeping for backward compatibility
import React from 'react'
import { Navigate } from 'react-router-dom'

const AdminHome = () => {
  return <Navigate to="/admin" replace />
}

export default AdminHome

