const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const { protect } = require('../middleware/auth');

// @desc    Get all channels
// @route   GET /api/channels
// @access  Public
router.get('/', async (req, res) => {
  try {
    const channels = await Channel.find({}).sort({ name: 1 });
    res.json(channels);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create a channel
// @route   POST /api/channels
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, streamUrl, category, logoUrl, isActive } = req.body;

    const newChannel = await Channel.create({
      name,
      streamUrl,
      category,
      logoUrl: logoUrl || '',
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json(newChannel);
  } catch (error) {
    res.status(400).json({ message: 'Invalid data', error: error.message });
  }
});

// @desc    Update a channel
// @route   PUT /api/channels/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, streamUrl, category, logoUrl, isActive } = req.body;

    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });

    channel.name = name || channel.name;
    channel.streamUrl = streamUrl || channel.streamUrl;
    channel.category = category || channel.category;
    channel.logoUrl = logoUrl !== undefined ? logoUrl : channel.logoUrl;
    channel.isActive = isActive !== undefined ? isActive : channel.isActive;

    const updatedChannel = await channel.save();
    res.json(updatedChannel);
  } catch (error) {
    res.status(400).json({ message: 'Invalid data' });
  }
});

// @desc    Delete a channel
// @route   DELETE /api/channels/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);

    if (!channel) return res.status(404).json({ message: 'Channel not found' });

    await channel.deleteOne();
    res.json({ message: 'Channel removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
