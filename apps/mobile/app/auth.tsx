import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup'

export default function AuthScreen() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    setError(null)

    if (mode === 'login') {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }
    } else {
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { role: 'collector' },
        },
      })
      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }
      Alert.alert(
        'Check your email',
        'We sent you a confirmation link. Please verify your email before signing in.',
      )
      setMode('login')
      setLoading(false)
      return
    }

    setLoading(false)
    router.replace('/(tabs)')
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={s.logoBlock}>
          <View style={s.logoMark}>
            <Text style={s.logoGlyph}>M</Text>
          </View>
          <Text style={s.logoText}>mosaic</Text>
          <Text style={s.tagline}>Physical world intelligence — earn by looking.</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>
            {mode === 'login' ? 'Welcome back' : 'Join as Collector'}
          </Text>

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={s.field}>
            <Text style={s.fieldLabel}>EMAIL</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#444466"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>PASSWORD</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#444466"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[s.submitBtn, loading && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#030305" size="small" />
            ) : (
              <Text style={s.submitBtnText}>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle mode */}
          <TouchableOpacity
            style={s.switchRow}
            onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
          >
            <Text style={s.switchText}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={s.switchLink}>
                {mode === 'login' ? 'Sign up as Collector' : 'Sign in'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>Mosaic v1.0 · Collector App</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030305' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 28 },

  logoBlock: { alignItems: 'center', gap: 10 },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#7c6df5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#7c6df5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  logoGlyph: { fontSize: 38, fontWeight: '900', color: '#ffffff' },
  logoText: { fontSize: 32, fontWeight: '900', color: '#ffffff', letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: '#b0b0d0', textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: '#0c0c18',
    borderWidth: 1,
    borderColor: '#222240',
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 4 },

  errorBox: {
    backgroundColor: 'rgba(255,80,80,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.25)',
    borderRadius: 12,
    padding: 12,
  },
  errorText: { fontSize: 14, color: '#ff6060', lineHeight: 20 },

  field: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: '#7c6df5', letterSpacing: 1.2 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: '#222240',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#ffffff',
  },

  submitBtn: {
    backgroundColor: '#7c6df5',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: '#030305' },

  switchRow: { alignItems: 'center', paddingVertical: 4 },
  switchText: { fontSize: 14, color: '#b0b0d0', textAlign: 'center' },
  switchLink: { color: '#7c6df5', fontWeight: '700' },

  footer: { fontSize: 12, color: '#444466', textAlign: 'center' },
})
