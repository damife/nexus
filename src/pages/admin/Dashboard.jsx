import React, { useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../../components/Layout'
import AdminLanding from './Landing'
import AdminDashboard from './AdminDashboard'
import Banks from './Banks'
import Users from './Users'
import Monitoring from './Monitoring'
import PaymentMetrics from './PaymentMetrics'
import ContactSubmissions from './ContactSubmissions'
import TenantManagement from './TenantManagement'
import ContentManagement from './ContentManagement'
import VideoManagement from './VideoManagement'
import EmailSettings from './EmailSettings'
import CryptoSettings from './CryptoSettings'
import AnalyticsDashboard from './AnalyticsDashboard'
import SwiftMessaging from './SwiftMessaging'
import SystemHealth from './SystemHealth'

const AdminDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate()

  useEffect(() => {
    checkDatabaseInstallation()
  }, [])

  const checkDatabaseInstallation = async () => {
    try {
      const response = await axios.get('/api/installer/status')
      if (!response.data.installed) {
        navigate('/install', { replace: true })
      }
    } catch (error) {
      navigate('/install', { replace: true })
    }
  }

  return (
    <Layout user={user} onLogout={onLogout} role="admin">
      <Routes>
        <Route index element={<AdminLanding />} />
        <Route path="dashboard" element={<AdminDashboard user={user} onLogout={onLogout} />} />
        <Route path="tenants" element={<TenantManagement />} />
        <Route path="content" element={<ContentManagement />} />
        <Route path="videos" element={<VideoManagement />} />
        <Route path="email-settings" element={<EmailSettings />} />
        <Route path="crypto-settings" element={<CryptoSettings />} />
        <Route path="analytics" element={<AnalyticsDashboard />} />
        <Route path="banks" element={<Banks />} />
        <Route path="users" element={<Users />} />
        <Route path="monitoring" element={<Monitoring />} />
        <Route path="payments" element={<PaymentMetrics />} />
        <Route path="contact-submissions" element={<ContactSubmissions />} />
        <Route path="swift" element={<SwiftMessaging />} />
        <Route path="health" element={<SystemHealth />} />
      </Routes>
    </Layout>
  )
}

export default AdminDashboard
