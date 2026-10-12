/**
 * Root navigation.
 *
 * While the stored session is restored the app shows a branded splash; an
 * anonymous visitor gets the login screen; an authenticated user gets the five
 * consultation tabs.
 */

import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { AppText } from '../components/AppText';
import { ChoirsScreen } from '../screens/ChoirsScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MassesScreen } from '../screens/MassesScreen';
import { MembershipsScreen } from '../screens/MembershipsScreen';
import { ThemeScreen } from '../screens/ThemeScreen';
import { colors, radii, spacing } from '../theme/tokens';
import { useLiturgicalTheme } from '../theme/LiturgicalThemeProvider';

export type RootTabParamList = {
  Dashboard: undefined;
  Masses: undefined;
  Choirs: undefined;
  Requests: undefined;
  Theme: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<keyof RootTabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { active: 'home', inactive: 'home-outline' },
  Masses: { active: 'calendar', inactive: 'calendar-outline' },
  Choirs: { active: 'musical-notes', inactive: 'musical-notes-outline' },
  Requests: { active: 'mail-unread', inactive: 'mail-unread-outline' },
  Theme: { active: 'color-palette', inactive: 'color-palette-outline' },
};

const TAB_LABELS: Record<keyof RootTabParamList, string> = {
  Dashboard: 'Accueil',
  Masses: 'Messes',
  Choirs: 'Chorales',
  Requests: 'Demandes',
  Theme: 'Thème',
};

function SplashView() {
  const { accent } = useLiturgicalTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radii.lg,
          backgroundColor: accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText variant="title" color={colors.onAccent}>
          PA
        </AppText>
      </View>
      <AppText variant="heading" color={colors.ink}>
        PAROKIA
      </AppText>
      <AppText variant="caption" color={colors.inkMuted}>
        Notre-Dame d’Afrique · Goma
      </AppText>
      <ActivityIndicator color={accent} />
    </View>
  );
}

export function RootNavigator() {
  const { status, user, signOut } = useAuth();
  const { accent } = useLiturgicalTheme();

  if (status === 'restoring') {
    return <SplashView />;
  }

  if (status === 'anonymous' || user === null) {
    return <LoginScreen />;
  }

  const navigationTheme: Theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: accent,
      background: colors.background,
      card: colors.surface,
      text: colors.ink,
      border: colors.border,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: colors.surface },
          headerShadowVisible: false,
          headerTitle: () => (
            <View>
              <AppText variant="heading" color={colors.ink}>
                PAROKIA
              </AppText>
              <AppText variant="caption" color={colors.inkMuted}>
                {`${TAB_LABELS[route.name]} · Notre-Dame d’Afrique`}
              </AppText>
            </View>
          ),
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Se déconnecter"
              onPress={() => {
                void signOut();
              }}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.lg,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="log-out-outline" size={22} color={colors.inkMuted} />
            </Pressable>
          ),
          tabBarActiveTintColor: accent,
          tabBarInactiveTintColor: colors.inkFaint,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarLabel: ({ color }) => (
            <AppText variant="caption" color={color}>
              {TAB_LABELS[route.name]}
            </AppText>
          ),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? TAB_ICONS[route.name].active : TAB_ICONS[route.name].inactive}
              size={size}
              color={color}
            />
          ),
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Masses" component={MassesScreen} />
        <Tab.Screen name="Choirs" component={ChoirsScreen} />
        <Tab.Screen name="Requests" component={MembershipsScreen} />
        <Tab.Screen name="Theme" component={ThemeScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
