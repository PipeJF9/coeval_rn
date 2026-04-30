import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../../../core/theme';
import { AppTextInput } from '../../components/AppTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAuth } from '../../contexts/AuthContext';

export function ResetPasswordScreen() {
  const { forgotPassword, resetPassword, isSubmitting, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleRequest = async () => {
    clearError();
    setMessage(null);
    const success = await forgotPassword(email.trim());
    if (success) {
      setMessage('Se envió el enlace de recuperación.');
    }
  };

  const handleReset = async () => {
    clearError();
    setMessage(null);
    const success = await resetPassword(token.trim(), newPassword);
    if (success) {
      setMessage('La contraseña fue actualizada.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Recuperar contraseña</Text>
        <Text style={styles.subtitle}>Puedes solicitar el correo o completar el cambio con un token.</Text>

        <SurfaceCard>
          <AppTextInput label="Correo institucional" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="usuario@uninorte.edu.co" />
          <View style={{ height: spacing.md }} />
          <PrimaryButton title="Enviar correo" onPress={handleRequest} loading={isSubmitting} />

          <View style={{ height: spacing.xl }} />

          <AppTextInput label="Token" value={token} onChangeText={setToken} placeholder="Pega aquí el token recibido" />
          <View style={{ height: spacing.md }} />
          <AppTextInput label="Nueva contraseña" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Nueva contraseña" />
          <View style={{ height: spacing.md }} />
          <PrimaryButton title="Restablecer contraseña" onPress={handleReset} loading={isSubmitting} />

          {(message || error) ? <Text style={styles.message}>{message ?? error}</Text> : null}
        </SurfaceCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingTop: 72, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.xl, color: colors.textMuted, fontSize: 14 },
  message: { marginTop: spacing.md, color: colors.success, fontSize: 13, fontWeight: '600' },
});