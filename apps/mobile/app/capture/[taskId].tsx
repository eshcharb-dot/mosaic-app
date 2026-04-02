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
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera'
import { supabase } from '../../lib/supabase'
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

export default function CaptureScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>()
  const router = useRouter()

  const [permission, requestPermission] = useCameraPermissions()
  const [task, setTask] = useState<TaskWithRelations | null>(null)
  const [loadingTask, setLoadingTask] = useState(true)
  const [facing] = useState<CameraType>('back')
  const [capturedUri, setCapturedUri] = useState<string | null>(null)
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

  async function handleCapture() {
    if (!cameraRef.current) return
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 })
    if (photo) {
      setCapturedUri(photo.uri)
      setUploadError(null)
    }
  }

  function handleRetake() {
    setCapturedUri(null)
    setUploadError(null)
  }

  async function handleUsePhoto() {
    if (!capturedUri || !task) return
    setUploading(true)
    setUploadError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to submit.')
      setUploading(false)
      return
    }

    try {
      // Convert URI to blob
      const response = await fetch(capturedUri)
      const blob = await response.blob()
      const ext = 'jpg'
      const fileName = `${user.id}/${task.id}/${Date.now()}.${ext}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('submissions')
        .getPublicUrl(fileName)

      const photoUrl = urlData.publicUrl

      // Create submission row
      const { data: submissionData, error: submissionError } = await supabase
        .from('submissions')
        .insert({
          task_id: task.id,
          collector_id: user.id,
          campaign_id: task.campaign_id,
          store_id: task.store_id,
          photo_urls: [photoUrl],
          status: 'pending_review',
          submitted_at: new Date().toISOString(),
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

      // Navigate to success — pass payout + submissionId
      router.replace({
        pathname: '/capture/success',
        params: {
          payout: String(task.payout_cents),
          taskId: task.id,
          submissionId: submissionData?.id ?? '',
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

  // Preview mode after capture
  if (capturedUri) {
    return (
      <View style={s.container}>
        <Image source={{ uri: capturedUri }} style={s.preview} resizeMode="cover" />

        {/* Overlay store name */}
        <View style={s.previewOverlay}>
          <Text style={s.overlayStoreName} numberOfLines={1}>{storeName}</Text>
          <Text style={s.overlayLabel}>Review your photo</Text>
        </View>

        {/* Error message */}
        {uploadError && (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>{uploadError}</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={s.previewActions}>
          <TouchableOpacity style={s.retakeBtn} onPress={handleRetake} disabled={uploading}>
            <Text style={s.retakeBtnText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.usePhotoBtn, uploading && s.btnDisabled]}
            onPress={handleUsePhoto}
            disabled={uploading}
          >
            {uploading ? (
              <View style={s.uploadingRow}>
                <ActivityIndicator color="#030305" size="small" />
                <Text style={s.uploadingText}>Uploading...</Text>
              </View>
            ) : (
              <Text style={s.usePhotoBtnText}>Use Photo</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // Camera mode
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

        {/* Capture button */}
        <View style={s.cameraOverlayBottom}>
          <TouchableOpacity style={s.captureRing} onPress={handleCapture} activeOpacity={0.8}>
            <View style={s.captureInner} />
          </TouchableOpacity>
        </View>
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
  overlayLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

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

  // Preview
  preview: { flex: 1 },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(3,3,5,0.65)',
  },
  errorBanner: {
    position: 'absolute',
    bottom: 140,
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
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: 48,
    backgroundColor: 'rgba(3,3,5,0.6)',
  },
  retakeBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  retakeBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  usePhotoBtn: {
    flex: 2,
    backgroundColor: '#7c6df5',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  usePhotoBtnText: { fontSize: 16, fontWeight: '800', color: '#030305' },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadingText: { fontSize: 15, fontWeight: '700', color: '#030305' },
  btnDisabled: { opacity: 0.6 },
})
