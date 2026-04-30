import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '../core/theme';
import { StudentHomeScreen } from '../presentation/screens/student/StudentHomeScreen';
import { CourseDetailScreen } from '../presentation/screens/student/CourseDetailScreen';
import { EvaluatePeersScreen } from '../presentation/screens/student/EvaluatePeersScreen';
import { DashboardScreen } from '../presentation/screens/student/DashboardScreen';
import { ProfileScreen } from '../presentation/screens/student/ProfileScreen';

export type StudentStackParamList = {
  Home: undefined;
  CourseDetail: { courseId: string };
  EvaluatePeers: { pendingId: string };
};

export type StudentTabParamList = {
  HomeTab: undefined;
  ResultsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<StudentTabParamList>();
const Stack = createNativeStackNavigator<StudentStackParamList>();

function StudentStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.dark },
        headerTintColor: '#FFFFFF',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Home" component={StudentHomeScreen} options={{ title: 'Mis Cursos' }} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} options={{ title: 'Detalle del curso' }} />
      <Stack.Screen name="EvaluatePeers" component={EvaluatePeersScreen} options={{ title: 'Evaluar compañeros' }} />
    </Stack.Navigator>
  );
}

export function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === 'HomeTab'
              ? 'home-variant'
              : route.name === 'ResultsTab'
                ? 'chart-box-outline'
                : 'account-circle-outline';
          return <MaterialCommunityIcons name={iconName as React.ComponentProps<typeof MaterialCommunityIcons>['name']} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={StudentStack} options={{ title: 'Inicio' }} />
      <Tab.Screen name="ResultsTab" component={DashboardScreen} options={{ title: 'Resultados' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}