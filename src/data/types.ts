// Domain types. Shaped like the future Supabase tables so the local store can be swapped
// for a server repository without touching screens. All timestamps are ISO strings.

export type ID = string;
export type ISODate = string;

export type School = {
  id: ID;
  name: string;
  shortName: string;
  emailDomains: string[]; // e.g. ['uconn.edu']; subdomains like grad.uconn.edu also match
  city: string;
  state: string;
  isPilot: boolean; // only pilot schools can sign up; others join the waitlist
};

export const CLASS_YEARS = ['First year', 'Sophomore', 'Junior', 'Senior', 'Grad student'] as const;
export type ClassYear = (typeof CLASS_YEARS)[number];

export type Student = {
  id: ID;
  firstName: string;
  lastName: string;
  email: string;
  schoolId: ID;
  classYear: ClassYear;
  interests: ID[]; // activity ids from src/data/activities.ts
  bio?: string;
  createdAt: ISODate;
  isDemo?: boolean; // fictional seed student
};

export type Visibility = 'friends' | 'campus' | 'private';

export type LiftSet = { reps: number; weight: number }; // weight in lb; 0 = bodyweight
export type LiftExercise = { name: string; sets: LiftSet[] };
export type RoutePoint = { lat: number; lng: number; t: number }; // t = ms since start

type WorkoutBase = {
  id: ID;
  studentId: ID;
  title: string;
  startedAt: ISODate;
  durationSec: number;
  visibility: Visibility;
  note?: string; // private: never shown to other students
  groupId?: ID; // optionally shared into a group
};

export type LiftWorkout = WorkoutBase & { kind: 'lift'; exercises: LiftExercise[] };
export type DistanceWorkout = WorkoutBase & { kind: 'run' | 'ride'; distanceKm: number; route?: RoutePoint[] };
export type SportWorkout = WorkoutBase & { kind: 'sport'; activityId: ID; withIds: ID[]; result?: string };
export type SessionWorkout = WorkoutBase & { kind: 'class' | 'other'; activityId: ID };

export type Workout = LiftWorkout | DistanceWorkout | SportWorkout | SessionWorkout;
export type WorkoutKind = Workout['kind'];

// Input for logWorkout: the store assigns id and studentId. Distributes over the union.
type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;
export type NewWorkout = DistributiveOmit<Workout, 'id' | 'studentId'>;

export type Kudos = { workoutId: ID; studentId: ID; at: ISODate };
export type Comment = { id: ID; workoutId: ID; studentId: ID; body: string; at: ISODate };

export type Follow = { followerId: ID; followeeId: ID; at: ISODate };

export type Meetup = {
  id: ID;
  schoolId: ID;
  hostId: ID;
  activityId: ID;
  title: string;
  location: string; // free text: "Rec center court 2"
  startsAt: ISODate;
  capacity: number; // includes host
  attendeeIds: ID[]; // includes host
  groupId?: ID;
  note?: string;
  createdAt: ISODate;
};
export type NewMeetup = Omit<Meetup, 'id' | 'schoolId' | 'hostId' | 'attendeeIds' | 'createdAt'>;

export type GroupKind = 'dorm' | 'club' | 'team' | 'major' | 'crew';
export type Group = {
  id: ID;
  schoolId: ID;
  name: string;
  kind: GroupKind;
  description: string;
  memberIds: ID[];
  createdBy: ID;
  createdAt: ISODate;
};
export type NewGroup = Pick<Group, 'name' | 'kind' | 'description'>;

export type GroupMessage = { id: ID; groupId: ID; studentId: ID; body: string; at: ISODate };

export type WaitlistEntry = { email: string; schoolId: ID; at: ISODate };

// Sign-up in progress. The demo shows the code on screen; production emails it.
export type PendingSignup = { email: string; schoolId: ID; code: string; verified: boolean; sentAt: ISODate };

export type AppState = {
  version: 1;
  meId: ID | null;
  pending: PendingSignup | null;
  students: Student[];
  workouts: Workout[];
  kudos: Kudos[];
  comments: Comment[];
  follows: Follow[];
  meetups: Meetup[];
  groups: Group[];
  messages: GroupMessage[];
  waitlist: WaitlistEntry[];
};

// Derived, read-only shapes returned by selectors.
export type FeedItem = {
  workout: Workout;
  author: Student;
  kudosCount: number;
  kudoedByMe: boolean;
  comments: Comment[];
  isMine: boolean;
};

export type WeeklyTotals = { sessions: number; activeSec: number; distanceKm: number; liftVolume: number; weekStart: ISODate };
export type PersonalRecord = { exercise: string; weight: number; reps: number; at: ISODate; workoutId: ID };
export type ProfileStats = { streakDays: number; totalSessions: number; week: WeeklyTotals; prs: PersonalRecord[] };
