const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  streamUrl: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['FM', 'Radio', 'News', 'Music', 'Religious', 'TV'],
    required: true
  },
  logoUrl: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Channel', channelSchema);
