import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js'

type LoadState = 'meshLoading' | 'meshReady' | 'meshError'

type RoomViewerProps = {
  viewpointIndex: number
  onViewpointChange: (viewpointIndex: number) => void
  glbUrl?: string
}

type RoomViewpoint = {
  position: THREE.Vector3
  lookAt: THREE.Vector3
}

type NavigatorWithXR = Navigator & {
  xr?: {
    isSessionSupported: (mode: 'immersive-vr') => Promise<boolean>
  }
}

const ROOM_VIEWPOINTS: RoomViewpoint[] = [
  {
    position: new THREE.Vector3(0.02, 1.44, 0.72),
    lookAt: new THREE.Vector3(0.08, 1.26, -1.35),
  },
  {
    position: new THREE.Vector3(-0.54, 1.42, -0.22),
    lookAt: new THREE.Vector3(0.42, 1.22, -1.92),
  },
  {
    position: new THREE.Vector3(0.68, 1.4, -1.06),
    lookAt: new THREE.Vector3(-0.74, 1.18, -2.52),
  },
  {
    position: new THREE.Vector3(-0.84, 1.38, -1.76),
    lookAt: new THREE.Vector3(0.72, 1.24, -3.1),
  },
]

const VIEWPOINT_COUNT = ROOM_VIEWPOINTS.length
const clampViewpoint = (value: number) => Math.max(0, Math.min(VIEWPOINT_COUNT - 1, value))

function getRoomViewpoint(value: number) {
  return ROOM_VIEWPOINTS[clampViewpoint(value)] ?? ROOM_VIEWPOINTS[0]
}

export default function RoomViewer({ viewpointIndex, onViewpointChange, glbUrl }: RoomViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const viewpointRef = useRef(viewpointIndex)
  const [loadState, setLoadState] = useState<LoadState>('meshLoading')

  const normalizedGlbUrl = glbUrl?.trim()

  useEffect(() => {
    viewpointRef.current = viewpointIndex
  }, [viewpointIndex])

  useEffect(() => {
    if (!mountRef.current) return

    const mount = mountRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#101923')
    scene.fog = new THREE.Fog('#101923', 7, 18)
    scene.add(createViewerLights())

    const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 60)
    camera.position.copy(getRoomViewpoint(viewpointRef.current).position)

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.18
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.xr.enabled = true
    rendererRef.current = renderer
    mount.appendChild(renderer.domElement)

    const navigatorWithXR = navigator as NavigatorWithXR
    void navigatorWithXR.xr
      ?.isSessionSupported('immersive-vr')
      .then((supported) => {
        if (!supported || !mount.isConnected) return
        const vrButton = VRButton.createButton(renderer)
        vrButton.classList.add('native-vr-button')
        mount.appendChild(vrButton)
      })
      .catch(() => undefined)

    if (normalizedGlbUrl) {
      const loader = new GLTFLoader()
      loader.load(
        normalizedGlbUrl,
        (gltf) => {
          if (!mount.isConnected) return
          const model = gltf.scene
          fitModelToScene(model)
          scene.add(model)
          setLoadState('meshReady')
        },
        undefined,
        () => {
          setLoadState('meshError')
        },
      )
    } else {
      queueMicrotask(() => {
        if (mount.isConnected) setLoadState('meshError')
      })
    }

    const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)]
    controllers.forEach((controller) => {
      controller.addEventListener('selectstart', () => onViewpointChange(clampViewpoint(viewpointRef.current + 1)))
      controller.addEventListener('squeezestart', () => onViewpointChange(clampViewpoint(viewpointRef.current - 1)))
      scene.add(controller)
    })

    const resize = () => {
      const width = mount.clientWidth || 960
      const height = mount.clientHeight || 540
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)
    resize()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        onViewpointChange(clampViewpoint(viewpointRef.current + 1))
      }
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        onViewpointChange(clampViewpoint(viewpointRef.current - 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    const targetPosition = new THREE.Vector3()
    const targetLookAt = getRoomViewpoint(viewpointRef.current).lookAt.clone()
    const animate = () => {
      const viewpoint = getRoomViewpoint(viewpointRef.current)
      targetPosition.copy(viewpoint.position)
      targetLookAt.lerp(viewpoint.lookAt, 0.1)
      camera.position.lerp(targetPosition, 0.08)
      camera.lookAt(targetLookAt)
      renderer.render(scene, camera)
    }

    renderer.setAnimationLoop(animate)

    return () => {
      renderer.setAnimationLoop(null)
      window.removeEventListener('keydown', handleKeyDown)
      resizeObserver.disconnect()
      renderer.dispose()
      mount.replaceChildren()
      rendererRef.current = null
    }
  }, [normalizedGlbUrl, onViewpointChange])

  const enterFullscreen = () => {
    void mountRef.current?.requestFullscreen?.()
  }

  return (
    <div className="room-viewer" aria-label="VR 매물 공간 뷰어">
      <div className="viewer-mount" ref={mountRef} />

      <div className="viewer-overlay top-left">
        <span className="viewer-chip">{getStateLabel(loadState)}</span>
        <strong>대학가 원룸 샘플 공간</strong>
      </div>

      <div className="viewer-overlay bottom-left">
        <div className="mini-path" aria-hidden="true">
          {ROOM_VIEWPOINTS.map((_, itemIndex) => (
            <span className={itemIndex <= viewpointIndex ? 'active' : ''} key={itemIndex} />
          ))}
        </div>
        <span>
          방 안 투어 {clampViewpoint(viewpointIndex) + 1}/{VIEWPOINT_COUNT}
        </span>
      </div>

      {loadState === 'meshError' && (
        <div className="viewer-error" role="status">
          스캔 모델을 불러오지 못했습니다.
        </div>
      )}

      <button className="fullscreen-button" type="button" onClick={enterFullscreen}>
        전체화면
      </button>
    </div>
  )
}

function getStateLabel(state: LoadState) {
  if (state === 'meshLoading') return '스캔 로딩'
  if (state === 'meshReady') return '실제 스캔'
  return '스캔 확인'
}

function createViewerLights() {
  const group = new THREE.Group()
  const ambient = new THREE.AmbientLight('#ffffff', 2.25)
  const hemi = new THREE.HemisphereLight('#f8fbff', '#3d352f', 1.45)
  const key = new THREE.DirectionalLight('#ffffff', 1.9)
  key.position.set(3.5, 5.5, 4.5)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  const fill = new THREE.DirectionalLight('#f7efe4', 0.5)
  fill.position.set(-3.2, 2.6, 2.8)
  group.add(ambient, hemi, key, fill)
  return group
}

function fitModelToScene(model: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDimension = Math.max(size.x, size.y, size.z) || 1
  const scale = 6.4 / maxDimension

  model.scale.setScalar(scale)
  model.position.set(-center.x * scale, -box.min.y * scale - 0.08, -center.z * scale - 1.2)
  model.rotation.y = Math.PI

  model.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true
      object.receiveShadow = true
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => normalizeScanMaterial(material))
    }
  })
}

function normalizeScanMaterial(material: THREE.Material) {
  material.side = THREE.DoubleSide

  if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
    material.roughness = 0.82
    material.metalness = 0
    material.envMapIntensity = 1.05
    if (!material.map) {
      material.color.set('#d8cec0')
      material.emissive.set('#221a12')
      material.emissiveIntensity = 0.03
    } else {
      material.color.set('#ffffff')
      material.emissive.set('#ffffff')
      material.emissiveIntensity = 0.06
    }
  }

  material.needsUpdate = true
}
