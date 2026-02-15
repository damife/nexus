import React from 'react'
import Login from './Login'

const AdminLogin = ({ onLogin }) => {
  return <Login onLogin={onLogin} isAdminLogin={true} />
}

export default AdminLogin
