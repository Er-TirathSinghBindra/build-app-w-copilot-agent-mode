import { useApiData } from '../api/useApiData.js';
import { getJson } from '../api/client.js';

type Team = { _id?: string; name: string; mascot?: string; members: string[] };

export default function Teams() {
  const state = useApiData('/api/teams', getJson<{ teams: Team[] }>);
  return <section><h2 className="h4">Teams</h2><p>Manage teams and members.</p>
    {state.status === 'loading' && <p role="status">Loading teams...</p>}
    {state.status === 'error' && <p role="alert">Unable to load teams: {state.message}</p>}
    {state.status === 'success' && (state.data.teams.length === 0
      ? <p>No teams yet.</p>
      : <ul>{state.data.teams.map((team, index) => <li key={team._id ?? `${team.name}-${index}`}>
        {team.name}{team.mascot ? ` (${team.mascot})` : ''} - {team.members.length} members
      </li>)}</ul>)}
  </section>;
}
