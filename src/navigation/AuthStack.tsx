import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoginScreen } from '../presentation/screens/auth/LoginScreen';
import { RegisterScreen } from '../presentation/screens/auth/RegisterScreen';
import { ResetPasswordScreen } from '../presentation/screens/auth/ResetPasswordScreen';
import { colors } from '../core/theme';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ResetPassword: { token?: string } | undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}