import React from 'react';

import { AuthProvider } from './AuthContext';
import { StudentProvider } from './StudentContext';
import { TeacherProvider } from './TeacherContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <StudentProvider>
        <TeacherProvider>{children}</TeacherProvider>
      </StudentProvider>
    </AuthProvider>
  );
}