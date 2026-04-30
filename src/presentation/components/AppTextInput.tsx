import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../core/theme';

interface AppTextInputProps extends TextInputProps {
  label: string;
  error?: string | null;
  containerStyle?: ViewStyle;
  rightElement?: React.ReactNode;
}

export function AppTextInput({ label, error, containerStyle, rightElement, style, ...props }: AppTextInputProps) {
  return (
    <View style={containerStyle}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, error ? styles.inputShellError : null]}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          {...props}
        />
        {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.xs,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  inputShell: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  inputShellError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  rightElement: {
    marginLeft: spacing.sm,
  },
  error: {
    marginTop: spacing.xs,
    color: colors.danger,
    fontSize: 12,
  },
});