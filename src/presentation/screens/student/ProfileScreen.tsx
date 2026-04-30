import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../../core/theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAuth } from '../../contexts/AuthContext';

export function ProfileScreen() {
  const { user, logout, isSubmitting } = useAuth();

  return (
    <View style={styles.root}>
      <SurfaceCard>
        <Text style={styles.title}>{user?.name || 'Estudiante'}</Text>
        <Text style={styles.subtitle}>{user?.email}</Text>

        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Rol</Text>
          <Text style={styles.metaValue}>{user?.role}</Text>
        </View>

        <View style={{ height: spacing.lg }} />

        <PrimaryButton title="Cerrar sesión" onPress={logout} loading={isSubmitting} />
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { color: colors.text, fontSize: 22, fontWeight: '900' },
  subtitle: { marginTop: spacing.xs, color: colors.textMuted, fontSize: 13 },
  metaBox: { marginTop: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, padding: spacing.md },
  metaLabel: { color: colors.textMuted, fontSize: 12 },
  metaValue: { marginTop: 2, color: colors.text, fontSize: 14, fontWeight: '800' },
});