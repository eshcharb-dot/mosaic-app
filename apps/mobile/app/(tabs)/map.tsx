import { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as Location from 'expo-location'
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg'
import { supabase } from '../../lib/supabase'

const { width: WIN_W, height: WIN_H } = Dimensions.get('window')

// ─── Haversine ────────────────────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface TaskPin {
  id: string
  payoutCents: number
  storeName: string
  campaignName: string
  lat: number
  lng: number
  distKm: number
}

interface SelectedPin extends TaskPin {
  svgX: number
  svgY: number
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MAP_W = WIN_W
const MAP_H = WIN_H * 0.72
const CX = MAP_W / 2
const CY = MAP_H / 2

// Visible radius in km (what the outer ring represents)
const RADIUS_KM = 6

// Map km → SVG pixels
function kmToPx(km: number): number {
  return (km / RADIUS_KM) * (Math.min(MAP_W, MAP_H) / 2 - 20)
}

function pinColor(distKm: number): string {
  if (distKm < 2) return '#00e096'   // green
  if (distKm < 5) return '#ffd700'   // yellow
  return '#ff4d6d'                    // red
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function MapScreen() {
  const router = useRouter()

  const [permDenied, setPermDenied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [pins, setPins] = useState<TaskPin[]>([])
  const [selected, setSelected] = useState<SelectedPin | null>(null)

  const pulseAnim = useRef(new Animated.Value(1)).current
  const overlayAnim = useRef(new Animated.Value(0)).current

  // Pulse animation for user dot
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  // Request location + load tasks
  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setPermDenied(true)
        setLoading(false)
        return
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const userLat = loc.coords.latitude
      const userLng = loc.coords.longitude
      setUserLoc({ lat: userLat, lng: userLng })

      const { data } = await supabase
        .from('tasks')
        .select('id, payout_cents, stores(name, lat, lng), campaigns(name)')
        .eq('status', 'open')
        .limit(50)

      if (data) {
        const mapped: TaskPin[] = (data as any[])
          .filter((t) => t.stores?.lat != null && t.stores?.lng != null)
          .map((t) => ({
            id: t.id,
            payoutCents: t.payout_cents,
            storeName: t.stores.name,
            campaignName: t.campaigns?.name ?? '',
            lat: t.stores.lat,
            lng: t.stores.lng,
            distKm: haversineKm(userLat, userLng, t.stores.lat, t.stores.lng),
          }))
          .filter((p) => p.distKm <= RADIUS_KM * 1.2) // only show pins near the viewport
        setPins(mapped)
      }

      setLoading(false)
    })()
  }, [])

  // Animate overlay in/out
  useEffect(() => {
    Animated.timing(overlayAnim, {
      toValue: selected ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start()
  }, [selected])

  // Convert lat/lng to SVG coords relative to user position
  function toSvgCoords(lat: number, lng: number): { x: number; y: number } {
    if (!userLoc) return { x: CX, y: CY }
    const dLat = lat - userLoc.lat
    const dLng = lng - userLoc.lng
    // 1 degree lat ≈ 111 km; 1 degree lng ≈ 111 * cos(lat) km
    const dLatKm = dLat * 111
    const dLngKm = dLng * 111 * Math.cos(userLoc.lat * Math.PI / 180)
    const px = CX + kmToPx(dLngKm)
    const py = CY - kmToPx(dLatKm) // y is inverted on screen
    return { x: px, y: py }
  }

  function handlePinPress(pin: TaskPin) {
    const { x, y } = toSvgCoords(pin.lat, pin.lng)
    setSelected({ ...pin, svgX: x, svgY: y })
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#7c6df5" size="large" />
        <Text style={s.loadingText}>Finding nearby tasks…</Text>
      </View>
    )
  }

  if (permDenied) {
    return (
      <View style={s.center}>
        <Text style={s.permTitle}>Location access required</Text>
        <Text style={s.permText}>Enable location to see nearby tasks on the map.</Text>
        <TouchableOpacity style={s.settingsBtn} onPress={() => Linking.openSettings()}>
          <Text style={s.settingsBtnText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const ring1Px = kmToPx(1)
  const ring2Px = kmToPx(2)
  const ring5Px = kmToPx(5)

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Nearby Tasks</Text>
        <View style={s.countBadge}>
          <Text style={s.countText}>{pins.length} open</Text>
        </View>
      </View>

      {/* SVG Map */}
      <View style={s.mapContainer}>
        <Svg width={MAP_W} height={MAP_H}>
          {/* Distance rings */}
          <Circle cx={CX} cy={CY} r={ring1Px} fill="none" stroke="#222240" strokeWidth={1} strokeDasharray="4 4" />
          <Circle cx={CX} cy={CY} r={ring2Px} fill="none" stroke="#222240" strokeWidth={1} strokeDasharray="4 4" />
          <Circle cx={CX} cy={CY} r={ring5Px} fill="none" stroke="#222240" strokeWidth={1} strokeDasharray="6 6" />

          {/* Ring labels */}
          <SvgText x={CX + ring1Px + 4} y={CY - 4} fontSize={10} fill="#444470" fontWeight="500">1 km</SvgText>
          <SvgText x={CX + ring2Px + 4} y={CY - 4} fontSize={10} fill="#444470" fontWeight="500">2 km</SvgText>
          <SvgText x={CX + ring5Px + 4} y={CY - 4} fontSize={10} fill="#444470" fontWeight="500">5 km</SvgText>

          {/* Crosshair lines */}
          <Line x1={CX} y1={CY - ring5Px - 10} x2={CX} y2={CY + ring5Px + 10} stroke="#222240" strokeWidth={0.5} />
          <Line x1={CX - ring5Px - 10} y1={CY} x2={CX + ring5Px + 10} y2={CY} stroke="#222240" strokeWidth={0.5} />

          {/* Task pins */}
          {pins.map((pin) => {
            const { x, y } = toSvgCoords(pin.lat, pin.lng)
            const color = pinColor(pin.distKm)
            const isSelected = selected?.id === pin.id
            return (
              <G key={pin.id} onPress={() => handlePinPress(pin)}>
                {/* Glow ring */}
                <Circle cx={x} cy={y} r={isSelected ? 16 : 12} fill={color} opacity={0.15} />
                {/* Pin body */}
                <Circle cx={x} cy={y} r={isSelected ? 8 : 6} fill={color} />
                {/* Pin border */}
                <Circle cx={x} cy={y} r={isSelected ? 8 : 6} fill="none" stroke="#030305" strokeWidth={1.5} />
              </G>
            )
          })}

          {/* User dot (drawn last = on top) */}
          <Circle cx={CX} cy={CY} r={10} fill="rgba(124,109,245,0.15)" />
          <Circle cx={CX} cy={CY} r={6} fill="#7c6df5" />
          <Circle cx={CX} cy={CY} r={6} fill="none" stroke="#ffffff" strokeWidth={1.5} />
        </Svg>

        {/* Pulsing ring around user (native animated, outside SVG) */}
        <Animated.View
          style={[
            s.userPulse,
            {
              left: CX - 10,
              top: CY - 10,
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({ inputRange: [1, 1.6], outputRange: [0.5, 0] }),
            },
          ]}
          pointerEvents="none"
        />
      </View>

      {/* Legend */}
      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#00e096' }]} />
          <Text style={s.legendText}>&lt;2 km</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#ffd700' }]} />
          <Text style={s.legendText}>2–5 km</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#ff4d6d' }]} />
          <Text style={s.legendText}>&gt;5 km</Text>
        </View>
      </View>

      {/* Task overlay card */}
      {selected && (
        <Animated.View
          style={[
            s.overlay,
            {
              opacity: overlayAnim,
              transform: [
                {
                  translateY: overlayAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={s.overlayHandle} />

          <View style={s.overlayRow}>
            <View style={s.overlayInfo}>
              <Text style={s.overlayStore} numberOfLines={1}>{selected.storeName}</Text>
              <Text style={s.overlayCampaign} numberOfLines={1}>{selected.campaignName}</Text>
            </View>
            <View style={s.overlayRight}>
              <View style={s.payoutBadge}>
                <Text style={s.payoutText}>£{(selected.payoutCents / 100).toFixed(2)}</Text>
              </View>
              <View style={[s.distBadge, { borderColor: pinColor(selected.distKm) + '44' }]}>
                <Text style={[s.distText, { color: pinColor(selected.distKm) }]}>
                  {selected.distKm < 1
                    ? `${Math.round(selected.distKm * 1000)} m`
                    : `${selected.distKm.toFixed(1)} km`}
                </Text>
              </View>
            </View>
          </View>

          <View style={s.overlayActions}>
            <TouchableOpacity style={s.dismissBtn} onPress={() => setSelected(null)}>
              <Text style={s.dismissBtnText}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.acceptBtn}
              onPress={() => router.push(`/task/${selected.id}`)}
            >
              <Text style={s.acceptBtnText}>Accept Task</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030305' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#030305' },
  loadingText: { marginTop: 16, fontSize: 15, color: '#b0b0d0' },

  // Permission denied
  permTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 10, textAlign: 'center' },
  permText: { fontSize: 15, color: '#b0b0d0', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  settingsBtn: { backgroundColor: '#7c6df5', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13 },
  settingsBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#222240',
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#ffffff', letterSpacing: -0.5 },
  countBadge: {
    backgroundColor: 'rgba(124,109,245,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124,109,245,0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  countText: { fontSize: 13, fontWeight: '700', color: '#7c6df5' },

  // Map
  mapContainer: { position: 'relative', backgroundColor: '#050510' },
  userPulse: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7c6df5',
  },

  // Legend
  legend: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#222240',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#b0b0d0' },

  // Overlay card
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0c0c18',
    borderTopWidth: 1,
    borderTopColor: '#222240',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 16,
  },
  overlayHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333360',
    alignSelf: 'center',
    marginBottom: 4,
  },
  overlayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  overlayInfo: { flex: 1, marginRight: 12 },
  overlayStore: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  overlayCampaign: { fontSize: 14, color: '#b0b0d0' },
  overlayRight: { gap: 6, alignItems: 'flex-end' },
  payoutBadge: {
    backgroundColor: 'rgba(0,224,150,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,224,150,0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  payoutText: { fontSize: 17, fontWeight: '900', color: '#00e096' },
  distBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  distText: { fontSize: 13, fontWeight: '700' },
  overlayActions: { flexDirection: 'row', gap: 12 },
  dismissBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222240',
  },
  dismissBtnText: { fontSize: 15, fontWeight: '600', color: '#b0b0d0' },
  acceptBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#7c6df5',
  },
  acceptBtnText: { fontSize: 15, fontWeight: '700', color: '#030305' },
})
