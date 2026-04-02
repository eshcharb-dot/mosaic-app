import { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

export default function SuccessScreen() {
  const { payout } = useLocalSearchParams<{ payout?: string }>()
  const router = useRouter()

  const scaleAnim = useRef(new Animated.Value(0)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  const payoutAmount = payout ? (parseInt(payout, 10) / 100).toFixed(2) : '0.00'

  useEffect(() => {
    // Bounce-in animation for checkmark
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }, [scaleAnim, opacityAnim])

  return (
    <View style={s.container}>
      <View style={s.content}>
        {/* Animated checkmark */}
        <Animated.View
          style={[
            s.checkCircle,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          <Text style={s.checkmark}>✓</Text>
        </Animated.View>

        <Text style={s.heading}>Submitted!</Text>
        <Text style={s.subtext}>Your photo is being analysed by Mosaic AI</Text>

        {/* Payout earned */}
        <View style={s.payoutCard}>
          <Text style={s.payoutAmount}>£{payoutAmount}</Text>
          <Text style={s.payoutLabel}>earned</Text>
        </View>
      </View>

      {/* CTA */}
      <View style={s.footer}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={s.backBtnText}>Back to Tasks</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030305' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },

  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,224,150,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(0,224,150,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  checkmark: { fontSize: 58, color: '#00e096', lineHeight: 70 },

  heading: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 16,
    color: '#b0b0d0',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 260,
  },

  payoutCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,224,150,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,224,150,0.25)',
    borderRadius: 20,
    paddingHorizontal: 40,
    paddingVertical: 20,
    marginTop: 8,
  },
  payoutAmount: { fontSize: 44, fontWeight: '900', color: '#00e096' },
  payoutLabel: { fontSize: 16, color: '#00e096', opacity: 0.7, fontWeight: '600', marginTop: 2 },

  footer: {
    padding: 24,
    paddingBottom: 48,
  },
  backBtn: {
    backgroundColor: '#7c6df5',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  backBtnText: { fontSize: 17, fontWeight: '800', color: '#030305' },
})
