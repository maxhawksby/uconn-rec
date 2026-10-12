// Pure upgrades for app data saved on the phone by older demo builds.
import { DEFAULT_AWARDS, baseOrgs } from './demo';

/** Upgrades data saved by older builds, one version at a time. */
export function migrate(x: any): unknown {
  // v1 kept "played with" on sport workouts only.
  if (x?.version === 1 && Array.isArray(x.workouts)) {
    const tags = x.workouts.flatMap((w: any) => (w.kind === 'sport' && Array.isArray(w.withIds)
      ? w.withIds.map((studentId: string) => ({ workoutId: w.id, studentId, status: 'accepted', at: w.startedAt })) : []));
    const workouts = x.workouts.map(({ withIds: _withIds, ...w }: any) => w);
    x = { ...x, version: 2, workouts, tags, photos: [] };
  }
  // v2 had no badges or awards.
  if (x?.version === 2) x = { ...x, version: 3, orgs: baseOrgs(), badges: [], awards: DEFAULT_AWARDS, studentAwards: [], adminIds: [] };
  return x;
}
