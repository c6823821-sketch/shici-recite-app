import React from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function PaperCard({ children, className = '' }: CardProps) {
  return <View className={`rounded-2xl bg-surface border border-mist shadow-sm ${className}`}>{children}</View>;
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <View className="flex-row items-end justify-between mb-3">
      <View>
        {eyebrow ? <Text className="text-[10px] tracking-[3px] text-muted mb-1">{eyebrow}</Text> : null}
        <Text className="text-[22px] font-bold text-ink">{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function Pill({ children, active = false, className = '' }: { children: React.ReactNode; active?: boolean; className?: string }) {
  return (
    <View className={`rounded-full border px-3 py-1.5 ${active ? 'border-cinnabar bg-[#FBE9E7]' : 'border-mist bg-surface'} ${className}`}>
      <Text className={`text-xs ${active ? 'text-cinnabar font-semibold' : 'text-secondary'}`}>{children}</Text>
    </View>
  );
}

export function PrimaryButton({
  children,
  onPress,
  className = '',
  disabled = false,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`min-h-12 rounded-xl items-center justify-center bg-cinnabar active:scale-[0.98] ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      <Text className="text-white text-base font-semibold">{children}</Text>
    </Pressable>
  );
}

export function SoftButton({
  children,
  onPress,
  className = '',
}: {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
}) {
  return (
    <Pressable onPress={onPress} className={`min-h-12 rounded-xl items-center justify-center border border-mist bg-surface active:scale-[0.98] ${className}`}>
      <Text className="text-ink text-base">{children}</Text>
    </Pressable>
  );
}

export function CoverBanner({
  children,
  style,
  className = '',
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
}) {
  return <View style={style} className={`overflow-hidden rounded-2xl ${className}`}>{children}</View>;
}
