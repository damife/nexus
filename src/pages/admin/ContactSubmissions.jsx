import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import ErrorModal from '../../components/ErrorModal';
import SuccessModal from '../../components/SuccessModal';

const ContactSubmissions = () => {
  const [demoRequests, setDemoRequests] = useState([]);
  const [contactSubmissions, setContactSubmissions] = useState([]);
  const [activeTab, setActiveTab] = useState('demo');
  const [loading, setLoading] = useState(true);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] });
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'demo') {
        const response = await api.get('/contact/demo-requests');
        if (response.data.success) {
          setDemoRequests(response.data.requests || []);
        }
      } else {
        const response = await api.get('/contact/contact-submissions');
        if (response.data.success) {
          setContactSubmissions(response.data.submissions || []);
        }
      }
    } catch (error) {
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Submissions',
        message: error.response?.data?.message || 'Failed to load submissions',
        errors: []
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (type, id, status, notes) => {
    try {
      const endpoint = type === 'demo' ? `/contact/demo-requests/${id}` : `/contact/contact-submissions/${id}`;
      const response = await api.patch(endpoint, { status, adminNotes: notes });
      
      if (response.data.success) {
        setSuccessModal({ isOpen: true, message: 'Status updated successfully' });
        fetchData();
      }
    } catch (error) {
      setErrorModal({
        isOpen: true,
        title: 'Error Updating Status',
        message: error.response?.data?.message || 'Failed to update status',
        errors: []
      });
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-purple-100 text-purple-800',
      completed: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-emerald-100 text-emerald-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 font-mono">Contact Submissions</h1>
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('demo')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'demo'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Demo Requests ({demoRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'contact'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Contact Messages ({contactSubmissions.length})
            </button>
          </nav>
        </div>

        {activeTab === 'demo' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solution</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {demoRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {request.first_name} {request.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.company}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.solution_interest || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(request.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <select
                        value={request.status}
                        onChange={(e) => updateStatus('demo', request.id, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contactSubmissions.map((submission) => (
                  <tr key={submission.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {submission.first_name} {submission.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{submission.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{submission.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(submission.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(submission.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <select
                        value={submission.status}
                        onChange={(e) => updateStatus('contact', submission.id, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        <option value="new">New</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title={errorModal.title}
        message={errorModal.message}
        errors={errorModal.errors}
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
        message={successModal.message}
      />
    </>
  );
};

export default ContactSubmissions;



