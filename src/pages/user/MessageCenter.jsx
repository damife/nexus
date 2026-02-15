import React from 'react'
import { Link } from 'react-router-dom'

const MessageCenter = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 font-mono mb-2">Message Center</h1>
        <p className="text-gray-600 font-mono">Create and manage SWIFT messages</p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <i className="bi bi-envelope-paper text-blue-600 text-3xl"></i>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 font-mono mb-2">Message Creation Interface</h2>
        <p className="text-gray-600 font-mono mb-6">
          Message creation interface will be integrated here. This will use the existing message types and form builder from the system.
        </p>
        <Link to="/user/message/new" className="btn btn-primary">
          <i className="bi bi-plus-circle"></i>
          Create New Message
        </Link>
      </div>
    </div>
  )
}

export default MessageCenter
