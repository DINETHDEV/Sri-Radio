import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

const ChannelModal = ({ isOpen, onClose, channel, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    streamUrl: '',
    category: 'FM',
    logoUrl: '',
    isActive: true
  });

  useEffect(() => {
    if (channel) {
      setFormData({
        name: channel.name || '',
        streamUrl: channel.streamUrl || '',
        category: channel.category || 'FM',
        logoUrl: channel.logoUrl || '',
        isActive: channel.isActive !== undefined ? channel.isActive : true
      });
    } else {
      setFormData({
        name: '',
        streamUrl: '',
        category: 'FM',
        logoUrl: '',
        isActive: true
      });
    }
  }, [channel, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
        <div className="flex justify-between items-center p-6 border-b border-dark-700">
          <h2 className="text-xl font-semibold text-white">
            {channel ? 'Edit Channel' : 'Add New Channel'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Channel Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors"
              placeholder="e.g. Sirasa FM"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Stream URL</label>
            <input
              type="url"
              name="streamUrl"
              value={formData.streamUrl}
              onChange={handleChange}
              required
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors"
            >
              <option value="FM">FM</option>
              <option value="Radio">Radio</option>
              <option value="News">News</option>
              <option value="Music">Music</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Logo URL (Optional)</label>
            <input
              type="url"
              name="logoUrl"
              value={formData.logoUrl}
              onChange={handleChange}
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors"
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center pt-2">
            <input
              type="checkbox"
              name="isActive"
              id="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="w-4 h-4 text-primary-600 bg-dark-900 border-dark-700 rounded focus:ring-primary-500 focus:ring-offset-dark-800"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-300">
              Channel is Active
            </label>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-dark-700 hover:bg-dark-600 text-white font-medium py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-medium py-2 rounded-lg transition-colors shadow-lg shadow-primary-500/20"
            >
              {channel ? 'Update' : 'Add Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChannelModal;
