import React, { useState, useEffect } from 'react';
import contentApi from '../../services/contentApi';

const ContentManagement = () => {
  const [activeTab, setActiveTab] = useState('careers');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [stats, setStats] = useState(null);

  // Content type configurations
  const contentTypes = {
    careers: {
      label: 'Careers',
      api: contentApi.careers,
      fields: [
        { name: 'title', label: 'Job Title', type: 'text', required: true },
        { name: 'department', label: 'Department', type: 'text', required: true },
        { name: 'location', label: 'Location', type: 'text', required: true },
        { name: 'type', label: 'Employment Type', type: 'select', options: ['Full-time', 'Part-time', 'Contract', 'Remote'], required: true },
        { name: 'description', label: 'Description', type: 'textarea', required: true },
        { name: 'requirements', label: 'Requirements (one per line)', type: 'textarea', required: true },
        { name: 'responsibilities', label: 'Responsibilities (one per line)', type: 'textarea', required: true },
        { name: 'salary', label: 'Salary Range', type: 'text', required: false },
        { name: 'active', label: 'Active', type: 'checkbox', required: false },
      ],
    },
    news: {
      label: 'News',
      api: contentApi.news,
      fields: [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'slug', label: 'URL Slug', type: 'text', required: true },
        { name: 'excerpt', label: 'Excerpt', type: 'textarea', required: true },
        { name: 'content', label: 'Content', type: 'textarea', required: true },
        { name: 'image', label: 'Image URL', type: 'text', required: false },
        { name: 'author', label: 'Author', type: 'text', required: true },
        { name: 'category', label: 'Category', type: 'text', required: true },
        { name: 'tags', label: 'Tags (comma-separated)', type: 'text', required: false },
        { name: 'published', label: 'Published', type: 'checkbox', required: false },
      ],
    },
    blogs: {
      label: 'Blogs',
      api: contentApi.blogs,
      fields: [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'slug', label: 'URL Slug', type: 'text', required: true },
        { name: 'excerpt', label: 'Excerpt', type: 'textarea', required: true },
        { name: 'content', label: 'Content', type: 'textarea', required: true },
        { name: 'image', label: 'Image URL', type: 'text', required: false },
        { name: 'author', label: 'Author', type: 'text', required: true },
        { name: 'category', label: 'Category', type: 'text', required: true },
        { name: 'tags', label: 'Tags (comma-separated)', type: 'text', required: false },
        { name: 'readTime', label: 'Read Time (minutes)', type: 'number', required: false },
        { name: 'published', label: 'Published', type: 'checkbox', required: false },
      ],
    },
    videos: {
      label: 'Videos',
      api: contentApi.videos,
      fields: [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'slug', label: 'URL Slug', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'textarea', required: true },
        { name: 'videoUrl', label: 'Video URL', type: 'text', required: true },
        { name: 'thumbnail', label: 'Thumbnail URL', type: 'text', required: false },
        { name: 'duration', label: 'Duration (minutes)', type: 'number', required: false },
        { name: 'category', label: 'Category', type: 'text', required: true },
        { name: 'tags', label: 'Tags (comma-separated)', type: 'text', required: false },
        { name: 'published', label: 'Published', type: 'checkbox', required: false },
      ],
    },
    events: {
      label: 'Events',
      api: contentApi.events,
      fields: [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'slug', label: 'URL Slug', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'textarea', required: true },
        { name: 'location', label: 'Location', type: 'text', required: true },
        { name: 'venue', label: 'Venue', type: 'text', required: false },
        { name: 'eventType', label: 'Event Type', type: 'select', options: ['Conference', 'Workshop', 'Webinar', 'Meetup', 'Other'], required: true },
        { name: 'startDate', label: 'Start Date', type: 'datetime-local', required: true },
        { name: 'endDate', label: 'End Date', type: 'datetime-local', required: true },
        { name: 'timezone', label: 'Timezone', type: 'text', required: true },
        { name: 'registrationUrl', label: 'Registration URL', type: 'text', required: false },
        { name: 'image', label: 'Image URL', type: 'text', required: false },
        { name: 'capacity', label: 'Capacity', type: 'number', required: false },
        { name: 'tags', label: 'Tags (comma-separated)', type: 'text', required: false },
        { name: 'published', label: 'Published', type: 'checkbox', required: false },
      ],
    },
    webinars: {
      label: 'Webinars',
      api: contentApi.webinars,
      fields: [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'slug', label: 'URL Slug', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'textarea', required: true },
        { name: 'presenter', label: 'Presenter Name', type: 'text', required: true },
        { name: 'presenterTitle', label: 'Presenter Title', type: 'text', required: true },
        { name: 'presenterBio', label: 'Presenter Bio', type: 'textarea', required: false },
        { name: 'webinarUrl', label: 'Webinar URL', type: 'text', required: true },
        { name: 'startDate', label: 'Start Date & Time', type: 'datetime-local', required: true },
        { name: 'duration', label: 'Duration (minutes)', type: 'number', required: true },
        { name: 'timezone', label: 'Timezone', type: 'text', required: true },
        { name: 'registrationUrl', label: 'Registration URL', type: 'text', required: false },
        { name: 'image', label: 'Image URL', type: 'text', required: false },
        { name: 'maxAttendees', label: 'Max Attendees', type: 'number', required: false },
        { name: 'tags', label: 'Tags (comma-separated)', type: 'text', required: false },
        { name: 'published', label: 'Published', type: 'checkbox', required: false },
      ],
    },
    glossary: {
      label: 'Glossary',
      api: contentApi.glossary,
      fields: [
        { name: 'term', label: 'Term', type: 'text', required: true },
        { name: 'fullForm', label: 'Full Form/Acronym', type: 'text', required: false },
        { name: 'definition', label: 'Definition', type: 'textarea', required: true },
        { name: 'category', label: 'Category', type: 'text', required: true },
        { name: 'relatedTerms', label: 'Related Terms (comma-separated)', type: 'text', required: false },
        { name: 'published', label: 'Published', type: 'checkbox', required: false },
      ],
    },
    applications: {
      label: 'Job Applications',
      api: contentApi.applications,
      readOnly: true, // Applications are read-only, only status can be updated
      fields: [
        { name: 'first_name', label: 'First Name', type: 'text', required: true, readOnly: true },
        { name: 'last_name', label: 'Last Name', type: 'text', required: true, readOnly: true },
        { name: 'email', label: 'Email', type: 'email', required: true, readOnly: true },
        { name: 'phone', label: 'Phone', type: 'text', required: false, readOnly: true },
        { name: 'position_applied', label: 'Position Applied', type: 'text', required: true, readOnly: true },
        { name: 'experience_years', label: 'Experience (Years)', type: 'number', required: false, readOnly: true },
        { name: 'current_company', label: 'Current Company', type: 'text', required: false, readOnly: true },
        { name: 'education_level', label: 'Education Level', type: 'text', required: false, readOnly: true },
        { name: 'skills', label: 'Skills', type: 'textarea', required: false, readOnly: true },
        { name: 'status', label: 'Application Status', type: 'select', options: ['pending', 'reviewing', 'shortlisted', 'rejected', 'hired'], required: true, readOnly: false },
        { name: 'admin_notes', label: 'Admin Notes', type: 'textarea', required: false, readOnly: false },
      ],
    },
    contact: {
      label: 'Contact Submissions',
      api: contentApi.contact,
      readOnly: true,
      fields: [
        { name: 'first_name', label: 'First Name', type: 'text', required: true, readOnly: true },
        { name: 'last_name', label: 'Last Name', type: 'text', required: true, readOnly: true },
        { name: 'email', label: 'Email', type: 'email', required: true, readOnly: true },
        { name: 'company', label: 'Company', type: 'text', required: false, readOnly: true },
        { name: 'subject', label: 'Subject', type: 'text', required: true, readOnly: true },
        { name: 'message', label: 'Message', type: 'textarea', required: true, readOnly: true },
        { name: 'status', label: 'Status', type: 'select', options: ['new', 'in_progress', 'resolved'], required: true, readOnly: false },
        { name: 'admin_notes', label: 'Admin Notes', type: 'textarea', required: false, readOnly: false },
      ],
    },
    demoRequests: {
      label: 'Demo Requests',
      api: contentApi.demoRequests,
      readOnly: true,
      fields: [
        { name: 'first_name', label: 'First Name', type: 'text', required: true, readOnly: true },
        { name: 'last_name', label: 'Last Name', type: 'text', required: true, readOnly: true },
        { name: 'email', label: 'Email', type: 'email', required: true, readOnly: true },
        { name: 'company', label: 'Company', type: 'text', required: false, readOnly: true },
        { name: 'job_title', label: 'Job Title', type: 'text', required: false, readOnly: true },
        { name: 'phone', label: 'Phone', type: 'text', required: false, readOnly: true },
        { name: 'solution_interest', label: 'Solution Interest', type: 'text', required: false, readOnly: true },
        { name: 'message', label: 'Message', type: 'textarea', required: false, readOnly: true },
        { name: 'status', label: 'Status', type: 'select', options: ['new', 'contacted', 'scheduled', 'completed'], required: true, readOnly: false },
        { name: 'admin_notes', label: 'Admin Notes', type: 'textarea', required: false, readOnly: false },
      ],
    },
  };

  const currentType = contentTypes[activeTab];

  useEffect(() => {
    loadItems();
    loadStats();
  }, [activeTab]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await currentType.api.getAll();
      setItems(response.data.items || response.data);
    } catch (error) {
      console.error('Error loading items:', error);
      alert('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      if (activeTab === 'applications') {
        const response = await contentApi.applications.getStats();
        setStats(response.data);
      } else if (activeTab === 'contact') {
        const response = await contentApi.contact.getStats();
        setStats(response.data);
      } else if (activeTab === 'demoRequests') {
        const response = await contentApi.demoRequests.getStats();
        setStats(response.data);
      } else {
        const response = await contentApi.stats.getAll();
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({});
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    // Prevent deletion of applications, contact submissions, and demo requests
    if (activeTab === 'applications' || activeTab === 'contact' || activeTab === 'demoRequests') {
      const typeNames = {
        applications: 'Applications',
        contact: 'Contact submissions',
        demoRequests: 'Demo requests'
      };
      alert(`${typeNames[activeTab]} cannot be deleted for record-keeping purposes`);
      return;
    }

    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await currentType.api.delete(id);
      await loadItems();
      await loadStats();
      alert('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Process form data
      const processedData = { ...formData };

      // Handle applications, contact, and demo requests differently (only status and admin notes can be updated)
      if (activeTab === 'applications' || activeTab === 'contact' || activeTab === 'demoRequests') {
        if (!editingItem) {
          const typeNames = {
            applications: 'Applications',
            contact: 'Contact submissions',
            demoRequests: 'Demo requests'
          };
          alert(`${typeNames[activeTab]} cannot be created manually`);
          return;
        }
        
        // Only send status and admin notes for these types
        const updateData = {
          status: processedData.status,
          admin_notes: processedData.admin_notes
        };
        
        await currentType.api.update(editingItem.id, updateData);
        const typeNames = {
          applications: 'Application',
          contact: 'Contact submission',
          demoRequests: 'Demo request'
        };
        alert(`${typeNames[activeTab]} status updated successfully`);
      } else {
        // Convert comma-separated strings to arrays
        if (processedData.requirements && typeof processedData.requirements === 'string') {
          processedData.requirements = processedData.requirements.split('\n').filter(r => r.trim());
        }
        if (processedData.responsibilities && typeof processedData.responsibilities === 'string') {
          processedData.responsibilities = processedData.responsibilities.split('\n').filter(r => r.trim());
        }
        if (processedData.tags && typeof processedData.tags === 'string') {
          processedData.tags = processedData.tags.split(',').map(t => t.trim()).filter(t => t);
        }
        if (processedData.relatedTerms && typeof processedData.relatedTerms === 'string') {
          processedData.relatedTerms = processedData.relatedTerms.split(',').map(t => t.trim()).filter(t => t);
        }

        if (editingItem) {
          await currentType.api.update(editingItem.id, processedData);
          alert('Item updated successfully');
        } else {
          await currentType.api.create(processedData);
          alert('Item created successfully');
        }
      }

      setShowForm(false);
      setFormData({});
      setEditingItem(null);
      await loadItems();
      await loadStats();
    } catch (error) {
      console.error('Error saving item:', error);
      alert(error.response?.data?.message || 'Failed to save item');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const renderField = (field) => {
    const value = formData[field.name] || '';
    const isReadOnly = field.readOnly || false;

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            name={field.name}
            value={value}
            onChange={handleInputChange}
            required={field.required}
            readOnly={isReadOnly}
            className={`w-full p-3 border border-gray-300 rounded-lg font-mono ${isReadOnly ? 'bg-gray-100' : ''}`}
            rows="4"
          />
        );

      case 'select':
        return (
          <select
            name={field.name}
            value={value}
            onChange={handleInputChange}
            required={field.required}
            disabled={isReadOnly}
            className={`w-full p-3 border border-gray-300 rounded-lg font-mono ${isReadOnly ? 'bg-gray-100' : ''}`}
          >
            <option value="">Select {field.label}</option>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            name={field.name}
            checked={!!value}
            onChange={handleInputChange}
            disabled={isReadOnly}
            className="w-5 h-5 text-blue-600"
          />
        );

      default:
        return (
          <input
            type={field.type}
            name={field.name}
            value={value}
            onChange={handleInputChange}
            required={field.required}
            readOnly={isReadOnly}
            className={`w-full p-3 border border-gray-300 rounded-lg font-mono ${isReadOnly ? 'bg-gray-100' : ''}`}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
          {!currentType.readOnly && (
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-mono"
            >
              <i className="bi bi-plus-circle mr-2"></i>
              Create New
            </button>
          )}
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            {activeTab === 'applications' ? (
              <>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500 font-mono">Total Applications</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500 font-mono">Pending</div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500 font-mono">Reviewing</div>
                  <div className="text-2xl font-bold text-blue-600">{stats.reviewing || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500 font-mono">Shortlisted</div>
                  <div className="text-2xl font-bold text-green-600">{stats.shortlisted || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500 font-mono">Rejected</div>
                  <div className="text-2xl font-bold text-red-600">{stats.rejected || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500 font-mono">Hired</div>
                  <div className="text-2xl font-bold text-emerald-600">{stats.hired || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500 font-mono">Last 30 Days</div>
                  <div className="text-2xl font-bold text-purple-600">{stats.last_30_days || 0}</div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500 font-mono">Careers</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.careers?.total || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500 font-mono">News</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.news?.total || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500 font-mono">Blogs</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.blogs?.total || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500 font-mono">Videos</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.videos?.total || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500 font-mono">Events</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.events?.total || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500 font-mono">Webinars</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.webinars?.total || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500 font-mono">Glossary</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.glossary?.total || 0}</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Content Type Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex space-x-4 px-6" aria-label="Tabs">
              {Object.entries(contentTypes).map(([key, type]) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveTab(key);
                    setShowForm(false);
                  }}
                  className={`py-4 px-4 border-b-2 font-mono text-sm whitespace-nowrap ${
                    activeTab === key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {showForm ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 font-mono">
                  {editingItem ? 'Edit' : 'Create'} {currentType.label}
                </h2>

                {currentType.fields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-mono">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderField(field)}
                  </div>
                ))}

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-mono"
                  >
                    {editingItem ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setFormData({});
                      setEditingItem(null);
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-mono"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600 font-mono">Loading...</p>
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="bi bi-inbox text-6xl text-gray-300"></i>
                    <p className="mt-4 text-gray-600 font-mono">No items found</p>
                    <button
                      onClick={handleCreate}
                      className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-mono"
                    >
                      Create First Item
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">
                            Title/Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">
                            Created
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider font-mono">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 font-mono">
                                {item.title || item.term}
                              </div>
                              {item.department && (
                                <div className="text-sm text-gray-500 font-mono">{item.department}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full font-mono ${
                                  item.published || item.active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {item.published || item.active ? 'Published' : 'Draft'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleEdit(item)}
                                className="text-blue-600 hover:text-blue-900 mr-4 font-mono"
                              >
                                <i className="bi bi-pencil"></i> Edit
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-red-600 hover:text-red-900 font-mono"
                              >
                                <i className="bi bi-trash"></i> Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentManagement;
