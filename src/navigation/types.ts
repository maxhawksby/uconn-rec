import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// Route map for the whole app. Feature screens push detail routes from here.
export type TabParamList = {
  Feed: undefined;
  Record: undefined;
  Meetups: undefined;
  Groups: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined; // only mounted while signed out
  Tabs: NavigatorScreenParams<TabParamList>;
  WorkoutDetail: { workoutId: string };
  StudentProfile: { studentId: string };
  MeetupDetail: { meetupId: string };
  CreateMeetup: { groupId?: string } | undefined;
  GroupDetail: { groupId: string }; // group info + chat
  CreateGroup: undefined;
};

export type RootScreenProps<K extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, K>;
export type TabScreenProps<K extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, K>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  // Lets useNavigation() infer routes everywhere without generics.
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
