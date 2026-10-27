import { Team } from '../models/Team.js';
import { TeamMembership } from '../models/TeamMembership.js';
import { WorkItem } from '../models/WorkItem.js';

export async function listTeams(req, res, next) {
  try {
    const teams = await Team.find({ status: 'ACTIVE' }).sort({ name: 1 }).lean();

    // Attach active item counts
    const teamsWithCounts = await Promise.all(teams.map(async (t) => {
      const activeCount = await WorkItem.countDocuments({
        teamId: t._id,
        status: { $nin: ['Resolved', 'Closed'] },
        archivedAt: null
      });
      const memberCount = await TeamMembership.countDocuments({
        teamId: t._id,
        status: 'ACTIVE'
      });
      return {
        ...t,
        id: t._id,
        activeWorkItems: activeCount,
        memberCount
      };
    }));

    res.json(teamsWithCounts);
  } catch (err) {
    next(err);
  }
}

export async function createTeam(req, res, next) {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Team name and code are required' });
    }

    const team = new Team({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description ? description.trim() : '',
      createdBy: req.user._id
    });
    await team.save();

    // Creator becomes Team Admin
    await TeamMembership.create({
      userId: req.user._id,
      teamId: team._id,
      roleInTeam: 'TEAM_ADMIN'
    });

    res.status(201).json(team);
  } catch (err) {
    next(err);
  }
}

export async function getTeamMembers(req, res, next) {
  try {
    const members = await TeamMembership.find({ teamId: req.params.id, status: 'ACTIVE' })
      .populate('userId', 'name email avatarColor systemRole')
      .lean();

    res.json(members);
  } catch (err) {
    next(err);
  }
}

export async function addMember(req, res, next) {
  try {
    const { userId, roleInTeam = 'TEAM_MEMBER' } = req.body;
    const teamId = req.params.id;

    // Check authority: must be Team Admin or System Admin
    const isTeamAdmin = req.user.isSystemAdmin || req.user.memberships.some(m => m.teamId === teamId && m.roleInTeam === 'TEAM_ADMIN');
    if (!isTeamAdmin) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only Team Admins or System Admins can add team members' });
    }

    const membership = await TeamMembership.findOneAndUpdate(
      { userId, teamId },
      { $set: { roleInTeam, status: 'ACTIVE' } },
      { upsert: true, new: true }
    ).populate('userId', 'name email avatarColor systemRole');

    res.status(201).json(membership);
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req, res, next) {
  try {
    const { userId } = req.params;
    const teamId = req.params.id;

    const isTeamAdmin = req.user.isSystemAdmin || req.user.memberships.some(m => m.teamId === teamId && m.roleInTeam === 'TEAM_ADMIN');
    if (!isTeamAdmin) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Only Team Admins or System Admins can remove members' });
    }

    await TeamMembership.findOneAndUpdate(
      { userId, teamId },
      { $set: { status: 'INACTIVE' } }
    );

    // Documented policy: Unassign active items when member is removed to avoid ghost ownership
    await WorkItem.updateMany(
      { teamId, assigneeId: userId, status: { $in: ['Open', 'In Progress'] } },
      { $set: { assigneeId: null }, $inc: { version: 1 } }
    );

    res.json({ success: true, message: 'Member removed and active assignments released to team pool' });
  } catch (err) {
    next(err);
  }
}
