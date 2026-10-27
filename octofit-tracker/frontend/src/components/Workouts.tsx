import { useApiData } from '../api/useApiData.js';
import { getJson } from '../api/client.js';

type Workout = { _id?: string; title: string; focus: string; minutes: number; difficulty: string; reason: string };

export default function Workouts() {
  const state = useApiData(`/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`, getJson<{ suggestions: Workout[] }>);
  return <section><h2 className="h4">Workout suggestions</h2><p>Recommendations based on your goal and recent activity.</p>
    {state.status === 'loading' && <p role="status">Loading workout suggestions...</p>}
    {state.status === 'error' && <p role="alert">Unable to load workout suggestions: {state.message}</p>}
    {state.status === 'success' && (state.data.suggestions.length === 0
      ? <p>No workout suggestions yet.</p>
      : <ul>{state.data.suggestions.map((workout, index) => <li key={workout._id ?? `${workout.title}-${index}`}>
        <strong>{workout.title}</strong>: {workout.focus}, {workout.minutes} minutes, {workout.difficulty}. {workout.reason}
      </li>)}</ul>)}
  </section>;
}
