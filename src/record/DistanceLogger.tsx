import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Linking, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { colors, fonts, gutter, minTouch, radius, space } from '../theme';
import { Button, EmptyState, Icon, Scoreboard, Text, type Stat } from '../ui';
import type { RoutePoint } from '../data/types';
import { formatDistance, formatPace } from '../data/selectors';
import { acceptFix, formatClock, kmToMiles, milesText, milesToKm, paceClockPerMile, paceSecPerKm, parseDecimal, routeDistanceKm, suggestTitle } from './math';
import { RouteMap } from './RouteMap';
import { LoggerHeader, SectionLabel, useNow } from './parts';
import { confirmDiscard, useBackGuard, type Finished } from './session';

type Kind = 'run' | 'ride';
type Props = { kind: Kind; manual?: boolean; onFinish: (f: Finished) => void; onDiscard: () => void };

type Phase = 'checking' | 'ask' | 'denied' | 'off' | 'ready' | 'live' | 'paused' | 'manual';

const LABEL: Record<Kind, string> = { run: 'Run', ride: 'Ride' };

export function DistanceLogger({ kind, manual, onFinish, onDiscard }: Props) {
  const [phase, setPhase] = useState<Phase>(manual ? 'manual' : 'checking');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [fix, setFix] = useState<Location.LocationObject | null>(null);
  const [segments, setSegments] = useState<RoutePoint[][]>([]);
  const [manualSeed, setManualSeed] = useState<number | undefined>();
  // Clock: moving time = now - start - total paused.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pausedMs, setPausedMs] = useState(0);
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const startRef = useRef(startedAt); startRef.current = startedAt;
  const sub = useRef<Location.LocationSubscription | null>(null);

  const recording = phase === 'live' || phase === 'paused';
  const now = useNow(phase === 'live');
  const movingSec = startedAt ? Math.max(0, ((pausedAt ?? now) - startedAt - pausedMs) / 1000) : 0;
  const km = routeDistanceKm(segments);

  const onFix = useCallback((loc: Location.LocationObject) => {
    setFix(loc);
    if (phaseRef.current !== 'live' || startRef.current == null) return;
    const p = { lat: loc.coords.latitude, lng: loc.coords.longitude, t: Math.max(0, loc.timestamp - startRef.current) };
    setSegments(segs => {
      const cur = segs[segs.length - 1] ?? [];
      if (!acceptFix(cur[cur.length - 1], { ...p, accuracy: loc.coords.accuracy }, kind)) return segs;
      return segs.length ? [...segs.slice(0, -1), [...cur, p]] : [[p]];
    });
  }, [kind]);

  const watch = useCallback(async () => {
    sub.current?.remove();
    sub.current = null;
    try {
      if (!(await Location.hasServicesEnabledAsync())) { setPhase(p => (p === 'checking' || p === 'ask' ? 'off' : p)); return; }
      sub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 3, timeInterval: 1000 }, onFix);
      setPhase(p => (p === 'checking' || p === 'ask' || p === 'off' ? 'ready' : p));
    } catch {
      setPhase(p => (p === 'live' || p === 'paused' ? p : 'off'));
    }
  }, [onFix]);

  const checkPermission = useCallback(async (request: boolean) => {
    try {
      const res = request ? await Location.requestForegroundPermissionsAsync() : await Location.getForegroundPermissionsAsync();
      setCanAskAgain(res.canAskAgain);
      if (res.granted) return watch();
      setPhase(res.status === 'undetermined' && res.canAskAgain ? 'ask' : 'denied');
    } catch {
      setPhase('off');
    }
  }, [watch]);

  useEffect(() => {
    if (!manual) checkPermission(false);
    return () => { sub.current?.remove(); sub.current = null; };
  }, [manual, checkPermission]);

  const discard = useCallback(() => {
    const go = () => { sub.current?.remove(); onDiscard(); };
    if (phase === 'live' || phase === 'paused') confirmDiscard(go, LABEL[kind].toLowerCase());
    else go();
  }, [phase, kind, onDiscard]);
  useBackGuard(true, discard);

  function start() {
    const t = Date.now();
    setStartedAt(t); startRef.current = t;
    setSegments(fix && (fix.coords.accuracy ?? 0) <= 35 ? [[{ lat: fix.coords.latitude, lng: fix.coords.longitude, t: 0 }]] : []);
    setPhase('live');
  }
  function pause() { setPausedAt(Date.now()); setPhase('paused'); }
  function resume() {
    if (pausedAt) setPausedMs(ms => ms + Date.now() - pausedAt);
    setPausedAt(null);
    setSegments(segs => [...segs, []]); // a new segment so the paused gap adds no distance
    setPhase('live');
  }

  function finish() {
    const durationSec = Math.round(movingSec);
    if (km < 0.01) {
      Alert.alert('No distance yet', "GPS hasn't picked up any movement. You can keep going or enter the distance yourself.", [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Enter manually', onPress: () => { sub.current?.remove(); setManualSeed(durationSec); setPhase('manual'); } },
      ]);
      return;
    }
    if (phase === 'live') pause(); // frozen while the finish sheet is open; Resume still works
    const route = segments.flat();
    onFinish({
      draft: { kind, distanceKm: Math.round(km * 1000) / 1000, durationSec: Math.max(1, durationSec), startedAt: new Date(startedAt!).toISOString(), route },
      stats: summaryStats(kind, km, durationSec),
    });
  }

  const title = suggestTitle(kind, new Date(startedAt ?? Date.now()));

  if (phase === 'manual') {
    return (
      <View style={styles.root}>
        <LoggerHeader eyebrow={`${LABEL[kind]} · manual entry`} title={title} onClose={discard} />
        <ManualEntry kind={kind} seedSec={manualSeed} onFinish={onFinish} />
      </View>
    );
  }

  const current = fix ? { lat: fix.coords.latitude, lng: fix.coords.longitude } : null;
  const accuracy = fix?.coords.accuracy;
  return (
    <View style={styles.root}>
      <LoggerHeader eyebrow={`${LABEL[kind]} · ${phase === 'live' ? 'recording' : phase === 'paused' ? 'paused' : 'GPS'}`} title={title} onClose={discard} />

      {phase === 'checking' ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /><Text variant="small" color="muted">Checking location access...</Text></View>
      ) : phase === 'ask' || phase === 'denied' || phase === 'off' ? (
        <ScrollView contentContainerStyle={styles.blocked}>
          <EmptyState
            icon={phase === 'off' ? 'navigate-circle-outline' : 'location-outline'}
            title={phase === 'ask' ? 'Track your route' : phase === 'off' ? 'Location is off' : 'Location is blocked'}
            body={phase === 'ask'
              ? `Valence uses your location only while this screen is open, to map your ${LABEL[kind].toLowerCase()} and measure distance and ${kind === 'ride' ? 'speed' : 'pace'}.`
              : phase === 'off'
                ? 'Turn on Location Services in your phone settings, or enter your distance yourself.'
                : canAskAgain ? 'Allow location to map your route, or enter your distance yourself.' : 'Turn on location for Expo Go in Settings, or enter your distance yourself.'}
            actionLabel={phase === 'ask' || (phase === 'denied' && canAskAgain) ? 'Allow location' : phase === 'off' ? 'Try again' : 'Open Settings'}
            onAction={() => (phase === 'off' ? checkPermission(false) : phase === 'denied' && !canAskAgain ? Linking.openSettings() : checkPermission(true))} />
          <Button label="Enter distance manually" icon="create-outline" variant="secondary" onPress={() => setPhase('manual')} />
        </ScrollView>
      ) : (
        <View style={styles.live}>
          <View style={styles.mapWrap}>
            <RouteMap segments={segments} current={current} style={styles.map} />
            {!current ? (
              <View style={styles.mapOverlay} pointerEvents="none">
                <ActivityIndicator color={colors.accent} />
                <Text variant="small" color="muted">Finding GPS signal...</Text>
              </View>
            ) : null}
            <View style={styles.gps} pointerEvents="none">
              <View style={[styles.gpsDot, { backgroundColor: accuracy == null ? colors.faint : accuracy <= 15 ? colors.turf : accuracy <= 35 ? colors.accent : colors.danger }]} />
              <Text variant="tiny" color="inkSoft">{accuracy == null ? 'No GPS yet' : `GPS ±${Math.round(accuracy)} m`}</Text>
            </View>
          </View>
          <View style={styles.bottom}>
            <Scoreboard stats={liveStats(kind, km, movingSec)} />
            {phase === 'ready' ? (
              <>
                <Button label={`Start ${LABEL[kind].toLowerCase()}`} icon="play" block onPress={start} />
                <View style={styles.hintRow}>
                  <Text variant="tiny" color="muted" style={styles.flex}>Keep the app open while you track.</Text>
                  <Button label="Enter manually" variant="ghost" size="sm" onPress={() => { sub.current?.remove(); setPhase('manual'); }} />
                </View>
              </>
            ) : phase === 'live' ? (
              <View style={styles.controls}>
                <Button label="Pause" icon="pause" variant="secondary" style={styles.flex} onPress={pause} />
                <Button label="Finish" icon="flag-outline" variant="secondary" style={styles.flex} onPress={finish} />
              </View>
            ) : (
              <View style={styles.controls}>
                <Button label="Resume" icon="play" variant="secondary" style={styles.flex} onPress={resume} />
                <Button label="Finish" icon="flag" style={styles.flex} onPress={finish} />
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function liveStats(kind: Kind, km: number, sec: number): Stat[] {
  const third: Stat = kind === 'ride'
    ? { label: 'Speed', value: sec > 0 && km > 0.01 ? (kmToMiles(km) / (sec / 3600)).toFixed(1) : '--', unit: 'mph' }
    : { label: 'Pace', value: paceClockPerMile(paceSecPerKm(sec, km)), unit: '/mi' };
  return [{ label: 'Distance', value: milesText(km), unit: 'mi' }, third, { label: 'Time', value: formatClock(sec) }];
}

function summaryStats(kind: Kind, km: number, sec: number): Stat[] {
  const third: Stat = kind === 'ride'
    ? { label: 'Speed', value: (kmToMiles(km) / (sec / 3600)).toFixed(1), unit: 'mph' }
    : { label: 'Pace', value: formatPace(paceSecPerKm(sec, km)).replace('/mi', ''), unit: '/mi' };
  return [{ label: 'Distance', value: formatDistance(km).replace(' mi', ''), unit: 'mi' }, third, { label: 'Time', value: formatClock(sec) }];
}

/** Treadmill, trainer, or no GPS: distance plus time. */
function ManualEntry({ kind, seedSec, onFinish }: { kind: Kind; seedSec?: number; onFinish: (f: Finished) => void }) {
  const seed = seedSec ?? 0;
  const [miles, setMiles] = useState('');
  const [h, setH] = useState(seed >= 3600 ? String(Math.floor(seed / 3600)) : '');
  const [m, setM] = useState(seed ? String(Math.floor((seed % 3600) / 60)) : '');
  const [s, setS] = useState(seed ? String(seed % 60) : '');
  const [error, setError] = useState('');

  const mi = parseDecimal(miles);
  const sec = (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
  const km = mi > 0 ? milesToKm(mi) : 0;
  const preview = km && sec ? liveStats(kind, km, sec)[1] : null;

  function save() {
    Keyboard.dismiss();
    if (!(mi > 0 && mi < 600)) return setError('Enter a distance in miles, like 3.1.');
    if (!(sec >= 60 && sec <= 24 * 3600)) return setError('Enter a time of at least one minute.');
    if (Number(m) > 59 || Number(s) > 59) return setError('Minutes and seconds go up to 59.');
    setError('');
    onFinish({
      draft: { kind, distanceKm: Math.round(km * 1000) / 1000, durationSec: sec, startedAt: new Date(Date.now() - sec * 1000).toISOString() },
      stats: summaryStats(kind, km, sec),
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.manual} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <SectionLabel>Distance</SectionLabel>
      <View style={styles.bigField}>
        <TextInput value={miles} onChangeText={t => { setMiles(t.replace(/[^\d.,]/g, '')); setError(''); }} placeholder="0.00" placeholderTextColor={colors.faint}
          keyboardType="decimal-pad" style={styles.bigInput} accessibilityLabel="Distance in miles" maxLength={6} autoFocus />
        <Text variant="h2" color="muted">mi</Text>
      </View>
      <SectionLabel>Time</SectionLabel>
      <View style={styles.timeRow}>
        <TimeField value={h} onChange={setH} unit="hr" label="Hours" />
        <TimeField value={m} onChange={setM} unit="min" label="Minutes" />
        <TimeField value={s} onChange={setS} unit="sec" label="Seconds" />
      </View>
      {preview ? (
        <View style={styles.preview}>
          <Icon name="speedometer-outline" size={18} color="muted" />
          <Text variant="smallStrong" color="inkSoft">{preview.label}: {preview.value} {preview.unit}</Text>
        </View>
      ) : null}
      {error ? <Text variant="small" color="danger" style={styles.error}>{error}</Text> : null}
      <Button label="Continue" block onPress={save} style={styles.save} />
    </ScrollView>
  );
}

function TimeField({ value, onChange, unit, label }: { value: string; onChange: (v: string) => void; unit: string; label: string }) {
  return (
    <View style={styles.timeField}>
      <TextInput value={value} onChangeText={t => onChange(t.replace(/\D/g, ''))} placeholder="0" placeholderTextColor={colors.faint}
        keyboardType="number-pad" maxLength={2} style={styles.timeInput} accessibilityLabel={label} selectTextOnFocus />
      <Text variant="eyebrow" color="muted">{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  blocked: { paddingHorizontal: gutter, gap: space.lg, paddingBottom: space.x4 },
  live: { flex: 1, paddingHorizontal: gutter, paddingBottom: space.lg, gap: space.md },
  mapWrap: { flex: 1, minHeight: 200 },
  map: { flex: 1 },
  mapOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  gps: { position: 'absolute', top: space.md, left: space.md, flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs },
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  bottom: { gap: space.md },
  controls: { flexDirection: 'row', gap: space.md },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  manual: { paddingHorizontal: gutter, paddingBottom: space.x4 },
  bigField: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.lg },
  bigInput: { flex: 1, minWidth: 0, fontFamily: fonts.numeral, fontSize: 48, color: colors.ink, paddingVertical: space.sm, minHeight: minTouch * 2 },
  timeRow: { flexDirection: 'row', gap: space.md },
  timeField: { flex: 1, minWidth: 0, alignItems: 'center', gap: space.xs, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingVertical: space.sm },
  timeInput: { alignSelf: 'stretch', textAlign: 'center', fontFamily: fonts.numeral, fontSize: 34, color: colors.ink, minHeight: minTouch + 12, paddingVertical: 0 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg },
  error: { marginTop: space.md },
  save: { marginTop: space.xxl },
});
