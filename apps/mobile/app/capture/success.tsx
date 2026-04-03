import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

const RING_SIZE = 160
const STROKE = 10

const OFFLINE_AMBER = '#ffa040'

// --- Pure-RN circular progress ring (no SVG dep required) ---
// Uses two half-disc clipping masks rotated by an Animated value.
// Works on iOS and Android with zero native modules.

export default function SuccessScreen() {
  const { payout, mode, count } = useLocalSearchParams<{ payout?: string; mode?: string; count?: string }>()
  const router = useRouter()

  const isOffline = mode === 'offline'
  const photoCount = count ? parseInt(count, 10) : 1

  const [scoreState, setScoreState] = useState<'analyzing' | 'done'>('analyzing')
  const [displayScore, setDisplayScore] = useState(0)
  const [isCompliant, setIsCompliant] = useState(false)

  const scaleAnim = useRef(new Animated.Value(0)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  // 0 → 1 drives the ring fill (0% → 100%)
  const ringAnim = useRef(new Animated.Value(0)).current
  const scoreAnim = useRef(new Animated.Value(0)).current

  const MOCK_SCORE = 87
  const MOCK_COMPLIANT = true

  const payoutAmount = payout ? (parseInt(payout, 10) / 100).toFixed(2) : '0.00'

  useEffect(() => {
    // Entry bounce-in
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start()

    // Offline mode: skip the analyzing / score animation entirely
    if (isOffline) return

    // Pulsing dot
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    )
    pulse.start()

    // After 3s reveal mock score
    const timer = setTimeout(() => {
      pulse.stop()
      setIsCompliant(MOCK_COMPLIANT)
      setScoreState('done')

      Animated.parallel([
        Animated.timing(ringAnim, { toValue: MOCK_SCORE / 100, duration: 1200, useNativeDriver: false }),
        Animated.timing(scoreAnim, { toValue: MOCK_SCORE, duration: 1200, useNativeDriver: false }),
      ]).start()
    }, 3000)

    return () => {
      clearTimeout(timer)
      pulse.stop()
    }
  }, [scaleAnim, opacityAnim, pulseAnim, ringAnim, scoreAnim, isOffline])

  // Keep displayScore in sync with animated value
  useEffect(() => {
    const id = scoreAnim.addListener(({ value }) => setDisplayScore(Math.round(value)))
    return () => scoreAnim.removeListener(id)
  }, [scoreAnim])

  const ringColor = MOCK_COMPLIANT ? '#00e096' : '#ff4d6d'

  // ── Offline success screen ────────────────────────────────────────────────
  if (isOffline) {
    return (
      <View style={s.container}>
        <View style={s.content}>
          {/* Cloud icon */}
          <Animated.View
            style={[
              s.cloudCircle,
              { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
            ]}
          >
            <Text style={s.cloudIcon}>☁</Text>
          </Animated.View>

          <Text style={s.heading}>Saved offline</Text>
          {photoCount > 1 && (
            <Text style={s.photoCountText}>{photoCount} photos saved</Text>
          )}
          <Text style={[s.subtext, { color: OFFLINE_AMBER }]}>
            will sync when connected
          </Text>

          {/* Saved for sync card */}
          <View style={s.offlineCard}>
            <Text style={s.offlineCardTitle}>Saved for sync</Text>
            <Text style={s.offlineCardSub}>
              You'll be notified when your submission is processed
            </Text>
          </View>

          <Text style={s.subtext}>
            Your photo is queued and will be submitted automatically once you're back online.
          </Text>
        </View>

        {/* CTA */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.backBtn, { backgroundColor: OFFLINE_AMBER }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={s.backBtnText}>Back to Tasks</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Online success screen (original) ─────────────────────────────────────
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
        {photoCount > 1 && (
          <Text style={s.photoCountText}>{photoCount} photos submitted</Text>
        )}

        {/* Analyzing / Score section */}
        {scoreState === 'analyzing' ? (
          <View style={s.analyzingRow}>
            <Animated.View style={[s.pulseDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={s.analyzingText}>Analyzing shelf...</Text>
          </View>
        ) : (
          <View style={s.scoreWrapper}>
            <ProgressRing
              progress={ringAnim}
              color={ringColor}
              size={RING_SIZE}
              stroke={STROKE}
            />
            {/* Center overlay */}
            <View style={s.ringCenter}>
              <Text style={[s.scoreNumber, { color: ringColor }]}>{displayScore}</Text>
              <Text style={[s.complianceLabel, { color: ringColor }]}>
                {isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
              </Text>
            </View>
          </View>
        )}

        {/* Payout earned */}
        <View style={s.payoutCard}>
          <Text style={s.payoutAmount}>£{payoutAmount}</Text>
          <Text style={s.payoutLabel}>earned</Text>
        </View>

        {scoreState === 'analyzing' && (
          <Text style={s.subtext}>Your photo is being analysed by Mosaic AI</Text>
        )}
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

// ─── Progress Ring Component ────────────────────────────────────────────────
// Pure RN implementation using two rotating half-discs (no SVG dependency).
//
// Visual breakdown:
//   - A full circle outline (borderWidth ring, transparent fill)
//   - Two "filler" half-discs (semicircles) inside a clipper that rotates them
//     to paint the arc progressively from 0 → 360°
//
// For progress 0–50%: rotate the right filler from 0 → 180°, left stays hidden
// For progress 50–100%: right filler stays at 180°, rotate left filler from 0 → 180°

function ProgressRing({
  progress,
  color,
  size,
  stroke,
}: {
  progress: Animated.Value
  color: string
  size: number
  stroke: number
}) {
  const half = size / 2

  // Right half rotates 0 → 180° for progress 0 → 0.5
  const rightRot = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '180deg', '180deg'],
    extrapolate: 'clamp',
  })

  // Left half stays invisible until progress > 0.5, then rotates 0 → 180° for 0.5 → 1
  const leftRot = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '0deg', '180deg'],
    extrapolate: 'clamp',
  })

  return (
    <View style={{ width: size, height: size, borderRadius: half, overflow: 'hidden', position: 'relative' }}>
      {/* Track ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: stroke,
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      />

      {/* Right half clipper */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: half,
          width: half,
          height: size,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: stroke,
            borderColor: color,
            position: 'absolute',
            top: 0,
            left: -half,
            transform: [{ translateX: half }, { rotate: rightRot }, { translateX: -half }],
          }}
        />
      </View>

      {/* Left half clipper */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: half,
          height: size,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: stroke,
            borderColor: color,
            position: 'absolute',
            top: 0,
            left: 0,
            transform: [{ translateX: half }, { rotate: leftRot }, { translateX: -half }],
          }}
        />
      </View>

      {/* Inner hole to make it look like a ring */}
      <View
        style={{
          position: 'absolute',
          top: stroke,
          left: stroke,
          right: stroke,
          bottom: stroke,
          borderRadius: half - stroke,
          backgroundColor: '#030305',
        }}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030305' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },

  // Online: green check circle
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,224,150,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(0,224,150,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { fontSize: 38, color: '#00e096', lineHeight: 46 },

  // Offline: amber cloud circle
  cloudCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,160,64,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255,160,64,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudIcon: { fontSize: 36, color: OFFLINE_AMBER, lineHeight: 44 },

  heading: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  photoCountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#b0b0d0',
    marginTop: -8,
  },
  subtext: {
    fontSize: 14,
    color: '#b0b0d0',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },

  analyzingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7c6df5',
  },
  analyzingText: {
    fontSize: 16,
    color: '#b0b0d0',
    fontWeight: '600',
  },

  scoreWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: RING_SIZE,
    height: RING_SIZE,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 54,
  },
  complianceLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 2,
  },

  payoutCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,224,150,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,224,150,0.25)',
    borderRadius: 20,
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  payoutAmount: { fontSize: 44, fontWeight: '900', color: '#00e096' },
  payoutLabel: { fontSize: 16, color: '#00e096', opacity: 0.7, fontWeight: '600', marginTop: 2 },

  // Offline sync card
  offlineCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,160,64,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,160,64,0.3)',
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingVertical: 20,
    gap: 6,
    maxWidth: 280,
  },
  offlineCardTitle: { fontSize: 20, fontWeight: '800', color: OFFLINE_AMBER },
  offlineCardSub: { fontSize: 14, color: '#b0b0d0', textAlign: 'center', lineHeight: 20 },

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
