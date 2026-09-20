import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, fonts } from '../theme';

interface SealButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}

export function SealButton({ label, onPress, disabled, compact, style }: SealButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.seal,
        compact && styles.compact,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.text, compact && styles.compactText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  seal: {
    minWidth: 54,
    minHeight: 54,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.vermilion,
    backgroundColor: colors.vermilion,
    borderRadius: 3,
    transform: [{ rotate: '-2deg' }],
  },
  compact: {
    minWidth: 40,
    minHeight: 40,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    transform: [{ rotate: '-2deg' }, { scale: 0.96 }],
  },
  text: {
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  compactText: {
    fontSize: 15,
    letterSpacing: 1,
  },
});
