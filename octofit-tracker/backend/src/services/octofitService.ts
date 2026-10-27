import { Activity, Team, User, Workout } from '../models/index.js';

type InputRecord = Record<string, unknown>;

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function notFound(message: string) {
  return Object.assign(new Error(message), { status: 404 });
}

function asRecord(input: unknown): InputRecord {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw badRequest('A JSON object is required');
  return input as InputRecord;
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const body = asRecord(input);
  const { userId, teamId } = body;
  const type = typeof body.type === 'string' ? body.type.trim() : '';
  const minutes = Number(body.minutes);

  if (!isObjectId(userId) || !isObjectId(teamId) || !type || !Number.isFinite(minutes) || minutes < 1) {
    throw badRequest('Valid userId, teamId, type, and positive minutes are required');
  }
  const [user, team] = await Promise.all([User.findById(userId).select('_id'), Team.findById(teamId).select('_id')]);
  if (!user || !team) throw notFound('The referenced user or team was not found');

  return Activity.create({ user: userId, team: teamId, type, minutes, points: minutes, occurredAt: new Date() });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const body = asRecord(input);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const mascot = typeof body.mascot === 'string' ? body.mascot.trim() : '';
  const members = body.members ?? [];

  if (!name || !mascot || !Array.isArray(members) || !members.every(isObjectId)) {
    throw badRequest('A team name, mascot, and valid members array are required');
  }
  if (members.length && await User.countDocuments({ _id: { $in: members } }) !== members.length) {
    throw notFound('One or more team members were not found');
  }
  return Team.create({ name, mascot, members });
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate<{ _id: unknown; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [String(_id), totalPoints]));
  return teams
    .map(({ _id, name }) => ({ teamName: name, totalPoints: pointsByTeam.get(String(_id)) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.toLowerCase() }).lean();
  if (!user) throw notFound('User not found');

  const [recentActivity, workouts] = await Promise.all([
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean(),
    Workout.find().lean(),
  ]);
  const goal = user.fitnessGoal?.trim().toLowerCase();
  const activityType = recentActivity?.type.trim().toLowerCase();
  return workouts
    .map((workout) => {
      const focus = workout.focus.trim().toLowerCase();
      const matchesGoal = Boolean(goal && focus === goal);
      const matchesActivity = Boolean(activityType && focus === activityType);
      const reason = matchesGoal
        ? `Matches your ${user.fitnessGoal} goal${activityType ? ` and recent ${recentActivity?.type} activity` : ''}.`
        : matchesActivity
          ? `Matches your recent ${recentActivity?.type} activity.`
          : `A complementary workout for your ${user.fitnessGoal} goal.`;
      return { ...workout, reason, score: Number(matchesGoal) * 2 + Number(matchesActivity) };
    })
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .map(({ score: _score, ...workout }) => workout);
}

export { User };
