import React, { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from '../../components/Layout'
import DashboardHome from './operator/DashboardHome'
import MessageQueue from './operator/MessageQueue'
import MessageEditor from './operator/MessageEditor'

const OperatorDashboard = ({ user, onLogout }) => {
  return (
    <Layout user={user} onLogout={onLogout} role="user">
      <Routes>
        <Route index element={<DashboardHome />} />
        <Route path="queue" element={<MessageQueue />} />
        <Route path="message/:id" element={<MessageEditor />} />
        <Route path="message/new" element={<MessageEditor />} />
      </Routes>
    </Layout>
  )
}

export default OperatorDashboard

