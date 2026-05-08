require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require('./models/User');
const Channel = require('./models/Channel');

const migrateData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    console.log('Connected to MongoDB.');

    // Read db.json
    const dbPath = path.join(__dirname, 'db.json');
    if (!fs.existsSync(dbPath)) {
      console.log('db.json not found. Exiting migration.');
      process.exit(0);
    }
    
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    // Migrate Users
    if (data.users && data.users.length > 0) {
      console.log(`Found ${data.users.length} users. Migrating...`);
      for (const user of data.users) {
        const existingUser = await User.findOne({ username: user.username });
        if (!existingUser) {
          // Note: db.json users have hashed passwords already, 
          // but Mongoose pre-save hook will re-hash it if we just save.
          // To prevent double hashing, we can insert directly using collection.insertOne,
          // OR we can temporarily disable the hook.
          // Since it's a migration, let's just insert directly into the collection to keep the exact hash.
          await mongoose.connection.collection('users').insertOne({
            username: user.username,
            password: user.password
          });
          console.log(`Migrated user: ${user.username}`);
        } else {
          console.log(`User ${user.username} already exists.`);
        }
      }
    }

    // Migrate Channels
    if (data.channels && data.channels.length > 0) {
      console.log(`Found ${data.channels.length} channels. Migrating...`);
      for (const channel of data.channels) {
        const existingChannel = await Channel.findOne({ name: channel.name });
        if (!existingChannel) {
          await Channel.create({
            name: channel.name,
            streamUrl: channel.streamUrl,
            category: channel.category,
            logoUrl: channel.logoUrl,
            isActive: channel.isActive
          });
          console.log(`Migrated channel: ${channel.name}`);
        } else {
          console.log(`Channel ${channel.name} already exists.`);
        }
      }
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateData();
