import React, { useState, useEffect } from 'react'
import api from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'
import { Card, Button, Input, Badge } from '../../components/UIComponents'

const VideoManagement = () => {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingVideo, setEditingVideo] = useState(null)
  const [formData, setFormData] = useState({})
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '', errors: [] })
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' })
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchVideos()
    fetchStats()
  }, [])

  const fetchVideos = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/videos')
      setVideos(response.data.videos || [])
    } catch (error) {
      console.error('Error fetching videos:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Loading Videos',
        message: error.response?.data?.message || 'Failed to load videos'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/videos/stats')
      setStats(response.data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      const videoData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
        duration: formData.duration ? parseFloat(formData.duration) : null
      }

      if (editingVideo) {
        await api.put(`/admin/videos/${editingVideo.id}`, videoData)
        setSuccessModal({
          isOpen: true,
          message: 'Video updated successfully'
        })
      } else {
        await api.post('/admin/videos', videoData)
        setSuccessModal({
          isOpen: true,
          message: 'Video created successfully'
        })
      }

      setFormData({})
      setShowForm(false)
      setEditingVideo(null)
      fetchVideos()
      fetchStats()
      
    } catch (error) {
      console.error('Error saving video:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Saving Video',
        message: error.response?.data?.message || 'Failed to save video',
        errors: error.response?.data?.errors || []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (video) => {
    setEditingVideo(video)
    setFormData({
      title: video.title,
      description: video.description,
      url: video.url,
      thumbnail: video.thumbnail,
      category: video.category,
      tags: video.tags ? video.tags.join(', ') : '',
      duration: video.duration,
      featured: video.featured,
      published: video.published
    })
    setShowForm(true)
  }

  const handleDelete = async (videoId) => {
    if (!confirm('Are you sure you want to delete this video?')) {
      return
    }
    
    try {
      setLoading(true)
      await api.delete(`/admin/videos/${videoId}`)
      
      setSuccessModal({
        isOpen: true,
        message: 'Video deleted successfully'
      })
      
      fetchVideos()
      fetchStats()
      
    } catch (error) {
      console.error('Error deleting video:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Deleting Video',
        message: error.response?.data?.message || 'Failed to delete video'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (videoId, field) => {
    try {
      const video = videos.find(v => v.id === videoId)
      await api.put(`/admin/videos/${videoId}`, {
        ...video,
        [field]: !video[field]
      })
      
      fetchVideos()
      fetchStats()
      
    } catch (error) {
      console.error('Error toggling video status:', error)
      setErrorModal({
        isOpen: true,
        title: 'Error Updating Video',
        message: error.response?.data?.message || 'Failed to update video'
      })
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 font-mono">Video Management</h2>
            <p className="text-gray-600 font-mono">Manage video content and media</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <i className="bi bi-plus-lg mr-2"></i>
            Add Video
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <div className="p-4">
                <div className="text-sm text-gray-600 font-mono">Total Videos</div>
                <div className="text-2xl font-bold text-gray-900 font-mono">{stats.total_videos}</div>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <div className="text-sm text-gray-600 font-mono">Published</div>
                <div className="text-2xl font-bold text-green-600 font-mono">{stats.published_videos}</div>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <div className="text-sm text-gray-600 font-mono">Featured</div>
                <div className="text-2xl font-bold text-blue-600 font-mono">{stats.featured_videos}</div>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <div className="text-sm text-gray-600 font-mono">Total Duration</div>
                <div className="text-2xl font-bold text-gray-900 font-mono">{formatDuration(stats.total_duration)}</div>
              </div>
            </Card>
          </div>
        )}

        {/* Videos List */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">Videos</h3>
            
            {videos.length === 0 ? (
              <div className="text-center py-8">
                <i className="bi bi-camera-video text-4xl text-gray-400 mb-4"></i>
                <p className="text-gray-500 font-mono">No videos found</p>
                <Button 
                  variant="secondary" 
                  onClick={() => setShowForm(true)}
                  className="mt-4"
                >
                  Add First Video
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {videos.map((video) => (
                  <div key={video.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900 font-mono">{video.title}</h4>
                          {video.published && <Badge variant="success">Published</Badge>}
                          {video.featured && <Badge variant="info">Featured</Badge>}
                          {video.category && <Badge variant="secondary">{video.category}</Badge>}
                        </div>
                        
                        <p className="text-gray-600 font-mono mb-3 line-clamp-2">{video.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 font-mono">
                          {video.duration && (
                            <span><i className="bi bi-clock mr-1"></i>{formatDuration(video.duration)}</span>
                          )}
                          {video.url && (
                            <span><i className="bi bi-link-45deg mr-1"></i>Video URL</span>
                          )}
                          <span><i className="bi bi-calendar3 mr-1"></i>{new Date(video.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        {video.tags && video.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {video.tags.map((tag, index) => (
                              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-mono">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleToggleStatus(video.id, 'published')}
                        >
                          {video.published ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleToggleStatus(video.id, 'featured')}
                        >
                          {video.featured ? 'Unfeature' : 'Feature'}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEdit(video)}
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(video.id)}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Video Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 font-mono mb-4">
                {editingVideo ? 'Edit Video' : 'Add New Video'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Video Title"
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter video title"
                  required
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-mono mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter video description"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-none"
                    required
                  />
                </div>
                
                <Input
                  label="Video URL"
                  value={formData.url || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com/video.mp4"
                  required
                />
                
                <Input
                  label="Thumbnail URL"
                  value={formData.thumbnail || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, thumbnail: e.target.value }))}
                  placeholder="https://example.com/thumbnail.jpg"
                />
                
                <Input
                  label="Category"
                  value={formData.category || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Tutorial, Product Demo, etc."
                />
                
                <Input
                  label="Duration (seconds)"
                  type="number"
                  value={formData.duration || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="300"
                />
                
                <Input
                  label="Tags (comma-separated)"
                  value={formData.tags || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="tutorial, demo, product"
                />
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.published || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, published: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-mono">Published</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.featured || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-mono">Featured</span>
                  </label>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Saving...' : (editingVideo ? 'Update Video' : 'Create Video')}
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => {
                      setShowForm(false)
                      setEditingVideo(null)
                      setFormData({})
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '', errors: [] })}
        title={errorModal.title}
        message={errorModal.message}
        errors={errorModal.errors}
        type="error"
      />
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        message={successModal.message}
      />
    </>
  )
}

export default VideoManagement
