require('dotenv').config();
const mongoose = require('mongoose');
const Channel = require('./models/Channel');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sriradio';

// Using Clearbit for real logos where possible, and UI Avatars for others
const logos = {
  'Hiru FM': 'https://logo.clearbit.com/hirufm.lk',
  'FM Derana': 'https://logo.clearbit.com/fmderana.lk',
  'Shaa FM': 'https://logo.clearbit.com/shaafm.lk',
  'ITN FM': 'https://logo.clearbit.com/itn.lk',
  'FM Adaviya': 'https://ui-avatars.com/api/?name=FM+Adaviya&background=388E3C&color=fff&size=256&bold=true',
  'Rangiri FM': 'https://ui-avatars.com/api/?name=Rangiri+FM&background=FBC02D&color=fff&size=256&bold=true',
  'Lakhada FM': 'https://ui-avatars.com/api/?name=Lakhada+FM&background=8E24AA&color=fff&size=256&bold=true'
};

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    for (const [name, logoUrl] of Object.entries(logos)) {
      const result = await Channel.findOneAndUpdate({ name }, { logoUrl }, { new: true });
      if (result) {
        console.log(`✅ Updated logo for ${name}`);
      } else {
        console.log(`❌ Channel not found: ${name}`);
      }
    }

    console.log('\nAll done! You can close this terminal and refresh your browser.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
