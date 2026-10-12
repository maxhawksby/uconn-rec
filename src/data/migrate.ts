// Pure upgrades for app data saved on the phone by older demo builds.

/** Upgrades data saved by older builds. v1 kept "played with" on sport workouts only. */
export function migrate(x: any): unknown {
  if (x?.version !== 1 || !Array.isArray(x.workouts)) return x;
  const tags = x.workouts.flatMap((w: any) => (w.kind === 'sport' && Array.isArray(w.withIds)
    ? w.withIds.map((studentId: string) => ({ workoutId: w.id, studentId, status: 'accepted', at: w.startedAt })) : []));
  const workouts = x.workouts.map(({ withIds: _withIds, ...w }: any) => w);
  return { ...x, version: 2, workouts, tags, photos: [] };
}
