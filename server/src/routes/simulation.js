import express from 'express';
import { simulateRaceClaim, simulateIdempotency } from '../controllers/simulationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/race-claim', simulateRaceClaim);
router.post('/idempotency', simulateIdempotency);

export default router;
