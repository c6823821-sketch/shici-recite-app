import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

interface RuleProps {
  label?: string;
}

export function InkRule({ label }: RuleProps) {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 18,
  },
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    flex: 1,
  },
  label: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    letterSpacing: 2,
  },
});
