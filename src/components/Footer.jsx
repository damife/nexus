import React from 'react'
import { Link } from 'react-router-dom'

const Footer = ({ role }) => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-300 py-8 border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <i className="bi bi-diagram-3-fill text-2xl text-emerald-400"></i>
              <span className="text-xl font-bold text-white">SwiftNexus</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Integrated solutions for payments, financial crime and compliance.
            </p>
            <div className="flex space-x-4">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                <i className="bi bi-linkedin text-xl"></i>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                <i className="bi bi-twitter text-xl"></i>
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                <i className="bi bi-github text-xl"></i>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to={role === 'admin' ? '/admin' : '/user'} className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to={role === 'admin' ? '/admin/swift-messaging' : '/user/swift-messaging'} className="text-gray-400 hover:text-emerald-400 transition-colors">
                  SWIFT Messaging
                </Link>
              </li>
              <li>
                <Link to={role === 'admin' ? '/admin/system-health' : '/user/message-history'} className="text-gray-400 hover:text-emerald-400 transition-colors">
                  {role === 'admin' ? 'System Health' : 'Message History'}
                </Link>
              </li>
              <li>
                <Link to={role === 'admin' ? '/admin/banks' : '/user/settings'} className="text-gray-400 hover:text-emerald-400 transition-colors">
                  {role === 'admin' ? 'Bank Management' : 'Settings'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://swiftnexus.org/resources/documentation" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="https://swiftnexus.org/resources/api" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  API Reference
                </a>
              </li>
              <li>
                <a href="https://swiftnexus.org/resources/support" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Support
                </a>
              </li>
              <li>
                <a href="https://swiftnexus.org/resources/blog" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://swiftnexus.org/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="https://swiftnexus.org/legal/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="https://swiftnexus.org/legal/cookie-policy" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="https://swiftnexus.org/legal/compliance" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  Compliance
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4 md:mb-0">
            <p>&copy; 2018 - {currentYear} SwiftNexus. All rights reserved.</p>
            <span className="hidden md:inline-block">|</span>
            <p>Enterprise SWIFT Messaging Platform</p>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://swiftnexus.org" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
              swiftnexus.org
            </a>
            <div className="flex items-center gap-2">
              <i className="bi bi-shield-check text-emerald-400"></i>
              <span className="text-xs">Enterprise Security</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="bi bi-globe text-emerald-400"></i>
              <span className="text-xs">Global Reach</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
