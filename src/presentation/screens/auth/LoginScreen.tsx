import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../../core/theme';
import { AppTextInput } from '../../components/AppTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAuth } from '../../contexts/AuthContext';

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login, isSubmitting, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hidden, setHidden] = useState(true);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const validate = () => {
    if (!email.trim() || !password.trim()) {
      setFieldError('Completa correo y contraseña');
      return false;
    }
    if (!email.toLowerCase().endsWith('@uninorte.edu.co')) {
      setFieldError('Usa tu correo institucional (@uninorte.edu.co)');
      return false;
    }
    setFieldError(null);
    return true;
  };

  const handleLogin = async () => {
    clearError();
    if (!validate()) return;
    await login({ email: email.trim(), password });
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.logoBox}>
            <MaterialCommunityIcons name="school" size={44} color="#FFFFFF" />
          </View>
          <Text style={styles.brand}>CoEval</Text>
          <Text style={styles.tagline}>Evaluación entre pares</Text>
        </View>

        <SurfaceCard>
          <Text style={styles.cardTitle}>Iniciar sesión</Text>
          <Text style={styles.cardSubtitle}>Ingresa con tu correo institucional</Text>

          <View style={{ height: spacing.lg }} />

          <AppTextInput
            label="Correo institucional"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="usuario@uninorte.edu.co"
          />

          <View style={{ height: spacing.md }} />

          <AppTextInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={hidden}
            placeholder="••••••••"
            rightElement={(
              <Pressable onPress={() => setHidden((value) => !value)} hitSlop={10}>
                <MaterialCommunityIcons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.textMuted} />
              </Pressable>
            )}
          />

          {(fieldError || error) ? (
            <Text style={styles.errorText}>{fieldError ?? error}</Text>
          ) : null}

          <Pressable
            onPress={() => navigation.navigate('ResetPassword')}
            style={styles.forgotButton}
          >
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>

          <View style={{ height: spacing.lg }} />

          <PrimaryButton title="Ingresar" onPress={handleLogin} loading={isSubmitting} />
        </SurfaceCard>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿No tienes cuenta?</Text>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Crear cuenta</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingTop: 68,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  brand: {
    marginTop: spacing.lg,
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tagline: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 15,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  cardSubtitle: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
  },
  errorText: {
    marginTop: spacing.md,
    color: colors.danger,
    fontSize: 13,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
  },
  forgotText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
});