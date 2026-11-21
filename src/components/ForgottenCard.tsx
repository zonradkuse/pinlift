import { finishSession } from '../lib/actions.ts';
import { keepWorkoutOpen } from '../lib/ui-state.ts';
import { endTime, lastActivity } from '../lib/stats.ts';
import { fmtDate, fmtTime } from '../lib/format.ts';
import { navigate } from '../lib/router.ts';
import { to } from '../lib/routes.ts';
import type { Session } from '../lib/types.ts';

/** A workout left open for hours: offer to close it at its real end instead of booking today's sets on it. */
export function ForgottenCard({ session }: { session: Session }) {
  const end = endTime(session);
  return (
    <div class="card tertiary notice" role="alert">
      <div class="title-m">Workout from {fmtDate(session.startedAt)} is still open</div>
      <div class="body-m">Last activity at {fmtTime(lastActivity(session))}. Finish it at {fmtTime(end)}, or keep logging into it.</div>
      <div class="row wrap mt-16">
        <button class="btn interactive" onClick={() => { finishSession(session.id); navigate(to.summary(session.id)); }}>Finish at {fmtTime(end)}</button>
        <button class="btn text interactive" onClick={() => keepWorkoutOpen(session.id)}>Continue</button>
      </div>
    </div>
  );
}
