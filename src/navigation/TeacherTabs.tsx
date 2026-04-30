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

// Types
import { colors } from '../core/theme';

const TeacherCoursesStack = createNativeStackNavigator();

function TeacherCoursesStackScreen() {
  return (
    <TeacherCoursesStack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 16,
        },
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
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 16,
        },
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
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
          borderTopColor: '#e0e0e0',
          borderTopWidth: 1,
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
    </TeacherTabs.Navigator>
  );
}
