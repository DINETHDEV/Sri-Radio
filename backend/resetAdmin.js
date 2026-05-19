require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const User = require('./models/User');

async function resetAdmin() {
  try {
    console.log('Connecting to Database...');
    await mongoose.connect(process.env.MONGO_URI);
    
    let admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      console.log('Admin user not found. Creating new admin...');
      admin = new User({ username: 'admin', password: 'password123' });
    } else {
      console.log('Admin user found. Resetting password...');
      admin.password = 'password123';
    }
    
    await admin.save();
    console.log('✅ Admin credentials reset successfully!');
    console.log('👉 Username: admin');
    console.log('👉 Password: password123');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

resetAdmin();
