const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'db.json');

const defaultData = {
  users: [
    {
      _id: '1',
      username: 'admin',
      password: bcrypt.hashSync('password123', 10)
    }
  ],
  channels: [
    { _id: '1', name: 'Hiru FM', streamUrl: 'https://radio.lotustechnologieslk.net:2020/stream/hirufmgarden', category: 'FM', logoUrl: 'https://logo.clearbit.com/hirufm.lk', isActive: true },
    { _id: '2', name: 'FM Derana', streamUrl: 'https://cp12.serverse.com/proxy/fmderana/stream', category: 'FM', logoUrl: 'https://logo.clearbit.com/fmderana.lk', isActive: true },
    { _id: '3', name: 'Shaa FM', streamUrl: 'https://radio.lotustechnologieslk.net:2020/stream/shaafmgarden', category: 'FM', logoUrl: 'https://logo.clearbit.com/shaafm.lk', isActive: true },
    { _id: '4', name: 'ITN FM', streamUrl: 'https://cp12.serverse.com/proxy/itnfm?mp=/stream', category: 'FM', logoUrl: 'https://logo.clearbit.com/itn.lk', isActive: true },
    { _id: '5', name: 'FM Adaviya', streamUrl: 'https://cupcake.citrus3.com:8006/stream', category: 'FM', logoUrl: 'https://ui-avatars.com/api/?name=FM+Adaviya&background=388E3C&color=fff&size=256&bold=true', isActive: true },
    { _id: '6', name: 'Rangiri FM', streamUrl: 'https://radio.garden/api/ara/content/listen/7Z0lfTMU/channel.mp3?1777903126128', category: 'FM', logoUrl: 'https://ui-avatars.com/api/?name=Rangiri+FM&background=FBC02D&color=fff&size=256&bold=true', isActive: true },
    { _id: '7', name: 'Lakhada FM', streamUrl: 'https://radio.garden/api/ara/content/listen/xu3Wcxh7/channel.mp3?1777903262144', category: 'FM', logoUrl: 'https://ui-avatars.com/api/?name=Lakhada+FM&background=8E24AA&color=fff&size=256&bold=true', isActive: true },
    { _id: '8', name: 'Hiru TV', streamUrl: 'https://tv.hiruhost.com:1936/8012/8012/chunklist_w2000933072.m3u8', category: 'TV', logoUrl: 'https://ui-avatars.com/api/?name=Hiru+TV&background=E53935&color=fff&size=256&bold=true', isActive: true }
  ]
};

const readDB = () => {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2));
  }
  const data = fs.readFileSync(dbPath, 'utf-8');
  return JSON.parse(data);
};

const writeDB = (data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

module.exports = { readDB, writeDB };
