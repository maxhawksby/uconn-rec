import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, TabParamList } from './types';
import { useStore } from '../data/store';
import { colors, fonts, radius, space } from '../theme';
import { Icon } from '../ui';
import { OnboardingFlow } from '../onboarding/OnboardingFlow';
import { FeedScreen } from '../screens/FeedScreen';
import { RecordScreen } from '../screens/RecordScreen';
import { useLiftInProgress } from '../record/session';
import { MeetupsScreen } from '../screens/MeetupsScreen';
import { GroupsScreen } from '../screens/GroupsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { WorkoutDetailScreen } from '../screens/WorkoutDetailScreen';
import { StudentProfileScreen } from '../screens/StudentProfileScreen';
import { MeetupDetailScreen } from '../screens/MeetupDetailScreen';
import { CreateMeetupScreen } from '../screens/CreateMeetupScreen';
import { GroupDetailScreen } from '../screens/GroupDetailScreen';
import { CreateGroupScreen } from '../screens/CreateGroupScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, string> = {
  Feed: 'pulse', Record: 'add', Meetups: 'calendar-clear-outline', Groups: 'people-outline', Profile: 'person-circle-outline',
};

/** The center Record tab: an orange square that sits above the bar. */
function RecordButton({ onPress, accessibilityState }: BottomTabBarButtonProps) {
  const live = useLiftInProgress();
  return (
    <View style={styles.recordSlot}>
      <Pressable accessibilityRole="button" accessibilityLabel={live ? 'Resume your lift' : 'Record a workout'} accessibilityState={accessibilityState}
        onPress={onPress} style={({ pressed }) => [styles.recordButton, pressed && { backgroundColor: colors.accentPressed }]}>
        <Icon name="add" size={30} color="onAccent" />
        {live ? <View style={styles.liveDot} /> : null}
      </Pressable>
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.ink,
      tabBarInactiveTintColor: colors.faint,
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.tabLabel,
      tabBarIcon: ({ color, size }) => <Icon name={TAB_ICONS[route.name]} size={size - 2} color={color === colors.ink ? 'ink' : 'faint'} />,
    })}>
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Meetups" component={MeetupsScreen} />
      <Tab.Screen name="Record" component={RecordScreen} options={{ tabBarLabel: () => null, tabBarButton: props => <RecordButton {...props} /> }} />
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { state } = useStore();
  const signedIn = !!state.meId;
  return (
    <Stack.Navigator screenOptions={{
      headerTintColor: colors.ink,
      headerStyle: { backgroundColor: colors.bg },
      headerTitleStyle: { fontFamily: fonts.display, fontSize: 20 },
      headerShadowVisible: false,
      headerBackButtonDisplayMode: 'minimal',
      contentStyle: { backgroundColor: colors.bg },
    }}>
      {signedIn ? (
        <>
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} options={{ title: 'WORKOUT' }} />
          <Stack.Screen name="StudentProfile" component={StudentProfileScreen} options={{ title: '' }} />
          <Stack.Screen name="MeetupDetail" component={MeetupDetailScreen} options={{ title: 'MEETUP' }} />
          <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: '' }} />
          <Stack.Group screenOptions={{ presentation: 'modal' }}>
            <Stack.Screen name="CreateMeetup" component={CreateMeetupScreen} options={{ title: 'NEW MEETUP' }} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'NEW GROUP' }} />
          </Stack.Group>
        </>
      ) : (
        <Stack.Screen name="Onboarding" component={OnboardingFlow} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: colors.surface, borderTopColor: colors.line },
  tabLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  recordSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  liveDot: { position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.ink, borderWidth: 2, borderColor: colors.surface },
  recordButton: { width: 54, height: 54, borderRadius: radius.lg, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: -space.lg },
});
