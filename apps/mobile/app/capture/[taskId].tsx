import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
  Platform,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera'
import { supabase } from '../../lib/supabase'
import { useIsOnline } from '../../lib/connectivity'
import { enqueueSubmission, markTaskPendingSync } from '../../lib/offlineQueue'
import type { Task, Store, Campaign } from '@mosaic/types'

type TaskWithRelations = Task & {
  stores: Store
  campaigns: Campaign
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

// Frame guide dimensions — 80% width, 55% height
const FRAME_W = SCREEN_WIDTH * 0.8
const FRAME_H = SCREEN_HEIGHT * 0.55
const CORNER = 22  // corner bracket length
const CORNER_THICKNESS = 3

const MAX_PHOTOS = 5

export default function CaptureScreen() {
  const { taskId, locationVerified } = useLocalSearchParams<{ taskId: string; locationVerified?: string }>()
  const router = useRouter()
  const isOnline = useIsOnline()

  const [permission, requestPermission] = useCameraPermissions()
  const [task, setTask] = useState<TaskWithRelations | null>(null)
  const [loadingTask, setLoadingTask] = useState(true)
  const [facing] = useState<CameraType>('back')
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const cameraRef = useRef<CameraView>(null)

  useEffect(() => {
    if (!taskId) return
    fetchTask()
  }, [taskId])

  async function fetchTask() {
    const { data } = await supabase
      .from('tasks')
      .select('*, stores(*), campaigns(*)')
      .eq('id', taskId)
      .single()
    setTask(data as TaskWithRelations)
    setLoadingTask(false)
  }

  async function takePicture() {
    if (!cameraRef.current) return
    if (photos.length >= MAX_PHOTOS) return
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 })
    if (photo) {
      setPhotos(prev => [...prev, photo.uri])
      setUploadError(null)
    }
  }

  async function handleSubmit() {
    if (!photos.length || !task) return
    setUploading(true)
    setUploadError(null)

    // ── Offline path ───────────────────────────────────────────────────────────
    if (!isOnline) {
      try {
        const localId = await enqueueSubmission(task.id, photos)
        await markTaskPendingSync(task.id)
        router.replace({
          pathname: '/capture/success',
          params: {
            payout: String(task.payout_cents),
            taskId: task.id,
            submissionId: localId,
            mode: 'offline',
            count: String(photos.length),
          },
        })
      } catch (err) {
        setUploadError('Failed to save offline. Please try again.')
        setUploading(false)
      }
      return
    }

    // ── Online path ────────────────────────────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to submit.')
      setUploading(false)
      return
    }

    try {
      const timestamp = Date.now()
      const photoUrls: string[] = []

      // Upload each photo
      for (let i = 0; i < photos.length; i++) {
        const uri = photos[i]
        const response = await fetch(uri)
        const blob = await response.blob()
        const fileName = `${user.id}/${task.id}/${timestamp}_${i}.jpg`

        const { error: uploadErr } = await supabase.storage
          .from('submissions')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false })

        if (uploadErr) throw uploadErr

        const { data: urlData } = supabase.storage
          .from('submissions')
          .getPublicUrl(fileName)

        photoUrls.push(urlData.publicUrl)
      }

      // Create single submission row with all photo URLs
      const { data: submissionData, error: submissionError } = await supabase
        .from('submissions')
        .insert({
          task_id: task.id,
          collector_id: user.id,
          campaign_id: task.campaign_id,
          store_id: task.store_id,
          photo_urls: photoUrls,
          status: 'pending_review',
          submitted_at: new Date().toISOString(),
          location_verified: locationVerified === 'true',
          metadata: {
            location_verified: locationVerified === 'true',
            captured_at: new Date().toISOString(),
            platform: Platform.OS,
          },
        })
        .select('id')
        .single()

      if (submissionError) throw submissionError

      // Update task status
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'submitted', completed_at: new Date().toISOString() })
        .eq('id', task.id)

      if (taskError) throw taskError

      router.replace({
        pathname: '/capture/success',
        params: {
          payout: String(task.payout_cents),
          taskId: task.id,
          submissionId: submissionData?.id ?? '',
          mode: 'online',
          count: String(photos.length),
        },
      })
    } catch (err) {
      setUploadError('Upload failed. Try again.')
      setUploading(false)
    }
  }

  // Permission not yet determined
  if (!permission) {
    return <View style={s.container} />
  }

  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Text style={s.permText}>Camera access is required to capture tasks.</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (loadingTask) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#7c6df5" size="large" />
      </View>
    )
  }

  const storeName = task?.stores?.name ?? 'Store'

  // Camera mode (always shown; photo strip overlays bottom)
  return (
    <View style={s.container}>
      <CameraView ref={cameraRef} style={s.camera} facing={facing}>
        {/* Store name overlay */}
        <View style={s.cameraOverlayTop}>
          <Text style={s.overlayStoreName} numberOfLines={1}>{storeName}</Text>
          <Text style={s.overlayHint}>Frame the full shelf display</Text>
        </View>

        {/* Frame guide overlay — centered */}
        <View style={s.frameGuideContainer} pointerEvents="none">
          <View style={s.frameGuide}>
            {/* Thin border */}
            <View style={s.frameBorder} />
            {/* Top-left */}
            <View style={[s.cH, { top: 0, left: 0 }]} />
            <View style={[s.cV, { top: 0, left: 0 }]} />
            {/* Top-right */}
            <View style={[s.cH, { top: 0, right: 0 }]} />
            <View style={[s.cV, { top: 0, right: 0 }]} />
            {/* Bottom-left */}
            <View style={[s.cH, { bottom: 0, left: 0 }]} />
            <View style={[s.cV, { bottom: 0, left: 0 }]} />
            {/* Bottom-right */}
            <View style={[s.cH, { bottom: 0, right: 0 }]} />
            <View style={[s.cV, { bottom: 0, right: 0 }]} />
          </View>
        </View>

        {/* Error message */}
        {uploadError && (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>{uploadError}</Text>
          </View>
        )}

        {/* Photo strip */}
        {photos.length > 0 && (
          <View style={{
            position: 'absolute', bottom: 100, left: 0, right: 0,
            flexDirection: 'row', paddingHorizontal: 16, gap: 8, alignItems: 'center'
          }}>
            {photos.map((uri, i) => (
              <View key={i} style={{ position: 'relative' }}>
                <Image source={{ uri }} style={{ width: 56, height: 56, borderRadius: 6, borderWidth: 2, borderColor: '#7c6df5' }} />
                <TouchableOpacity
                  onPress={() => setPhotos(p => p.filter((_, j) => j !== i))}
                  style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#ff4d6d', borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity
                onPress={takePicture}
                style={{ width: 56, height: 56, borderRadius: 6, borderWidth: 2, borderColor: '#222240', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#b0b0d0', fontSize: 24 }}>+</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Submit button */}
        {photos.length > 0 && (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={uploading}
            style={{
              position: 'absolute', bottom: 32, left: 32, right: 32,
              backgroundColor: '#7c6df5', borderRadius: 12, paddingVertical: 16,
              alignItems: 'center', opacity: uploading ? 0.6 : 1
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              {uploading ? 'Uploading...' : `Submit ${photos.length} Photo${photos.length > 1 ? 's' : ''}`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Capture button — only shown when no photos yet, or strip has room */}
        {photos.length === 0 && (
          <View style={s.cameraOverlayBottom}>
            <TouchableOpacity style={s.captureRing} onPress={takePicture} activeOpacity={0.8}>
              <View style={s.captureInner} />
            </TouchableOpacity>
          </View>
        )}
      </CameraView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#030305' },

  permText: { fontSize: 16, color: '#b0b0d0', textAlign: 'center', marginBottom: 20, lineHeight: 24 },
  permBtn: { backgroundColor: '#7c6df5', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  permBtnText: { fontSize: 15, fontWeight: '700', color: '#030305' },

  camera: { flex: 1 },

  cameraOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(3,3,5,0.6)',
  },
  overlayStoreName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  overlayHint: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  // Frame guide
  frameGuideContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameGuide: {
    width: FRAME_W,
    height: FRAME_H,
    position: 'relative',
  },
  frameBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(124,109,245,0.25)',
    borderRadius: 4,
  },
  // Corner bracket bars — position props (top/bottom/left/right) applied inline
  cH: {
    position: 'absolute',
    width: CORNER,
    height: CORNER_THICKNESS,
    backgroundColor: '#7c6df5',
    borderRadius: 2,
  },
  cV: {
    position: 'absolute',
    width: CORNER_THICKNESS,
    height: CORNER,
    backgroundColor: '#7c6df5',
    borderRadius: 2,
  },

  cameraOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 52,
    alignItems: 'center',
    backgroundColor: 'rgba(3,3,5,0.4)',
    paddingTop: 24,
  },
  captureRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#ffffff',
  },

  errorBanner: {
    position: 'absolute',
    bottom: 175,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,77,109,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,77,109,0.4)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff4d6d',
  },
})
