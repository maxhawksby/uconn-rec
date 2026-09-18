import React, { createContext, useContext } from 'react';
import { useLocalData } from './useLocalData';
import { emptyFeed, FeedData, isFeedData } from './workoutFeedModel';

const FeedContext = createContext<ReturnType<typeof useLocalData<FeedData>> | null>(null);
export function WorkoutFeedProvider({ children }: { children: React.ReactNode }) {
  const value = useLocalData('uconn-rec-workout-feed-v1', emptyFeed, isFeedData);
  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}
export function useWorkoutFeed() {
  const value = useContext(FeedContext);
  if (!value) throw new Error('WorkoutFeedProvider is missing');
  return value;
}
