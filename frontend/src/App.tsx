import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  DoorOpen,
  Expand,
  Eye,
  Home,
  MapPin,
  MonitorUp,
  Move3D,
  RotateCcw,
  School,
  TimerReset,
  Video,
  View,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import RoomViewer from './components/RoomViewer'
import './styles.css'

type Step = 'list' | 'detail' | 'viewer' | 'result'
type ViewerMode = 'fallback' | 'mesh' | 'splat'

const DEFAULT_GLB_URL = '/models/room.glb'
const DEFAULT_SPLAT_URL = '/models/room.ply'
const DEFAULT_PHOTO_1 = '/photos/room-wide.jpg'
const DEFAULT_PHOTO_2 = '/photos/room-normal.jpg'

type Listing = {
  id: string
  title: string
  type: string
  location: string
  schoolDistance: string
  deposit: string
  rent: string
  maintenanceFee: string
  options: string[]
  status: string
  previewTone: 'entry' | 'room'
}

const listing: Listing = {
  id: 'room-01',
  title: '샘플 원룸 A',
  type: '대학가 원룸형 공간',
  location: '대학교 정문 인근',
  schoolDistance: '도보 7분',
  deposit: '500만원',
  rent: '월 58만원',
  maintenanceFee: '관리비 7만원',
  options: ['에어컨', '싱크대', '책상 자리', '수납장'],
  status: 'VR 상담 가능',
  previewTone: 'entry',
}

const flowSteps = [
  { label: '사진 확인', icon: Camera },
  { label: 'VR 체험', icon: View },
  { label: '후보 선택', icon: BadgeCheck },
]

const stepMap: Record<string, Step> = {
  list: 'list',
  detail: 'detail',
  viewer: 'viewer',
  result: 'result',
}

function getInitialStep() {
  const params = new URLSearchParams(window.location.search)
  return stepMap[params.get('step') ?? ''] ?? 'list'
}

function getInitialViewerMode() {
  const params = new URLSearchParams(window.location.search)
  const mode = params.get('mode')
  if (mode === 'splat') return 'splat'
  if (mode === 'fallback') return 'fallback'
  return 'mesh'
}

function App() {
  const [step, setStep] = useState<Step>(getInitialStep)
  const [distance, setDistance] = useState(0)
  const [selected, setSelected] = useState(getInitialStep() === 'result')
  const [viewerMode, setViewerMode] = useState<ViewerMode>(getInitialViewerMode)
  const splatUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('splat') ?? import.meta.env.VITE_SPLAT_URL ?? DEFAULT_SPLAT_URL
  }, [])
  const glbUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('glb') ?? import.meta.env.VITE_GLB_URL ?? DEFAULT_GLB_URL
  }, [])
  const photoSources = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return {
      entry: params.get('photo1') ?? import.meta.env.VITE_ROOM_PHOTO_1 ?? DEFAULT_PHOTO_1,
      room: params.get('photo2') ?? import.meta.env.VITE_ROOM_PHOTO_2 ?? DEFAULT_PHOTO_2,
    }
  }, [])

  const selectedLabel = useMemo(() => {
    if (!selected) return '대기'
    return '방문 후보'
  }, [selected])

  const resetDemo = useCallback(() => {
    setDistance(0)
    setSelected(false)
    setViewerMode('mesh')
    setStep('list')
  }, [])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return

      if (event.key === '1') setStep('list')
      if (event.key === '2') setStep('detail')
      if (event.key === '3') setStep('viewer')
      if (event.key === '4') {
        setSelected(true)
        setStep('result')
      }
      if (event.key.toLowerCase() === 'r') resetDemo()
      if (event.key.toLowerCase() === 'm') {
        setViewerMode((value) => {
          if (value === 'mesh') return 'splat'
          if (value === 'splat') return 'fallback'
          return 'mesh'
        })
      }
      if (event.key === 'Enter' && step === 'viewer') {
        setSelected(true)
        setStep('result')
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [resetDemo, step])

  const goDetail = () => setStep('detail')
  const goViewer = () => {
    setStep('viewer')
    setSelected(false)
  }
  const goResult = () => {
    setSelected(true)
    setStep('result')
  }

  return (
    <main className="app-shell">
      <header className="topbar" aria-label="이어집 상단 바">
        <button className="brand-button" type="button" onClick={resetDemo}>
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-word">이어집</span>
        </button>
        <div className="topbar-center">
          <span className="eyebrow">VR 매물 상담 서비스</span>
          <span>사람과 공간을 잇는 가장 빠른 방법</span>
        </div>
        <div className="status-pill">
          <CircleDot size={14} />
          {selectedLabel}
        </div>
      </header>

      {step === 'list' && (
        <section className="stage stage-list" aria-labelledby="list-title">
          <div className="stage-copy">
            <span className="eyebrow">상담 모드</span>
            <h1 id="list-title">직접 가서 보기 전에, 먼저 들어가 봅니다.</h1>
            <p>
              중개사무소 안에서 HMD로 공간감을 확인하고 실제 방문할 매물만 남깁니다.
            </p>
            <div className="metric-row" aria-label="시연 흐름">
              <Metric icon={Camera} label="사진 확인" value="2장" />
              <Metric icon={Move3D} label="이동 체험" value="앞/뒤" />
              <Metric icon={TimerReset} label="시연 시간" value="45초" />
            </div>
          </div>

          <article className="listing-card" aria-label={`${listing.title} 매물 카드`}>
            <ListingPreview src={photoSources.entry} tone={listing.previewTone} />
            <div className="listing-card-body">
              <div className="card-title-row">
                <div>
                  <span className="eyebrow">{listing.status}</span>
                  <h2>{listing.title}</h2>
                </div>
                <span className="type-chip">{listing.type}</span>
              </div>

              <div className="listing-facts">
                <Fact icon={School} label="거리" value={listing.schoolDistance} />
                <Fact icon={Home} label="보증금" value={listing.deposit} />
                <Fact icon={CalendarClock} label="월세" value={listing.rent} />
              </div>

              <button className="primary-button" type="button" onClick={goDetail}>
                <Eye size={18} />
                매물 상세 보기
              </button>
            </div>
          </article>
        </section>
      )}

      {step === 'detail' && (
        <section className="stage stage-detail" aria-labelledby="detail-title">
          <div className="detail-grid">
            <article className="detail-media" aria-label="일반 사진 미리보기">
              <ListingPreview src={photoSources.entry} tone="entry" />
              <ListingPreview src={photoSources.room} tone="room" />
            </article>

            <div className="detail-panel">
              <button className="ghost-button compact" type="button" onClick={() => setStep('list')}>
                <ChevronLeft size={18} />
                상담 목록
              </button>
              <span className="eyebrow">샘플 매물</span>
              <h1 id="detail-title">{listing.title}</h1>
              <p>
                사진으로는 방의 깊이감과 답답함을 판단하기 어렵습니다. VR 상담에서 실제 공간감을 먼저 확인합니다.
              </p>

              <div className="info-table" aria-label="매물 정보">
                <Fact icon={MapPin} label="위치" value={listing.location} />
                <Fact icon={School} label="학교" value={listing.schoolDistance} />
                <Fact icon={Home} label="보증금" value={listing.deposit} />
                <Fact icon={CalendarClock} label="월세" value={listing.rent} />
                <Fact icon={Building2} label="관리비" value={listing.maintenanceFee} />
                <Fact icon={DoorOpen} label="옵션" value={listing.options.join(' · ')} />
              </div>

              <button className="primary-button large" type="button" onClick={goViewer}>
                <span className="button-brand-icon" aria-hidden="true" />
                VR 상담 시작
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 'viewer' && (
        <section className="viewer-stage" aria-labelledby="viewer-title">
          <div className="viewer-header">
            <button className="ghost-button compact" type="button" onClick={() => setStep('detail')}>
              <ChevronLeft size={18} />
              매물 상세
            </button>
            <div>
              <span className="eyebrow">Meta Quest 3 상담 화면</span>
              <h1 id="viewer-title">실제 촬영 공간을 먼저 체험합니다.</h1>
            </div>
            <button
              className="ghost-button compact"
              type="button"
              onClick={() =>
                setViewerMode((value) => {
                  if (value === 'mesh') return 'splat'
                  if (value === 'splat') return 'fallback'
                  return 'mesh'
                })
              }
            >
              <Expand size={18} />
              {viewerMode === 'mesh' ? '3DGS 모드' : viewerMode === 'splat' ? '기본 뷰어' : '스캔 모델'}
            </button>
          </div>

          <RoomViewer
            distance={distance}
            mode={viewerMode}
            onMove={setDistance}
            glbUrl={glbUrl}
            splatUrl={splatUrl}
          />

          <div className="viewer-controls" aria-label="VR 상담 컨트롤">
            <button className="secondary-button" type="button" onClick={() => setDistance((value) => Math.max(0, value - 1))}>
              <ArrowLeft size={18} />
              뒤로 이동
            </button>
            <div className="distance-meter" aria-label="현재 이동 거리">
              <span>공간 진입</span>
              <strong>{distance}단계</strong>
            </div>
            <button className="secondary-button" type="button" onClick={() => setDistance((value) => Math.min(3, value + 1))}>
              앞으로 이동
              <ArrowRight size={18} />
            </button>
            <button className="primary-button select-button" type="button" onClick={goResult}>
              <Check size={18} />
              방문 후보로 선택
            </button>
          </div>
        </section>
      )}

      {step === 'result' && (
        <section className="stage stage-result" aria-labelledby="result-title">
          <div className="result-panel">
            <div className="result-icon">
              <BadgeCheck size={42} />
            </div>
            <span className="eyebrow">VR 상담 완료</span>
            <h1 id="result-title">실제 방문 후보로 선택되었습니다.</h1>
            <p>
              HMD로 공간감을 먼저 본 뒤 가볼 집만 남겼습니다.
            </p>

            <div className="flow-row" aria-label="상담 결과 흐름">
              {flowSteps.map((item, index) => {
                const Icon = item.icon
                return (
                  <div className="flow-item" key={item.label}>
                    <div className="flow-icon">
                      <Icon size={18} />
                    </div>
                    <span>{item.label}</span>
                    {index < flowSteps.length - 1 && <ChevronRight size={18} className="flow-arrow" />}
                  </div>
                )
              })}
            </div>

            <div className="result-actions">
              <button className="ghost-button" type="button" onClick={() => setStep('viewer')}>
                <RotateCcw size={18} />
                다시 보기
              </button>
              <button className="primary-button" type="button" onClick={resetDemo}>
                <MonitorUp size={18} />
                상담 처음으로
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="metric">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="fact">
      <Icon size={17} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ListingPreview({ tone, src }: { tone: 'entry' | 'room'; src?: string }) {
  if (src) {
    return (
      <div className={`listing-preview photo ${tone}`} aria-hidden="true">
        <img alt="" src={src} />
        <div className="photo-overlay">
          <span>일반 사진</span>
          <strong>공간감 확인 전</strong>
        </div>
        <div className="preview-marker">
          <Video size={16} />
        </div>
      </div>
    )
  }

  return (
    <div className={`listing-preview ${tone}`} aria-hidden="true">
      <div className="preview-window" />
      <div className="preview-floor" />
      <div className="preview-bed" />
      <div className="preview-desk" />
      <div className="preview-kitchen" />
      <div className="preview-marker">
        <Video size={16} />
      </div>
    </div>
  )
}

export default App
