import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../../core/theme';
import { AppTextInput } from '../../components/AppTextInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useAuth } from '../../contexts/AuthContext';

export function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { register, isSubmitting, error, clearError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hidden, setHidden] = useState(true);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const validate = () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setFieldError('Completa todos los campos');
      return false;
    }
    if (name.trim().split(' ').length < 2) {
      setFieldError('Ingresa nombre y apellido');
      return false;
    }
    if (!email.toLowerCase().endsWith('@uninorte.edu.co')) {
      setFieldError('Usa tu correo institucional (@uninorte.edu.co)');
      return false;
    }
    if (password.length < 6) {
      setFieldError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    setFieldError(null);
    return true;
  };

  const handleRegister = async () => {
    clearError();
    if (!validate()) return;
    const success = await register({
      name: name.trim(),
      email: email.trim(),
      password,
    });

    if (success) {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.logoBox}>
            <MaterialCommunityIcons name="account-plus" size={42} color="#FFFFFF" />
          </View>
          <Text style={styles.brand}>Crear cuenta</Text>
          <Text style={styles.tagline}>Registro exclusivo para estudiantes</Text>
        </View>

        <SurfaceCard>
          <AppTextInput label="Nombre completo" value={name} onChangeText={setName} placeholder="Nombre Apellido" />
          <View style={{ height: spacing.md }} />
          <AppTextInput label="Correo institucional" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="usuario@uninorte.edu.co" />
          <View style={{ height: spacing.md }} />
          <AppTextInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={hidden}
            placeholder="Mínimo 6 caracteres"
            rightElement={(
              <Pressable onPress={() => setHidden((value) => !value)} hitSlop={10}>
                <MaterialCommunityIcons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.textMuted} />
              </Pressable>
            )}
          />

          {(fieldError || error) ? <Text style={styles.errorText}>{fieldError ?? error}</Text> : null}

          <View style={{ height: spacing.lg }} />
          <PrimaryButton title="Crear cuenta" onPress={handleRegister} loading={isSubmitting} />
        </SurfaceCard>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.footerLink}>Volver a ingresar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingTop: 56, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { marginTop: spacing.lg, color: colors.text, fontSize: 28, fontWeight: '900' },
  tagline: { marginTop: spacing.xs, color: colors.textMuted, fontSize: 14 },
  errorText: { marginTop: spacing.md, color: colors.danger, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg },
  footerText: { color: colors.textMuted, fontSize: 14 },
  footerLink: { color: colors.primary, fontWeight: '700', marginLeft: 6 },
});