import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';

import { colors } from '../core/theme';
import { AuthStack } from './AuthStack';
import { StudentTabs } from './StudentTabs';
import { TeacherTabsNavigator } from './TeacherTabs';
import { useAuth } from '../presentation/contexts/AuthContext';

export function RootNavigator() {
  const { isAuthenticated, isBootstrapping, user } = useAuth();

  if (isBootstrapping) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        user?.role === 'teacher' ? <TeacherTabsNavigator /> : <StudentTabs />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}