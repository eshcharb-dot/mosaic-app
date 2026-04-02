import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'

const REFERRAL_CODE_KEY = 'mosaic_pending_referral_code'

export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const router = useRouter()
  const [valid, setValid] = useState<boolean | null>(null) // null = checking
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function validate() {
      if (!code) { setValid(false); return }
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', code.toUpperCase())
        .maybeSingle()
      setValid(!!data)
    }
    validate()
  }, [code])

  async function handleJoin() {
    if (!code) return
    setSaving(true)
    await AsyncStorage.setItem(REFERRAL_CODE_KEY, code.toUpperCase())
    setSaving(false)
    router.replace('/auth')
  }

  return (
    <View style={s.container}>
      {/* Logo mark */}
      <View style={s.logoMark}>
        <Text style={s.logoGlyph}>M</Text>
      </View>
      <Text style={s.logoText}>mosaic</Text>

      {valid === null ? (
        <ActivityIndicator color="#7c6df5" size="large" style={{ marginTop: 48 }} />
      ) : valid ? (
        <>
          <View style={s.badge}>
            <Text style={s.badgeText}>You were invited by a Mosaic collector</Text>
          </View>

          <Text style={s.headline}>Earn money auditing{'\n'}retail shelves.</Text>
          <Text style={s.sub}>
            Get paid for every task you complete. Your referral code{' '}
            <Text style={s.codeInline}>{code?.toUpperCase()}</Text> is ready.
          </Text>

          {/* How it works mini */}
          <View style={s.steps}>
            <StepRow num="1" text="Sign up with your email" />
            <StepRow num="2" text="Complete your first shelf audit" />
            <StepRow num="3" text="Start earning — your referrer gets a bonus too" />
          </View>

          <TouchableOpacity
            style={[s.joinBtn, saving && s.joinBtnDisabled]}
            onPress={handleJoin}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#030305" size="small" />
            ) : (
              <Text style={s.joinBtnText}>Join Mosaic</Text>
            )}
          </TouchableOpacity>

          <Text style={s.footer}>Referral code: {code?.toUpperCase()}</Text>
        </>
      ) : (
        <>
          <Text style={s.headline}>Invalid invite link</Text>
          <Text style={s.sub}>This referral code doesn't exist or has expired.</Text>
          <TouchableOpacity style={s.joinBtn} onPress={() => router.replace('/auth')}>
            <Text style={s.joinBtnText}>Go to Mosaic</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

function StepRow({ num, text }: { num: string; text: string }) {
  return (
    <View style={step.row}>
      <View style={step.dot}>
        <Text style={step.num}>{num}</Text>
      </View>
      <Text style={step.text}>{text}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030305',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#7c6df5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c6df5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  logoGlyph: { fontSize: 38, fontWeight: '900', color: '#ffffff' },
  logoText: { fontSize: 28, fontWeight: '900', color: '#ffffff', letterSpacing: -0.5 },

  badge: {
    marginTop: 16,
    backgroundColor: 'rgba(124,109,245,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124,109,245,0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeText: { fontSize: 13, fontWeight: '600', color: '#7c6df5', textAlign: 'center' },

  headline: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  sub: {
    fontSize: 15,
    color: '#b0b0d0',
    textAlign: 'center',
    lineHeight: 22,
  },
  codeInline: { color: '#7c6df5', fontWeight: '800' },

  steps: {
    width: '100%',
    backgroundColor: '#0c0c18',
    borderWidth: 1,
    borderColor: '#222240',
    borderRadius: 18,
    padding: 20,
    gap: 14,
    marginTop: 8,
  },

  joinBtn: {
    width: '100%',
    backgroundColor: '#7c6df5',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#7c6df5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  joinBtnDisabled: { opacity: 0.6 },
  joinBtnText: { fontSize: 17, fontWeight: '900', color: '#030305' },

  footer: { fontSize: 12, color: '#444466', marginTop: 8 },
})

const step = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(124,109,245,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(124,109,245,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { fontSize: 13, fontWeight: '800', color: '#7c6df5' },
  text: { fontSize: 14, color: '#b0b0d0', flex: 1, lineHeight: 20 },
})
