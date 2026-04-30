import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { AppProviders } from './src/presentation/contexts/AppProviders';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <RootNavigator />
    </AppProviders>
  );
}