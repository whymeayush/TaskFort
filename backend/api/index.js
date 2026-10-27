import app from '../src/app.js';
import { connectDB } from '../src/db/connection.js';
import { seedDatabase } from '../src/seeds/seed.js';
import { User } from '../src/models/User.js';

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
    console.error('[Database Connection Error]:', err.message);
    return res.status(503).json({
      error: 'DATABASE_CONNECTION_ERROR',
      message: `Database connection failed: ${err.message}. If deployed on Vercel, please check that MONGODB_URI is configured and MongoDB Atlas allows access from anywhere (0.0.0.0/0).`
    });
  }

  return app(req, res);
}
