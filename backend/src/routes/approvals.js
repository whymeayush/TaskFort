import express from 'express';
import { requestApproval, decideApproval, listPendingApprovals } from '../controllers/approvalController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/pending', listPendingApprovals);
router.post('/work-items/:id/request', requestApproval);
router.post('/:id/decide', decideApproval);

export default router;
