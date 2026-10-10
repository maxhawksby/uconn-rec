import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { BarlowCondensed_300Light } from '@expo-google-fonts/barlow-condensed/300Light';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';
import { Barlow_400Regular } from '@expo-google-fonts/barlow/400Regular';
import { Barlow_500Medium } from '@expo-google-fonts/barlow/500Medium';
import { Barlow_700Bold } from '@expo-google-fonts/barlow/700Bold';
import { StoreProvider, useStore } from './data/store';
import { RootNavigator } from './navigation/RootNavigator';
import { colors } from './theme';

const navTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.surface, text: colors.ink, border: colors.line, primary: colors.accent },
};

function Gate() {
  const { ready } = useStore();
  if (!ready) return <Splash />;
  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}

function Splash() {
  return <View style={styles.splash}><ActivityIndicator color={colors.accent} /></View>;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_300Light, BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold, Barlow_400Regular, Barlow_500Medium, Barlow_700Bold,
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {fontsLoaded || fontError ? <StoreProvider><Gate /></StoreProvider> : <Splash />}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg } });
