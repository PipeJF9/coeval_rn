import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Screens
import { TeacherHomeScreen } from '../presentation/screens/teacher/TeacherHomeScreen';
import { TeacherCourseDetailScreen } from '../presentation/screens/teacher/TeacherCourseDetailScreen';
import { CreateEvaluationScreen } from '../presentation/screens/teacher/CreateEvaluationScreen';
import { TeacherReportsScreen } from '../presentation/screens/teacher/TeacherReportsScreen';
import { EvaluationResponsesScreen } from '../presentation/screens/teacher/EvaluationResponsesScreen';
import { ProfileScreen } from '../presentation/screens/student/ProfileScreen';

// Types
import { colors } from '../core/theme';

const TeacherCoursesStack = createNativeStackNavigator();

function TeacherCoursesStackScreen() {
  return (
    <TeacherCoursesStack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.dark },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 16, color: '#FFFFFF' },
      }}
    >
      <TeacherCoursesStack.Screen
        name="TeacherHome"
        component={TeacherHomeScreen}
        options={{
          title: 'Mis Cursos',
          headerLargeTitle: true,
        }}
      />
      <TeacherCoursesStack.Screen
        name="TeacherCourseDetail"
        component={TeacherCourseDetailScreen}
        options={({ route }: any) => ({
          title: route.params?.courseName || 'Detalles del Curso',
        })}
      />
      <TeacherCoursesStack.Screen
        name="CreateEvaluation"
        component={CreateEvaluationScreen}
        options={{
          title: 'Crear Ciclo de Evaluación',
          presentation: 'modal',
        }}
      />
      <TeacherCoursesStack.Screen
        name="EvaluationResponses"
        component={EvaluationResponsesScreen}
        options={({ route }: any) => ({
          title: route.params?.cycleName || 'Respuestas',
        })}
      />
    </TeacherCoursesStack.Navigator>
  );
}

const TeacherReportsStack = createNativeStackNavigator();

function TeacherReportsStackScreen() {
  return (
    <TeacherReportsStack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.dark },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 16, color: '#FFFFFF' },
      }}
    >
      <TeacherReportsStack.Screen
        name="ReportsHome"
        component={TeacherReportsScreen}
        options={{
          title: 'Reportes',
          headerLargeTitle: true,
        }}
      />
      <TeacherReportsStack.Screen
        name="EvaluationResponses"
        component={EvaluationResponsesScreen}
        options={({ route }: any) => ({
          title: route.params?.cycleName || 'Resultados de Evaluación',
        })}
      />
    </TeacherReportsStack.Navigator>
  );
}

const TeacherTabs = createBottomTabNavigator();

export function TeacherTabsNavigator() {
  return (
    <TeacherTabs.Navigator
      screenOptions={({ route }: any) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }: any) => {
          let iconName = 'bookmarks';

          if (route.name === 'TeacherCoursesTab') {
            iconName = focused ? 'book-open' : 'book';
          } else if (route.name === 'TeacherReportsTab') {
            iconName = focused ? 'chart-box' : 'chart-line';
          } else if (route.name === 'TeacherProfileTab') {
            iconName = focused ? 'account-circle' : 'account-circle-outline';
          }

          return (
            <MaterialCommunityIcons
              name={iconName as any}
              size={size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
      })}
    >
      <TeacherTabs.Screen
        name="TeacherCoursesTab"
        component={TeacherCoursesStackScreen}
        options={{
          tabBarLabel: 'Cursos',
        }}
      />
      <TeacherTabs.Screen
        name="TeacherReportsTab"
        component={TeacherReportsStackScreen}
        options={{
          tabBarLabel: 'Reportes',
        }}
      />
      <TeacherTabs.Screen
        name="TeacherProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          headerShown: true,
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '700', fontSize: 16, color: '#FFFFFF' },
          title: 'Mi perfil',
        }}
      />
    </TeacherTabs.Navigator>
  );
}
