import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const { colors, updateSettings } = useTheme();
  const [name, setName] = useState('');

  const handleContinue = async () => {
    const finalName = name.trim() || 'Usuario';
    await updateSettings({ userName: finalName });
    onComplete();
  };

  const c = colors;
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: c.primaryLight }]}>
          <Ionicons name="wallet" size={48} color={c.primary} />
        </View>
        <Text style={[styles.title, { color: c.text }]}>Bienvenido a Balance Pro</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          Tu control financiero inteligente
        </Text>

        <View style={[styles.inputContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Ionicons name="person-outline" size={20} color={c.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: c.text }]}
            placeholder="Tu nombre"
            placeholderTextColor={c.textLight}
            value={name}
            onChangeText={setName}
            autoFocus
            maxLength={30}
          />
        </View>
        <Text style={[styles.hint, { color: c.textLight }]}>
          Puedes cambiarlo despues en Configuracion
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: c.primary }]}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Comenzar</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F7F9' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconCircle: { width: 96, height: 96, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, marginTop: 32, height: 52,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 17, fontWeight: '500' },
  hint: { fontSize: 13, marginTop: 8 },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    width: '100%', paddingVertical: 16, borderRadius: 16, marginTop: 32, gap: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
