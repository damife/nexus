import React, { useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../../components/Layout'
import UserLanding from './Landing'
import UserDashboardInner from './UserDashboard'
import Profile from './Profile'
import BalanceDashboard from './BalanceDashboard'
import TwoFactorAuth from './TwoFactorAuth'
import IPWhitelist from './IPWhitelist'
import CorrespondentBanks from './CorrespondentBanks'
import StatusTrail from './StatusTrail'
import SwiftMessaging from './SwiftMessaging'
import SwiftMessageInputEnhanced from '../../components/SwiftMessageInputEnhanced'
import MessageHistory from './MessageHistory'
import Settings from './Settings'

const UserDashboard = ({ user, onLogout }) => {
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
    <Layout user={user} onLogout={onLogout} role="user">
      <Routes>
        <Route index element={<UserLanding />} />
        <Route path="dashboard" element={<UserDashboardInner user={user} onLogout={onLogout} />} />
        <Route path="profile" element={<Profile />} />
        <Route path="balance" element={<BalanceDashboard />} />
        <Route path="2fa" element={<TwoFactorAuth />} />
        <Route path="ip-whitelist" element={<IPWhitelist />} />
        <Route path="correspondent-banks" element={<CorrespondentBanks />} />
        <Route path="status-trail" element={<StatusTrail />} />
        <Route path="swift-messaging" element={<SwiftMessaging />} />
        <Route path="message-history" element={<MessageHistory />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default UserDashboard
