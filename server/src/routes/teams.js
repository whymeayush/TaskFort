import express from 'express';
import { listTeams, createTeam, getTeamMembers, addMember, removeMember } from '../controllers/teamController.js';
import { authenticate } from '../middleware/auth.js';
import { requireSystemRole } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listTeams);
router.post('/', requireSystemRole('SYSTEM_ADMIN', 'TEAM_ADMIN'), createTeam);
router.get('/:id/members', getTeamMembers);
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);

export default router;
