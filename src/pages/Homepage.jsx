import React from 'react'
import { Link } from 'react-router-dom'

const Homepage = () => {
  return (
    <div className="min-h-screen flex flex-col font-mono">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <i className="bi bi-diagram-3-fill text-blue-600"></i>
              <span>SwiftNexus Enterprise</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200">
                Login
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-br from-blue-50 to-gray-100 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">Enterprise SWIFT Message Platform</h1>
            <p className="text-xl text-gray-600 mb-8">
              Transform your banking operations with our comprehensive SWIFT messaging solution. Secure, compliant, and built for enterprise scale.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/login" className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2">
                <i className="bi bi-box-arrow-in-right"></i>
                Get Started
              </Link>
              <a href="#features" className="bg-gray-200 text-gray-800 px-6 py-3 rounded-md hover:bg-gray-300 transition-colors duration-200 flex items-center gap-2">
                <i className="bi bi-info-circle"></i>
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Enterprise Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <i className="bi bi-envelope-paper text-blue-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">SWIFT Messages</h3>
              <p className="text-gray-600 text-center">
                Complete support for all MT and MX message types with ISO 20022 compliance
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <i className="bi bi-shield-check text-green-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">Secure & Compliant</h3>
              <p className="text-gray-600 text-center">
                Enterprise-grade security with full audit trails and compliance management
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <i className="bi bi-building text-purple-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">Bank Management</h3>
              <p className="text-gray-600 text-center">
                Centralized administration for managing institutions and user assignments
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <i className="bi bi-graph-up text-orange-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">Analytics & Reporting</h3>
              <p className="text-gray-600 text-center">
                Real-time insights and comprehensive reporting for all message activities
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xl font-bold mb-4 md:mb-0">
              <i className="bi bi-diagram-3-fill text-blue-500"></i>
              <span>SwiftNexus Enterprise</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="text-center text-gray-400 text-sm">
            © 2025 SwiftNexus. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Homepage
