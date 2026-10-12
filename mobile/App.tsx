/**
 * Parokia — mobile consultation app for choir leaders.
 *
 * Provider order matters: fonts and liturgical theme are independent, the auth
 * provider drives which navigator is mounted.
 */

import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/auth/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { FontsProvider } from './src/theme/FontsProvider';
import { LiturgicalThemeProvider } from './src/theme/LiturgicalThemeProvider';

export default function App() {
  return (
    <SafeAreaProvider>
      <FontsProvider>
        <LiturgicalThemeProvider>
          <AuthProvider>
            <RootNavigator />
            <StatusBar style="dark" />
          </AuthProvider>
        </LiturgicalThemeProvider>
      </FontsProvider>
    </SafeAreaProvider>
  );
}
