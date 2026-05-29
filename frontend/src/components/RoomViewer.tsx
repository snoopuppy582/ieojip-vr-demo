import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js'

type ViewerMode = 'fallback' | 'mesh' | 'splat'
type LoadState = 'fallback' | 'meshLoading' | 'meshReady' | 'meshError' | 'waiting' | 'loading' | 'ready' | 'error'

type RoomViewerProps = {
  distance: number
  mode: ViewerMode
  onMove: (distance: number) => void
  glbUrl?: string
  splatUrl?: string
}

type SplatViewer = {
  addSplatScene: (url: string, options?: Record<string, unknown>) => Promise<void>
  start: () => void
  stop?: () => void
  dispose?: () => void
}

type SplatModule = {
  Viewer: new (options: Record<string, unknown>) => SplatViewer
  WebXRMode?: {
    None?: unknown
    VR?: unknown
  }
}

type NavigatorWithXR = Navigator & {
  xr?: {
    isSessionSupported: (mode: 'immersive-vr') => Promise<boolean>
  }
}

const clampDistance = (value: number) => Math.max(0, Math.min(3, value))

export default function RoomViewer({ distance, mode, onMove, glbUrl, splatUrl }: RoomViewerProps) {
  const fallbackMountRef = useRef<HTMLDivElement | null>(null)
  const splatMountRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const distanceRef = useRef(distance)
  const [loadState, setLoadState] = useState<LoadState>('fallback')

  const normalizedGlbUrl = glbUrl?.trim()
  const normalizedSplatUrl = splatUrl?.trim()
  const canLoadSplat = mode === 'splat' && Boolean(normalizedSplatUrl)
  const showSplat = canLoadSplat && loadState !== 'error'
  const showFallback = !showSplat

  useEffect(() => {
    distanceRef.current = distance
  }, [distance])

  useEffect(() => {
    if (!canLoadSplat || !normalizedSplatUrl || !splatMountRef.current) {
      setLoadState(mode === 'splat' ? 'waiting' : 'fallback')
      return
    }

    let viewer: SplatViewer | undefined
    let cancelled = false
    const mount = splatMountRef.current
    const splatSceneUrl = normalizedSplatUrl
    setLoadState('loading')
    mount.replaceChildren()

    async function loadSplatScene() {
      try {
        const module = (await import('@mkkellogg/gaussian-splats-3d')) as SplatModule
        if (cancelled) return

        viewer = new module.Viewer({
          rootElement: mount,
          cameraUp: [0, 1, 0],
          initialCameraPosition: [0, 1.45, 4.4],
          initialCameraLookAt: [0, 1.25, 0],
          webXRMode: module.WebXRMode?.None,
          sharedMemoryForWorkers: false,
        })

        await viewer.addSplatScene(splatSceneUrl, {
          progressiveLoad: true,
          showLoadingUI: false,
        })

        if (cancelled) return
        viewer.start()
        setLoadState('ready')
      } catch {
        if (!cancelled) setLoadState('error')
      }
    }

    void loadSplatScene()

    return () => {
      cancelled = true
      viewer?.stop?.()
      viewer?.dispose?.()
      mount.replaceChildren()
    }
  }, [canLoadSplat, mode, normalizedSplatUrl])

  useEffect(() => {
    if (!showFallback || !fallbackMountRef.current) return

    const mount = fallbackMountRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#101923')
    scene.fog = new THREE.Fog('#101923', 7, 18)
    scene.add(createViewerLights())

    const camera = new THREE.PerspectiveCamera(54, 1, 0.05, 60)
    camera.position.set(0, 1.55, 5.2)

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.outputColorSpace = THREE.SRGBColorSpace
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

    const room = createRoomScene()
    let activeRoot = room

    if (mode === 'mesh' && normalizedGlbUrl) {
      const loader = new GLTFLoader()
      loader.load(
        normalizedGlbUrl,
        (gltf) => {
          if (!mount.isConnected) return
          const model = gltf.scene
          fitModelToScene(model)
          scene.add(model)
          activeRoot = model
          setLoadState('meshReady')
        },
        undefined,
        () => {
          scene.add(room)
          activeRoot = room
          setLoadState('meshError')
        },
      )
    } else {
      scene.add(room)
    }

    const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)]
    controllers.forEach((controller) => {
      controller.addEventListener('selectstart', () => onMove(clampDistance(distanceRef.current + 1)))
      controller.addEventListener('squeezestart', () => onMove(clampDistance(distanceRef.current - 1)))
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
        onMove(clampDistance(distanceRef.current + 1))
      }
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        onMove(clampDistance(distanceRef.current - 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    const target = new THREE.Vector3()
    const lookAt = new THREE.Vector3(0, 1.18, -1.4)
    const animate = () => {
      const progress = distanceRef.current
      target.set(0, 1.5, 5.2 - progress * 1.18)
      camera.position.lerp(target, 0.08)
      camera.lookAt(lookAt)
      if (activeRoot.userData.pointer) {
        activeRoot.userData.pointer.rotation.y += 0.012
      }
      if (activeRoot.userData.marker?.material) {
        activeRoot.userData.marker.material.opacity = 0.45 + Math.sin(Date.now() * 0.004) * 0.18
      }
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
  }, [mode, normalizedGlbUrl, showFallback, onMove])

  const enterFullscreen = () => {
    const mount = fallbackMountRef.current ?? splatMountRef.current
    void mount?.requestFullscreen?.()
  }

  return (
    <div className="room-viewer" aria-label="VR 매물 공간 뷰어">
      <div className={`viewer-mount fallback-mount ${showFallback ? 'visible' : 'hidden'}`} ref={fallbackMountRef} />
      <div className={`viewer-mount splat-mount ${showSplat ? 'visible' : 'hidden'}`} ref={splatMountRef} />

      <div className="viewer-overlay top-left">
        <span className="viewer-chip">{getStateLabel(loadState, mode)}</span>
        <strong>대학가 원룸 샘플 공간</strong>
      </div>

      <div className="viewer-overlay bottom-left">
        <div className="mini-path" aria-hidden="true">
          {[0, 1, 2, 3].map((item) => (
            <span className={item <= distance ? 'active' : ''} key={item} />
          ))}
        </div>
        <span>앞뒤 이동으로 현관에서 방 안쪽까지 확인</span>
      </div>

      <button className="fullscreen-button" type="button" onClick={enterFullscreen}>
        전체화면
      </button>
    </div>
  )
}

function getStateLabel(state: LoadState, mode: ViewerMode) {
  if (mode === 'fallback') return '프로토타입'
  if (mode === 'mesh' && state === 'meshLoading') return '스캔 로딩'
  if (mode === 'mesh' && state === 'meshReady') return '실제 스캔'
  if (mode === 'mesh') return '스캔 대체'
  if (state === 'loading') return '3DGS 로딩'
  if (state === 'ready') return '3DGS 연결'
  if (state === 'error') return '대체 화면'
  return '3DGS 대기'
}

function createViewerLights() {
  const group = new THREE.Group()
  const ambient = new THREE.AmbientLight('#ffffff', 2.4)
  const hemi = new THREE.HemisphereLight('#f5f8ff', '#2b2b2b', 1.6)
  const key = new THREE.DirectionalLight('#ffffff', 2.2)
  key.position.set(3.5, 5.5, 4.5)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  group.add(ambient, hemi, key)
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
    if (!material.map) {
      material.color.set('#d8cec0')
    } else {
      material.color.set('#ffffff')
    }
  }

  material.needsUpdate = true
}

function createRoomScene() {
  const group = new THREE.Group()

  const hemiLight = new THREE.HemisphereLight('#edf5ff', '#1a2430', 1.6)
  group.add(hemiLight)

  const keyLight = new THREE.DirectionalLight('#ffffff', 1.5)
  keyLight.position.set(2.8, 5.2, 3.6)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(1024, 1024)
  group.add(keyLight)

  const floor = createBox(4.4, 0.08, 6.4, '#d8d1c3', [0, -0.04, -0.3])
  floor.receiveShadow = true
  group.add(floor)

  const backWall = createBox(4.4, 2.6, 0.08, '#eaf0f4', [0, 1.3, -3.5])
  const leftWall = createBox(0.08, 2.6, 6.4, '#dfe8ee', [-2.2, 1.3, -0.3])
  const rightWall = createBox(0.08, 2.6, 6.4, '#f2f5f7', [2.2, 1.3, -0.3])
  group.add(backWall, leftWall, rightWall)

  const ceilingBeam = createBox(4.4, 0.16, 0.16, '#cfd9e0', [0, 2.48, -1.0])
  group.add(ceilingBeam)

  const windowFrame = createBox(1.42, 1.0, 0.1, '#162235', [0.88, 1.55, -3.43])
  const windowGlass = createBox(1.22, 0.78, 0.08, '#9bc3dd', [0.88, 1.55, -3.36])
  const windowGlow = new THREE.PointLight('#7db6ff', 1.8, 5)
  windowGlow.position.set(0.88, 1.65, -3.05)
  group.add(windowFrame, windowGlass, windowGlow)

  const bed = createBox(1.55, 0.38, 2.02, '#8294a8', [-1.18, 0.2, -2.08])
  const bedTop = createBox(1.43, 0.12, 1.72, '#f7f8f8', [-1.18, 0.46, -2.0])
  const pillow = createBox(1.16, 0.12, 0.42, '#dce8f5', [-1.18, 0.58, -2.7])
  group.add(bed, bedTop, pillow)

  const desk = createBox(1.18, 0.11, 0.62, '#b98761', [1.34, 0.76, -1.46])
  const deskLegA = createBox(0.08, 0.7, 0.08, '#6e4b33', [0.86, 0.36, -1.2])
  const deskLegB = createBox(0.08, 0.7, 0.08, '#6e4b33', [1.84, 0.36, -1.2])
  const chair = createBox(0.46, 0.1, 0.46, '#3a6bce', [1.32, 0.43, -0.82])
  const monitor = createBox(0.52, 0.34, 0.05, '#111827', [1.33, 1.08, -1.62])
  group.add(desk, deskLegA, deskLegB, chair, monitor)

  const kitchen = createBox(1.1, 0.9, 0.52, '#edf1f4', [-1.45, 0.45, 1.78])
  const fridge = createBox(0.58, 1.48, 0.58, '#f7fbff', [-1.64, 0.74, 0.95])
  const entryDoor = createBox(0.78, 2.02, 0.07, '#8b5e3c', [1.35, 1.01, 2.92])
  group.add(kitchen, fridge, entryDoor)

  const routeMaterial = new THREE.LineBasicMaterial({ color: '#3a6bce', linewidth: 2 })
  const routePoints = [
    new THREE.Vector3(0, 0.04, 2.55),
    new THREE.Vector3(0, 0.04, 1.2),
    new THREE.Vector3(0, 0.04, -0.2),
    new THREE.Vector3(0.38, 0.04, -1.3),
  ]
  const route = new THREE.Line(new THREE.BufferGeometry().setFromPoints(routePoints), routeMaterial)
  group.add(route)

  const markerMaterial = new THREE.MeshBasicMaterial({
    color: '#3a6bce',
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  })
  const marker = new THREE.Mesh(new THREE.CircleGeometry(0.38, 48), markerMaterial)
  marker.rotation.x = -Math.PI / 2
  marker.position.set(0, 0.055, -0.4)
  group.add(marker)

  const pointer = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.01, 8, 60),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 }),
  )
  pointer.rotation.x = Math.PI / 2
  pointer.position.copy(marker.position)
  group.add(pointer)

  group.traverse((object: THREE.Object3D) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true
      object.receiveShadow = true
    }
  })

  group.userData.pointer = pointer
  group.userData.marker = marker

  return group
}

function createBox(width: number, height: number, depth: number, color: string, position: [number, number, number]) {
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.04,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(...position)
  return mesh
}
