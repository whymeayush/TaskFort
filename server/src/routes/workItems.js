import express from 'express';
import {
  listWorkItems,
  getWorkItem,
  createWorkItem,
  updateWorkItem,
  claimWorkItem,
  reassignWorkItem,
  transitionWorkItemStatus,
  addComment,
  getActivityTimeline
} from '../controllers/workItemController.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeWorkItemAccess } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listWorkItems);
router.post('/', createWorkItem);

router.get('/:id', authorizeWorkItemAccess('read'), getWorkItem);
router.put('/:id', authorizeWorkItemAccess('mutate'), updateWorkItem);
router.patch('/:id', authorizeWorkItemAccess('mutate'), updateWorkItem);
router.post('/:id/claim', authorizeWorkItemAccess('mutate'), claimWorkItem);
router.post('/:id/reassign', authorizeWorkItemAccess('mutate'), reassignWorkItem);
router.post('/:id/transition', authorizeWorkItemAccess('mutate'), transitionWorkItemStatus);
router.post('/:id/comments', authorizeWorkItemAccess('read'), addComment);
router.get('/:id/timeline', authorizeWorkItemAccess('read'), getActivityTimeline);

export default router;
