import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Allow passing the MongoDB URI as the first CLI argument to override .env
const cliDB = process.argv[2];
const DB = cliDB || process.env.MONGODB || 'mongodb://127.0.0.1:27017/atendo';
console.log('Import script using MongoDB URI:', DB);
const mockPath = path.resolve(process.cwd(), 'mock-db.json');

async function main() {
  await mongoose.connect(DB, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');
  const raw = fs.readFileSync(mockPath, 'utf8');
  const data = JSON.parse(raw);

  const userSchema = new mongoose.Schema({}, { strict: false });
  const sessionSchema = new mongoose.Schema({}, { strict: false });

  const User = mongoose.model('User', userSchema);
  const Session = mongoose.model('Session', sessionSchema);

  if (Array.isArray(data.users) && data.users.length) {
    console.log(`Inserting ${data.users.length} users...`);
    await User.insertMany(data.users.map(u => ({ ...u })));
  }
  if (Array.isArray(data.sessions) && data.sessions.length) {
    console.log(`Inserting ${data.sessions.length} sessions...`);
    await Session.insertMany(data.sessions.map(s => ({ ...s })));
  }

  console.log('Import complete');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
