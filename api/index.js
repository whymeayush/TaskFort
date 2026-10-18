import app from '../server/src/app.js';
import { connectDB } from '../server/src/db/connection.js';
import { seedDatabase } from '../server/src/seeds/seed.js';
import { User } from '../server/src/models/User.js';

let isSeeded = false;

export default async function handler(req, res) {
  try {
    await connectDB();
    if (!isSeeded) {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log('[Vercel] Seeding initial database records...');
        await seedDatabase();
      }
      isSeeded = true;
    }
  } catch (err) {
    console.error('[Vercel] Database initialization warning:', err.message);
  }

  return app(req, res);
}
