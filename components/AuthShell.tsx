import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, S } from '@/constants/theme';
import { Text } from '@/components/ui';

const logo = require('../assets/images/nikfoods-logo.png');

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: S.md }}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={10} accessibilityLabel="Close" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={20} color={C.text} />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: S.xl, paddingTop: 0 }}>
          <Image source={logo} style={{ width: 150, height: 42, marginBottom: S.xl }} contentFit="contain" />
          <Text weight="bold" size={30}>{title}</Text>
          {!!subtitle && <Text size={15} color={C.muted} style={{ marginTop: 6, marginBottom: S.xl }}>{subtitle}</Text>}
          {!subtitle && <View style={{ height: S.xl }} />}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
