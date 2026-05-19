import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaPlus, FaSearch, FaPlay, FaEdit, FaTrash, FaBroadcastTower } from 'react-icons/fa';
import api from '../services/api';
import ChannelModal from '../components/ChannelModal';
import AudioPlayer from '../components/AudioPlayer';

const Dashboard = () => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewName, setPreviewName] = useState('');
  
  const navigate = useNavigate();

  const fetchChannels = async () => {
    try {
      const res = await api.get('/channels');
      setChannels(res.data);
    } catch (err) {
      console.error('Failed to fetch channels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleSaveChannel = async (channelData) => {
    try {
      if (editingChannel) {
        await api.put(`/channels/${editingChannel._id}`, channelData);
      } else {
        await api.post('/channels', channelData);
      }
      setIsModalOpen(false);
      setEditingChannel(null);
      fetchChannels();
    } catch (err) {
      console.error('Failed to save channel');
      alert('Failed to save channel. Please check the data.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this channel?')) {
      try {
        await api.delete(`/channels/${id}`);
        fetchChannels();
      } catch (err) {
        console.error('Failed to delete channel');
      }
    }
  };

  const openAddModal = () => {
    setEditingChannel(null);
    setIsModalOpen(true);
  };

  const openEditModal = (channel) => {
    setEditingChannel(channel);
    setIsModalOpen(true);
  };

  const filteredChannels = channels.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isTV = c.category?.toLowerCase() === 'tv' || c.streamUrl?.includes('.m3u8') || c.streamUrl?.includes('chunklist');
    
    let matchesCategory = true;
    if (selectedCategory === 'FM') matchesCategory = !isTV;
    else if (selectedCategory === 'TV') matchesCategory = isTV;
    
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', 'FM', 'TV'];

  return (
    <div className="min-h-screen bg-dark-900 text-gray-200">
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-primary-600 p-2 rounded-lg">
                <FaBroadcastTower className="text-white text-xl" />
              </div>
              <span className="font-bold text-xl text-white tracking-tight">SriRadio Hub</span>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-dark-700"
            >
              <FaSignOutAlt />
              <span className="hidden sm:inline text-sm font-medium">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search channels..."
                className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Category Filter */}
            <div className="flex bg-dark-800 rounded-lg p-1 border border-dark-700 overflow-x-auto w-full md:w-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === cat 
                      ? 'bg-dark-700 text-white shadow' 
                      : 'text-gray-400 hover:text-white hover:bg-dark-700/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-primary-500/20 w-full md:w-auto justify-center"
          >
            <FaPlus /> Add Channel
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 flex flex-col justify-center shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-400 text-sm font-medium">Total Channels</span>
            </div>
            <span className="text-3xl font-bold text-white mt-1">{channels.length}</span>
          </div>
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 flex flex-col justify-center shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span className="text-gray-400 text-sm font-medium">TV Channels</span>
            </div>
            <span className="text-3xl font-bold text-blue-400 mt-1">
              {channels.filter(c => c.category?.toLowerCase() === 'tv' || c.streamUrl?.includes('.m3u8') || c.streamUrl?.includes('chunklist')).length}
            </span>
          </div>
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 flex flex-col justify-center shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span className="text-gray-400 text-sm font-medium">FM Radio</span>
            </div>
            <span className="text-3xl font-bold text-purple-400 mt-1">
              {channels.filter(c => !(c.category?.toLowerCase() === 'tv' || c.streamUrl?.includes('.m3u8') || c.streamUrl?.includes('chunklist'))).length}
            </span>
          </div>
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 flex flex-col justify-center shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              <span className="text-gray-400 text-sm font-medium">Active</span>
            </div>
            <span className="text-3xl font-bold text-green-400 mt-1">{channels.filter(c => c.isActive).length}</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-dark-800 border border-dark-700 rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-dark-700">
              <thead className="bg-dark-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Channel</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700 bg-dark-800">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400">Loading channels...</td>
                  </tr>
                ) : filteredChannels.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400">No channels found.</td>
                  </tr>
                ) : (
                  filteredChannels.map((channel) => (
                    <tr key={channel._id} className="hover:bg-dark-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-dark-900 border border-dark-700 flex items-center justify-center overflow-hidden shrink-0">
                            {channel.logoUrl ? (
                              <img src={channel.logoUrl} alt={channel.name} className="w-full h-full object-cover" />
                            ) : (
                              <FaBroadcastTower className="text-gray-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white">{channel.name}</div>
                            <div className="text-xs text-gray-500 truncate w-32 md:w-64" title={channel.streamUrl}>{channel.streamUrl}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-md border ${
                          (channel.category?.toLowerCase() === 'tv' || channel.streamUrl?.includes('.m3u8')) 
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }`}>
                          {(channel.category?.toLowerCase() === 'tv' || channel.streamUrl?.includes('.m3u8')) ? 'TV' : 'FM'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          channel.isActive 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${channel.isActive ? 'bg-green-400' : 'bg-red-400'}`}></span>
                          {channel.isActive ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => { setPreviewUrl(channel.streamUrl); setPreviewName(channel.name); }}
                            className="p-2 text-primary-400 hover:text-primary-300 hover:bg-primary-400/10 rounded transition-colors"
                            title="Test Play"
                          >
                            <FaPlay />
                          </button>
                          <button 
                            onClick={() => openEditModal(channel)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded transition-colors"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button 
                            onClick={() => handleDelete(channel._id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modals & Overlays */}
      <ChannelModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        channel={editingChannel}
        onSave={handleSaveChannel}
      />

      {previewUrl && (
        <AudioPlayer 
          streamUrl={previewUrl}
          channelName={previewName}
          onClose={() => { setPreviewUrl(null); setPreviewName(''); }} 
        />
      )}
    </div>
  );
};

export default Dashboard;
