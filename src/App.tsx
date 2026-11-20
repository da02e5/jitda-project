import { useEffect, useState } from 'react'
import {
  ArrowDownToLine, ArrowRight, Check, ChevronDown, CloudDrizzle, CloudSun,
  Compass, MapPin, Plus, RotateCcw, Settings2, Shirt, SlidersHorizontal, Sparkles,
  Sun, Thermometer, Trash2, X,
} from 'lucide-react'
import {
  matchReferenceGarments, mergeDemoClosetItems, outingRecommendationRules, recommendForOuting, selectOutingForecast,
  type Category, type ClosetItem, type HourlyForecast, type ReferenceGarment, type WeatherTag, type WarmthLevel,
} from './lib/recommendation'
import { domesticCities, fetchHourlyForecast, fetchTodayWeather, makeDemoForecast, type DemoWeatherScenario, type TodayWeather } from './lib/weather'
import { deleteReferenceImage, loadReferenceImage, saveReferenceImage } from './lib/imageStore'
import { getSampleImage, type SampleImage } from './lib/sampleImages'

type Section = 'today' | 'closet' | 'looks'
type ReferenceLook = { id: string; title: string; imageKey: string; garments: ReferenceGarment[]; createdAt: string }
type OutingPreferences = { city: string; date: string; departure: string; returnTime: string; purpose: OutingPurpose }
type SavedData = { closet: ClosetItem[]; skippedIntro: boolean; demoCloset: boolean; references?: ReferenceLook[]; outing?: OutingPreferences }
type OutingPurpose = '일상' | '데이트' | '여행' | '야외 활동'
type WeatherTestMode = '실제 예보' | DemoWeatherScenario
type OutingResult = { hourly: HourlyForecast[]; source: 'live' | 'demo'; scenario?: DemoWeatherScenario; locationLabel: string; plan: OutingPreferences }

const STORAGE_KEY = 'my-closet-mvp-v1'
const categories: Category[] = ['상의', '하의', '아우터', '신발', '기타']
const colors = ['블랙', '화이트', '그레이', '베이지', '브라운', '네이비', '블루', '그린', '카키', '레드', '핑크', '옐로우', '퍼플', '오렌지', '기타']
const styles = ['미니멀', '캐주얼', '클래식', '스트릿', '로맨틱', '스포티', '빈티지', '베이직']
const weatherModes: WeatherTestMode[] = ['실제 예보', '따뜻한 날', '귀가 때 기온 하락', '비 예보', '보온 정보 부족', '적합한 옷 없음', 'API 조회 실패']

function localDateString(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function maxForecastDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 14)
  return localDateString(date)
}

function defaultDepartureTime(): string {
  const now = new Date()
  const nextHour = Math.min(23, now.getHours() + 1)
  return `${String(nextHour).padStart(2, '0')}:00`
}

function addCalendarDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return localDateString(value)
}

const sampleItems: ClosetItem[] = [
  { id: 'sample-shirt', name: '코튼 셔츠', category: '상의', color: '화이트', style: '미니멀', warmth: '얇음', weatherTags: [] },
  { id: 'sample-stripe', name: '스트라이프 티셔츠', category: '상의', color: '네이비', style: '캐주얼', warmth: '얇음', weatherTags: [] },
  { id: 'sample-knit', name: '크림 니트', category: '상의', color: '베이지', style: '클래식', warmth: '보통', weatherTags: ['보온'] },
  { id: 'sample-sweat', name: '후드 스웨트셔츠', category: '상의', color: '그레이', style: '캐주얼', warmth: '보통', weatherTags: ['보온'] },
  { id: 'sample-black-pants', name: '스트레이트 팬츠', category: '하의', color: '블랙', style: '미니멀', warmth: '보통', weatherTags: [] },
  { id: 'sample-denim', name: '데님 팬츠', category: '하의', color: '블루', style: '캐주얼', weatherTags: [] },
  { id: 'sample-wide', name: '와이드 팬츠', category: '하의', color: '베이지', style: '클래식', weatherTags: [] },
  { id: 'sample-cotton', name: '코튼 팬츠', category: '하의', color: '네이비', style: '캐주얼', weatherTags: [] },
  { id: 'sample-jacket', name: '싱글 재킷', category: '아우터', color: '브라운', style: '클래식', warmth: '따뜻함', weatherTags: ['보온'] },
  { id: 'sample-cardigan', name: '가디건', category: '아우터', color: '그레이', style: '클래식', warmth: '보통', weatherTags: ['보온'] },
  { id: 'sample-trench', name: '트렌치 코트', category: '아우터', color: '베이지', style: '클래식', warmth: '얇음', weatherTags: ['방수'] },
  { id: 'sample-loafers', name: '로퍼', category: '신발', color: '블랙', style: '클래식', weatherTags: [] },
  { id: 'sample-sneakers', name: '캔버스 스니커즈', category: '신발', color: '화이트', style: '캐주얼', weatherTags: [] },
  { id: 'sample-suede', name: '스웨이드 슈즈', category: '신발', color: '브라운', style: '클래식', weatherTags: [] },
  { id: 'sample-boots', name: '레인 부츠', category: '신발', color: '블랙', style: '캐주얼', weatherTags: ['방수'] },
  { id: 'sample-scarf', name: '울 목도리', category: '기타', customCategory: '목도리', color: '브라운', style: '클래식', warmth: '따뜻함', weatherTags: ['방한', '보온'] },
  { id: 'sample-gloves', name: '니트 장갑', category: '기타', customCategory: '장갑', color: '그레이', style: '캐주얼', warmth: '보통', weatherTags: ['방한'] },
  { id: 'sample-umbrella', name: '접이식 우산', category: '기타', customCategory: '우산', color: '블랙', style: '베이직', weatherTags: ['우산'] },
]
const previousCatalogImageUrls = new Set([
  'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=640&q=80',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=640&q=80',
  'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=640&q=80',
  'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=640&q=80',
  'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=640&q=80',
  'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=640&q=80',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=640&q=80',
])

function readSaved(): SavedData {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<SavedData> | null
    if (parsed && Array.isArray(parsed.closet)) return {
      ...parsed,
      closet: parsed.closet,
      skippedIntro: Boolean(parsed.skippedIntro),
      demoCloset: Boolean(parsed.demoCloset),
      references: Array.isArray(parsed.references) ? parsed.references : [],
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
  return { closet: [], skippedIntro: false, demoCloset: false, references: [] }
}

function closetImage(item: ClosetItem): string | undefined {
  if (previousCatalogImageUrls.has(item.imageUrl ?? '')) return undefined
  return item.imageUrl
}

function displayProductSprite(item: ClosetItem): SampleImage | undefined {
  if (!item.id.startsWith('demo-') && !sampleItems.some((sample) => sample.id === item.id)) return undefined
  return getSampleImage(item.id)
}

function shortKoreanDate(value: string): string {
  const [, month, day] = value.split('-')
  return `${Number(month)}월 ${Number(day)}일`
}

function shortKoreanTime(value: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(value)
  return match ? `${match[1]}:${match[2]}` : value
}

function ItemArt({ category, color, compact = false, photoUrl, sprite, itemLabel = '' }: { category: Category; color: string; compact?: boolean; photoUrl?: string; sprite?: SampleImage; itemLabel?: string }) {
  const palette: Record<string, string> = {
    블랙: '#292b2a', 화이트: '#f8f6ef', 그레이: '#989894', 베이지: '#c8b99e', 브라운: '#755746',
    네이비: '#384658', 블루: '#66839a', 그린: '#68786a', 카키: '#82826e', 레드: '#a95349',
    핑크: '#c9989a', 옐로우: '#d6b65e', 퍼플: '#88778c', 오렌지: '#ce895e', 기타: '#aaa49a',
    오프화이트: '#f1eee5', 차콜: '#4c4c4a', 토프: '#a89580', 크림: '#eee8d8', 샌드: '#cfbea2',
  }
  const fill = palette[color] ?? '#b9afa0'
  const light = ['화이트', '베이지', '옐로우', '핑크'].includes(color)
  const scarf = category === '기타' && (itemLabel.includes('목도리') || itemLabel.includes('스카프'))
  const umbrella = category === '기타' && itemLabel.includes('우산')
  const gloves = category === '기타' && itemLabel.includes('장갑')
  const hasAccessoryShape = scarf || umbrella || gloves
  return (
    <div className={`item-art ${compact ? 'item-art-compact' : ''} ${photoUrl ? 'has-photo' : ''} ${!photoUrl && sprite ? 'has-product-sprite' : ''}`} aria-hidden="true">
      {photoUrl && <img className="clothing-photo" src={photoUrl} alt="" loading="lazy" onError={(event) => event.currentTarget.parentElement?.classList.add('photo-failed')} />}
      {!photoUrl && sprite && <span className={`product-sprite ${sprite.mode}`} style={{ backgroundImage: `url(${sprite.src})`, ...(sprite.position ? { backgroundPosition: sprite.position } : {}) }} />}
      {!photoUrl && sprite && <img className="sprite-error-monitor" src={sprite.src} alt="" aria-hidden="true" onError={(event) => event.currentTarget.parentElement?.classList.add('product-failed')} />}
      <svg className={!photoUrl && sprite ? 'product-placeholder' : ''} viewBox="0 0 160 160" role="presentation">
        <ellipse cx="80" cy="143" rx="45" ry="5" fill="#443b31" opacity=".12" />
        {category === '하의' ? <path d="M48 31h64l-7 39-3 57H79l-4-47-6 47H48l2-57z" fill={fill} stroke="#4a4038" strokeOpacity=".22" strokeWidth="2" /> : null}
        {category === '신발' ? <><path d="M33 91c16-2 25-12 31-30l19 4c7 17 17 24 42 29 9 2 13 8 12 17H35c-8 0-11-13-2-20z" fill={fill} stroke="#4a4038" strokeOpacity=".25" strokeWidth="2" /><path d="M36 109h99" stroke="#f4f1eb" strokeWidth="5" strokeLinecap="round" opacity=".7" /></> : null}
        {category === '아우터' ? <path d="m55 28 25 10 25-10 20 19-13 20-9-7v67H57V60l-9 7-13-20z" fill={fill} stroke="#4a4038" strokeOpacity=".22" strokeWidth="2" /> : null}
        {(category === '상의' || (category === '기타' && !hasAccessoryShape)) ? <path d="m55 28 25 10 25-10 22 22-14 15-10-9v71H57V56l-10 9-14-15z" fill={fill} stroke="#4a4038" strokeOpacity=".22" strokeWidth="2" /> : null}
        {scarf && <g fill="none" stroke={fill} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"><path d="M59 36c0 20 38 18 38 39v46H73V83"/><path d="M69 120v10m10-10v11m10-11v10m10-10v9" strokeWidth="2"/></g>}
        {gloves && <g fill={fill} stroke="#4a4038" strokeOpacity=".24" strokeWidth="2"><path d="M44 119V67c0-7 10-7 10 0V48c0-7 10-7 10 0V38c0-7 10-7 10 0v12c2-7 12-5 11 2l-4 24 12-12c7-7 14 1 9 7l-17 25v23z"/><path d="M44 119V67c0-7 10-7 10 0V48c0-7 10-7 10 0V38c0-7 10-7 10 0v12c2-7 12-5 11 2l-4 24 12-12c7-7 14 1 9 7l-17 25v23z" transform="translate(34 0) scale(.82 1)"/></g>}
        {umbrella && <g fill="none" stroke={fill} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"><path d="M80 35c-30 0-50 20-55 45 10-7 20-7 28 0 9-7 18-7 27 0 9-7 18-7 27 0 8-7 18-7 28 0-5-25-25-45-55-45z" fill={fill} strokeWidth="2"/><path d="M80 35v75c0 18 24 17 24 3"/></g>}
        {(category === '상의' || category === '아우터' || category === '하의') && light ? <path d="M80 39v76" stroke="#918a7e" strokeOpacity=".25" strokeWidth="2" /> : null}
      </svg>
    </div>
  )
}

function App() {
  const [saved, setSaved] = useState<SavedData>(readSaved)
  const [section, setSection] = useState<Section>('today')
  const [categoryFilter, setCategoryFilter] = useState<Category | '전체'>('전체')
  const [showAdd, setShowAdd] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [outDate, setOutDate] = useState(() => {
    const today = localDateString(new Date())
    const stored = saved.outing?.date
    return stored && stored >= today && stored <= maxForecastDate() ? stored : today
  })
  const [departure, setDeparture] = useState(() => saved.outing?.departure || defaultDepartureTime())
  const [returnTime, setReturnTime] = useState(() => saved.outing?.returnTime || '20:00')
  const [purpose, setPurpose] = useState<OutingPurpose>(() => saved.outing?.purpose || '일상')
  const [cityName, setCityName] = useState(() => domesticCities.some((city) => city.name === saved.outing?.city) ? saved.outing!.city : '서울')
  const [weatherTestMode, setWeatherTestMode] = useState<WeatherTestMode>('실제 예보')
  const [locationOverride, setLocationOverride] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationConsent, setLocationConsent] = useState(false)
  const [outingResult, setOutingResult] = useState<OutingResult | null>(null)
  const [outingError, setOutingError] = useState('')
  const [outingBusy, setOutingBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [customName, setCustomName] = useState('')
  const [customCategory, setCustomCategory] = useState<Category>('상의')
  const [customDetail, setCustomDetail] = useState('')
  const [customColor, setCustomColor] = useState('화이트')
  const [customStyle, setCustomStyle] = useState('미니멀')
  const [customWeather, setCustomWeather] = useState<WeatherTag[]>([])
  const [customWarmth, setCustomWarmth] = useState<WarmthLevel>('미설정')
  const [todayWeather, setTodayWeather] = useState<TodayWeather | null>(null)
  const [todayWeatherCity, setTodayWeatherCity] = useState('')
  const [todayWeatherError, setTodayWeatherError] = useState(false)
  const [referenceTitle, setReferenceTitle] = useState('')
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [referencePreview, setReferencePreview] = useState('')
  const [referenceGarments, setReferenceGarments] = useState<ReferenceGarment[]>([])
  const [referenceError, setReferenceError] = useState('')
  const [referenceBusy, setReferenceBusy] = useState(false)
  const [pendingGarmentCategory, setPendingGarmentCategory] = useState<Category>('상의')
  const [pendingGarmentColor, setPendingGarmentColor] = useState('화이트')
  const [pendingGarmentStyle, setPendingGarmentStyle] = useState('미니멀')
  const [referenceImageUrls, setReferenceImageUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  }, [saved])

  useEffect(() => {
    setSaved((current) => ({
      ...current,
      outing: { city: cityName, date: outDate, departure, returnTime, purpose },
    }))
  }, [cityName, outDate, departure, returnTime, purpose])

  useEffect(() => {
    let cancelled = false
    setTodayWeather(null)
    setTodayWeatherError(false)
    const city = domesticCities.find((entry) => entry.name === cityName)
    if (!city) return () => { cancelled = true }
    fetchTodayWeather(city.latitude, city.longitude).then((snapshot) => {
      if (cancelled) return
      setTodayWeather(snapshot)
      setTodayWeatherCity(city.name)
    }).catch(() => {
      if (!cancelled) setTodayWeatherError(true)
    })
    return () => { cancelled = true }
  }, [cityName])

  useEffect(() => {
    let cancelled = false
    const urls: string[] = []
    Promise.all((saved.references ?? []).map(async (reference) => {
      try {
        const blob = await loadReferenceImage(reference.imageKey)
        if (blob) {
          const url = URL.createObjectURL(blob)
          urls.push(url)
          return [reference.id, url] as const
        }
      } catch {
        return [reference.id, ''] as const
      }
      return [reference.id, ''] as const
    })).then((entries) => {
      if (!cancelled) setReferenceImageUrls(Object.fromEntries(entries.filter(([, url]) => url)))
      else urls.forEach(URL.revokeObjectURL)
    })
    return () => {
      cancelled = true
      urls.forEach(URL.revokeObjectURL)
    }
  }, [saved.references])

  useEffect(() => {
    if (!referenceFile) {
      setReferencePreview('')
      return
    }
    const url = URL.createObjectURL(referenceFile)
    setReferencePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [referenceFile])

  const filteredCloset = saved.closet.filter((item) => categoryFilter === '전체' || item.category === categoryFilter)

  function addItem(item: ClosetItem) {
    setSaved((current) => ({ ...current, closet: [...current.closet.filter((entry) => entry.id !== item.id), item], skippedIntro: true }))
  }

  function removeItem(id: string) {
    setSaved((current) => {
      const closet = current.closet.filter((item) => item.id !== id)
      return { ...current, closet, demoCloset: current.demoCloset && closet.some((item) => item.id.startsWith('demo-')) }
    })
  }

  function enterSampleCloset() {
    setSaved((current) => {
      const closet = mergeDemoClosetItems(current.closet, sampleItems)
      const addedSamples = closet.length > current.closet.length
      return {
        ...current,
        closet,
        demoCloset: current.demoCloset || addedSamples,
        skippedIntro: true,
      }
    })
  }

  function clearSampleCloset() {
    setSaved((current) => ({
      ...current,
      closet: current.closet.filter((item) => !item.id.startsWith('demo-')),
      demoCloset: false,
    }))
  }

  function handleReferenceFile(file?: File) {
    setReferenceError('')
    if (!file) return
    const supported = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    if (!supported) {
      setReferenceError('PNG, JPG, WEBP 이미지 파일만 업로드할 수 있어요.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setReferenceError('이미지는 10MB 이하로 선택해 주세요.')
      return
    }
    setReferenceFile(file)
    if (!referenceTitle.trim()) setReferenceTitle(file.name.replace(/\.[^.]+$/, '').slice(0, 50))
  }

  function addReferenceGarment() {
    setReferenceGarments((current) => [...current, {
      id: `piece-${Date.now()}-${current.length}`,
      category: pendingGarmentCategory,
      color: pendingGarmentColor,
      style: pendingGarmentStyle,
    }])
  }

  async function saveReferenceLook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!referenceFile) {
      setReferenceError('먼저 참고 코디 이미지를 선택해 주세요.')
      return
    }
    const id = `reference-${Date.now()}`
    const imageKey = id
    setReferenceBusy(true)
    setReferenceError('')
    try {
      await saveReferenceImage(imageKey, referenceFile)
      const reference: ReferenceLook = {
        id,
        title: referenceTitle.trim() || '내 참고 코디',
        imageKey,
        garments: referenceGarments,
        createdAt: new Date().toISOString(),
      }
      setSaved((current) => ({ ...current, references: [...(current.references ?? []), reference] }))
      setReferenceTitle('')
      setReferenceFile(null)
      setReferenceGarments([])
    } catch (error) {
      setReferenceError(error instanceof Error ? error.message : '참고 이미지를 저장하지 못했어요.')
    } finally {
      setReferenceBusy(false)
    }
  }

  async function removeReferenceLook(reference: ReferenceLook) {
    try {
      await deleteReferenceImage(reference.imageKey)
    } catch {
      setReferenceError('이미지 파일 삭제에 실패했어요. 설정에서 저장 공간을 확인해 주세요.')
      return
    }
    setSaved((current) => ({ ...current, references: (current.references ?? []).filter((item) => item.id !== reference.id) }))
  }

  function chooseWeather() {
    setSection('today')
    void submitOuting()
  }

  function allowLocation() {
    if (!navigator.geolocation) {
      setLocationConsent(false)
      setOutingError('이 브라우저에서는 위치 기능을 사용할 수 없어요. 선택한 도시의 날씨를 조회할 수 있습니다.')
      return
    }
    navigator.geolocation.getCurrentPosition((position) => {
      setLocationOverride({ latitude: position.coords.latitude, longitude: position.coords.longitude })
      setLocationConsent(false)
      setOutingError('')
    }, (error) => {
      setLocationConsent(false)
      setOutingError(error.code === error.PERMISSION_DENIED
        ? '위치 권한이 허용되지 않았어요. 직접 고른 외출 지역으로 계속할 수 있습니다.'
        : '현재 위치를 확인하지 못했어요. 직접 고른 외출 지역으로 계속할 수 있습니다.')
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 })
  }

  async function submitOuting(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setOutingError('')
    setFormError('')
    setOutingResult(null)
    const overnight = returnTime <= departure
    const returnDate = overnight ? addCalendarDays(outDate, 1) : outDate
    if (returnDate > maxForecastDate()) {
      setOutingError('귀가 날짜가 날씨 예보 제공 범위를 벗어나요. 하루 앞당겨 선택해 주세요.')
      return
    }
    if (weatherTestMode === '실제 예보' && outDate === localDateString(new Date())) {
      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      if (departure < currentTime) {
        setOutingError('오늘의 실제 예보는 현재 시각 이후 출발부터 조회할 수 있어요.')
        return
      }
    }
    const selectedCity = domesticCities.find((city) => city.name === cityName)
    if (!selectedCity) {
      setOutingError('외출 지역을 선택해 주세요.')
      return
    }
    setOutingBusy(true)
    try {
      const isDemo = weatherTestMode !== '실제 예보'
      const allHours = isDemo
        ? makeDemoForecast(outDate, weatherTestMode as DemoWeatherScenario, overnight ? 48 : 24)
        : await Promise.all([outDate, ...(overnight ? [returnDate] : [])].map((date) =>
          fetchHourlyForecast(
            locationOverride?.latitude ?? selectedCity.latitude,
            locationOverride?.longitude ?? selectedCity.longitude,
            date,
          ),
        )).then((days) => days.flat())
      const hourly = selectOutingForecast(allHours, departure, returnTime, outDate)
      if (!hourly.length) throw new Error('선택한 외출 시간의 시간별 예보가 충분하지 않습니다.')
      setOutingResult({
        hourly,
        source: isDemo ? 'demo' : 'live',
        ...(isDemo ? { scenario: weatherTestMode as DemoWeatherScenario } : {}),
        locationLabel: locationOverride ? '현재 위치 주변' : selectedCity.name,
        plan: { city: cityName, date: outDate, departure, returnTime, purpose },
      })
    } catch (error) {
      setOutingError(weatherTestMode === 'API 조회 실패'
        ? '시연용 API 실패 상태입니다. 날씨 기반 판단은 할 수 없으며, 옷장 기능은 계속 사용할 수 있어요.'
        : error instanceof Error ? `${error.message} 날씨 기반 판단은 할 수 없으며, 내 옷장은 계속 사용할 수 있어요.` : '날씨 정보를 확인하지 못했어요. 내 옷장은 계속 사용할 수 있어요.')
    } finally {
      setOutingBusy(false)
    }
  }

  function submitCustomItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!customName.trim()) {
      setFormError('옷 이름을 입력해 주세요.')
      return
    }
    if (customCategory === '기타' && !customDetail.trim()) {
      setFormError('기타 옷의 분류를 입력해 주세요.')
      return
    }
    addItem({
      id: `custom-${Date.now()}`, name: customName.trim(), category: customCategory,
      color: customColor, style: customStyle, weatherTags: customWeather, warmth: customWarmth,
      ...(customCategory === '기타' ? { customCategory: customDetail.trim() } : {}),
    })
    setCustomName('')
    setCustomDetail('')
    setCustomWeather([])
    setCustomWarmth('미설정')
    setFormError('')
    setShowAdd(false)
    setSection('closet')
  }

  function resetData() {
    if (window.confirm('이 브라우저에 저장된 옷장 정보와 설정을 모두 초기화할까요? 되돌릴 수 없습니다.')) {
      void Promise.all((saved.references ?? []).map((reference) => deleteReferenceImage(reference.imageKey).catch(() => undefined)))
      setSaved({ closet: [], skippedIntro: false, demoCloset: false, references: [] })
      setCityName('서울')
      setOutDate(localDateString(new Date()))
      setDeparture(defaultDepartureTime())
      setReturnTime('20:00')
      setPurpose('일상')
      setOutingResult(null)
      setOutingError('')
      setLocationOverride(null)
      setShowSettings(false)
    }
  }

  const sectionTitle = section === 'today' ? '오늘 뭐 입지?' : section === 'closet' ? '내 옷장' : '참고 코디'

  return (
    <div className="app-shell min-h-screen bg-[#f7f5f0] text-[#292823]">
      <aside className="sidebar">
        <button className="brand" onClick={() => setSection('today')} aria-label="내 옷장 홈">
          <span className="brand-mark"><Shirt size={19} strokeWidth={1.6} /></span>
          <span><strong>내 옷장</strong><small>내 옷으로 만드는 오늘</small></span>
        </button>
        <div className="side-label">메뉴</div>
        <nav className="side-nav" aria-label="주요 메뉴">
          <button className={section === 'today' ? 'active' : ''} onClick={() => setSection('today')}><Sun size={18} />오늘의 코디</button>
          <button className={section === 'closet' ? 'active' : ''} onClick={() => setSection('closet')}><Shirt size={18} />내 옷장 <span className="nav-count">{saved.closet.length}</span></button>
          <button className={section === 'looks' ? 'active' : ''} onClick={() => setSection('looks')}><Compass size={18} />참고 코디</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><Sparkles size={15} /><span>새 옷을 사기보다<br />이미 가진 옷을 더 잘 입기</span></div>
          <button className="settings-link" onClick={() => setShowSettings(true)}><Settings2 size={17} /> 설정</button>
          <div className="local-note"><span className="green-dot" />이 브라우저에 저장 중</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">내 옷장 <span>/</span> {sectionTitle}</div>
          <div className="top-actions">
            <button className="weather-quick" onClick={chooseWeather}><CloudSun size={17} />추천 시작</button>
            <button className="icon-button settings-mobile" aria-label="설정 열기" onClick={() => setShowSettings(true)}><Settings2 size={19} /></button>
            <span className="guest-label">로그인 없이 시작</span>
          </div>
        </header>

        <div className="content-wrap">
          {section === 'today' && <>
            <section className="today-command">
              <div className="today-command-top"><div><p className="welcome-date">{new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })} · 안녕하세요</p><h1>오늘 뭐 입지?</h1></div><div className={`today-weather-summary ${todayWeather ? 'has-current-weather' : ''}`} aria-live="polite">{todayWeather ? <><div className="weather-card-top"><div className="weather-card-place"><span className="today-weather-icon"><CloudSun size={20} /></span><div><strong>{todayWeatherCity}</strong><span>{shortKoreanDate(todayWeather.date)} · 현재</span></div></div><span className="weather-source-tag">Open-Meteo</span></div><div className="weather-card-reading"><strong>{todayWeather.temperature.toFixed(1)}<small>°</small></strong><div className="weather-card-details"><span>{shortKoreanTime(todayWeather.time)} 기준</span><span>최저 <b>{todayWeather.low.toFixed(1)}°</b><i>·</i> 최고 <b>{todayWeather.high.toFixed(1)}°</b></span></div></div><div className="weather-rain-row"><CloudDrizzle size={15} /><span>{todayWeather.precipitationTime.slice(0, 2)}시 강수확률</span><strong>{todayWeather.precipitationProbability}%</strong></div></> : todayWeatherError ? <div className="today-weather-unavailable"><strong>{cityName} · 오늘</strong><span>날씨 정보를 불러올 수 없어요</span></div> : <div className="today-weather-loading"><span className="spinner" /><span>{cityName} · 날씨 확인 중</span></div>}</div></div>
              <div className="today-command-bottom"><p>내 옷과 외출 시간의 날씨를 살펴볼게요.</p><button className="recommend-primary" onClick={() => void submitOuting()} disabled={outingBusy}>{outingBusy ? <><span className="spinner" /> 코디 고르는 중</> : <><Sparkles size={18} /> 오늘의 코디 추천받기 <ArrowRight size={18} /></>}</button></div>
              <div className="today-secondary"><button onClick={() => setSection('closet')}><Shirt size={15} /> 내 옷장 관리</button><button onClick={() => setSection('looks')}><Compass size={15} /> 참고 이미지 추가</button></div>
            </section>

            {saved.demoCloset && <div className="demo-closet-notice"><Sparkles size={15} /><span>이 옷장에는 체험용 샘플 옷이 포함되어 있어요. 추천 결과에서 샘플과 직접 등록한 옷을 구분합니다.</span><button onClick={saved.closet.some((item) => item.id.startsWith('demo-')) ? clearSampleCloset : () => setSaved((current) => ({ ...current, demoCloset: false }))}>{saved.closet.some((item) => item.id.startsWith('demo-')) ? '샘플 옷 제거' : '안내 닫기'}</button></div>}

            <details className="outing-settings" id="outing-planner">
              <summary><span><MapPin size={15} />{cityName} · {outDate} · {departure}–{returnTime} · {purpose}</span><b>일정 및 지역 변경</b></summary>
              <form className="outing-form" onSubmit={submitOuting}>
                <label className="outing-field destination-field"><span>외출 지역</span><div className="city-control"><MapPin size={16} /><select id="outing-city" value={cityName} onChange={(event) => { setCityName(event.target.value); setLocationOverride(null) }}>{domesticCities.map((city) => <option key={city.name} value={city.name}>{city.name}</option>)}</select></div><button type="button" className="location-button" onClick={() => setLocationConsent((value) => !value)}>{locationOverride ? '현재 위치 사용 중' : '현재 위치 사용 (선택)'}</button></label>
                <label className="outing-field"><span>외출 날짜</span><input id="outing-date" type="date" value={outDate} min={localDateString(new Date())} max={maxForecastDate()} onChange={(event) => setOutDate(event.target.value)} required /></label>
                <label className="outing-field"><span>출발</span><input id="outing-departure" type="time" value={departure} onChange={(event) => setDeparture(event.target.value)} required /></label>
                <label className="outing-field"><span>귀가 예정</span><input id="outing-return" type="time" value={returnTime} onChange={(event) => setReturnTime(event.target.value)} required /></label>
                <label className="outing-field"><span>외출 목적</span><select value={purpose} onChange={(event) => setPurpose(event.target.value as OutingPurpose)}>{(['일상', '데이트', '여행', '야외 활동'] as OutingPurpose[]).map((option) => <option key={option}>{option}</option>)}</select></label>
              </form>
              {locationConsent && <div className="location-consent"><p>현재 위치 좌표를 날씨 조회에 사용해 외부 날씨 서비스에 전달합니다. 좌표는 저장하지 않으며, 선택한 도시로도 조회할 수 있어요.</p><button type="button" className="button-dark" onClick={allowLocation}>위치 허용</button><button type="button" className="button-text" onClick={() => setLocationConsent(false)}>취소</button></div>}
              <p className="planner-privacy">귀가 시간이 출발 시간보다 이르면 다음 날 귀가로 계산합니다. 지역과 일정은 이 브라우저에 저장돼요.</p>
            </details>

            {outingError && <div className="outing-error" role="status"><CloudDrizzle size={17} /><span>{outingError}</span></div>}
            {outingResult && <OutingResultView result={outingResult} closet={saved.closet} demoCloset={saved.demoCloset} onAdd={() => setShowAdd(true)} />}

            <section className="closet-overview">
              <div className="section-heading"><div><p className="eyebrow">내가 가진 옷</p><h2>내 옷장</h2></div><button className="text-link" onClick={() => setSection('closet')}>전체 보기 <ArrowRight size={16} /></button></div>
              {saved.closet.length === 0 ? <div className="empty-closet">
                <div className="empty-art"><Shirt size={36} strokeWidth={1.15} /></div>
                <div className="empty-copy"><h3>옷장이 비어 있어요</h3><p>내 옷을 등록하거나 샘플 옷장으로 추천을 먼저 체험할 수 있어요.</p></div>
                <button className="button-dark" onClick={() => setShowAdd(true)}><Plus size={17} /> 내 옷 등록</button>
                <button className="sample-closet-button" onClick={enterSampleCloset}>샘플 옷장으로 체험하기</button>
              </div> : <div className="mini-closet-grid">{saved.closet.slice(0, 5).map((item) => <article className="mini-item" key={item.id}><div className="mini-item-image"><ItemArt category={item.category} color={item.color} compact photoUrl={closetImage(item)} sprite={displayProductSprite(item)} itemLabel={item.customCategory || item.name} /><button aria-label={`${item.name} 삭제`} className="remove-item" onClick={() => removeItem(item.id)}><X size={14} /></button></div><strong>{item.name}</strong><span>{item.color} · {item.category}</span></article>)}<button className="add-tile" onClick={() => setShowAdd(true)}><span><Plus size={21} /></span><b>옷 추가하기</b></button></div>}
            </section>

          </>}

          {section === 'closet' && <>
            <section className="page-heading"><div><p className="eyebrow">내가 가진 옷</p><h1>내 옷장</h1><p className="lead">옷을 모아보고, 다른 조합으로 입어보세요.</p></div><div className="closet-heading-actions"><button className="sample-closet-button" onClick={enterSampleCloset}>샘플 옷장으로 체험하기</button><button className="button-dark" onClick={() => setShowAdd(true)}><Plus size={17} /> 옷 추가하기</button></div></section>
            <div className="filter-row"><div className="filter-label"><SlidersHorizontal size={16} />카테고리</div>{(['전체', ...categories] as Array<Category | '전체'>).map((category) => <button key={category} className={`filter-chip ${categoryFilter === category ? 'selected' : ''}`} onClick={() => setCategoryFilter(category)}>{category}</button>)}<span className="filter-count">{filteredCloset.length}개</span></div>
          {filteredCloset.length ? <div className="closet-grid">{filteredCloset.map((item) => <article className={`closet-card ${item.id.startsWith('demo-') ? 'is-demo-item' : ''}`} key={item.id}><div className="closet-card-art"><ItemArt category={item.category} color={item.color} photoUrl={closetImage(item)} sprite={displayProductSprite(item)} itemLabel={item.customCategory || item.name} /><button aria-label={`${item.name} 삭제`} className="delete-button" onClick={() => removeItem(item.id)}><Trash2 size={16} /></button><span className="category-tag">{item.id.startsWith('demo-') ? '체험용 · ' : ''}{item.customCategory || item.category}</span></div><div className="closet-card-meta"><div><h3>{item.name}</h3><p>{item.color} <span>·</span> {item.style}</p></div><ChevronDown size={16} /></div><div className="tag-row"><span>보온 · {item.warmth || '미설정'}</span>{item.weatherTags.map((tag) => <span key={tag}>{tag}</span>)}</div></article>)}</div> : <div className="empty-state"><div className="empty-art"><Shirt size={35} strokeWidth={1.2} /></div><h3>{saved.closet.length ? '이 카테고리에는 아직 옷이 없어요' : '아직 옷장이 비어 있어요'}</h3><p>가지고 있는 옷을 추가하면 실제 옷을 기준으로 코디를 찾아드려요.</p><button className="button-dark" onClick={() => setShowAdd(true)}><Plus size={17} /> 옷 고르기</button><button className="button-text" onClick={() => setSaved((current) => ({ ...current, skippedIntro: true }))}>나중에 등록하기</button></div>}
          </>}

          {section === 'looks' && <>
            <section className="page-heading"><div><p className="eyebrow">내가 저장한 스타일</p><h1>참고 코디</h1><p className="lead">이미지를 올리고, 눈에 보이는 옷만 직접 입력해 내 옷과 비교해요.</p></div></section>
            <form className="reference-upload-form" onSubmit={saveReferenceLook}>
              <div className="reference-form-heading"><div><h2>코디 이미지 추가</h2><p>사진 자동 분석은 하지 않아요. 이미지에 보이는 옷만 선택적으로 적어주세요.</p></div><span>PNG · JPG · WEBP</span></div>
              <div className="reference-form-grid">
                <div className="reference-file-column">
                  <label className={`reference-dropzone ${referencePreview ? 'has-preview' : ''}`}>
                    <input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={(event) => handleReferenceFile(event.currentTarget.files?.[0])} />
                    {referencePreview ? <img src={referencePreview} alt="업로드할 참고 코디 미리보기" /> : <span className="upload-placeholder"><Plus size={24} /><b>코디 이미지 선택</b><small>실사 사진이나 패션 일러스트</small></span>}
                  </label>
                  <p className="storage-hint">이미지 파일은 이 브라우저의 IndexedDB에 저장돼요. 옷장 정보는 기존처럼 localStorage에 저장됩니다.</p>
                </div>
                <div className="reference-entry-column">
                  <label className="reference-title-field">코디 이름 (선택)<input value={referenceTitle} onChange={(event) => setReferenceTitle(event.target.value)} maxLength={50} placeholder="예: 출근길에 본 코디" /></label>
                  <div className="visible-garment-heading"><div><strong>이미지에서 확인한 옷</strong><span>보이는 항목만 입력하세요. 비워둬도 돼요.</span></div></div>
                  <div className="reference-garment-controls">
                    <select aria-label="참고 의류 카테고리" value={pendingGarmentCategory} onChange={(event) => setPendingGarmentCategory(event.target.value as Category)}>{categories.map((category) => <option key={category}>{category}</option>)}</select>
                    <select aria-label="참고 의류 색상" value={pendingGarmentColor} onChange={(event) => setPendingGarmentColor(event.target.value)}>{colors.map((color) => <option key={color}>{color}</option>)}</select>
                    <select aria-label="참고 의류 스타일" value={pendingGarmentStyle} onChange={(event) => setPendingGarmentStyle(event.target.value)}>{styles.map((style) => <option key={style}>{style}</option>)}</select>
                    <button type="button" className="reference-add-garment" onClick={addReferenceGarment} aria-label="구성 항목 추가"><Plus size={17} /></button>
                  </div>
                  {referenceGarments.length > 0 && <div className="reference-garment-chips">{referenceGarments.map((garment) => <span key={garment.id}>{garment.category} · {garment.color} · {garment.style}<button type="button" aria-label="구성 항목 삭제" onClick={() => setReferenceGarments((current) => current.filter((item) => item.id !== garment.id))}><X size={12} /></button></span>)}</div>}
                  {referenceError && <p className="form-error" role="status">{referenceError}</p>}
                  <button className="button-dark save-reference-button" type="submit" disabled={referenceBusy}>{referenceBusy ? '이미지 저장 중…' : '참고 코디 저장'}</button>
                </div>
              </div>
            </form>
            <div className="saved-references-heading"><div><p className="eyebrow">나의 참고 이미지</p><h2>이미지와 내 옷 비교</h2></div><span>{(saved.references ?? []).length}개</span></div>
            {(saved.references ?? []).length > 0 ? <div className="saved-reference-list">{saved.references!.map((reference) => <ReferenceLookCard key={reference.id} reference={reference} closet={saved.closet} imageUrl={referenceImageUrls[reference.id]} onDelete={() => void removeReferenceLook(reference)} />)}</div> : <div className="empty-reference-state"><Compass size={24} /><strong>아직 참고 코디가 없어요</strong><p>좋아하는 이미지가 있으면 업로드해 보세요. 이미지의 옷을 직접 입력한 항목만 옷장과 비교합니다.</p></div>}
          </>}

          <footer className="page-footer"><span>내 옷으로 만드는 오늘의 선택</span><button onClick={() => setShowSettings(true)}>저장 및 개인정보 안내</button></footer>
        </div>
      </main>

      <nav className="mobile-nav" aria-label="모바일 메뉴"><button className={section === 'today' ? 'active' : ''} onClick={() => setSection('today')}><Sun size={19} /><span>오늘</span></button><button className={section === 'closet' ? 'active' : ''} onClick={() => setSection('closet')}><Shirt size={19} /><span>내 옷장</span></button><button className={section === 'looks' ? 'active' : ''} onClick={() => setSection('looks')}><Compass size={19} /><span>참고 코디</span></button><button onClick={() => setShowSettings(true)}><Settings2 size={19} /><span>설정</span></button></nav>

      {showAdd && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAdd(false) }}><section className="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-title"><div className="modal-header"><div><p className="eyebrow">내 옷장 만들기</p><h2 id="add-title">내 옷 고르기</h2></div><button className="icon-button" aria-label="창 닫기" onClick={() => setShowAdd(false)}><X size={19} /></button></div><p className="modal-intro">이미지는 각 옷 종류를 보여주는 시연용 제품 이미지예요. 실제 보유 옷 사진은 아니며, 내 옷은 직접 등록해 주세요.</p><div className="catalog-grid">{sampleItems.map((item) => { const owned = saved.closet.find((entry) => entry.id === item.id || entry.id === `demo-${item.id}`); const active = Boolean(owned); return <button key={item.id} aria-pressed={active} className={`catalog-card ${active ? 'is-added' : ''}`} onClick={() => owned ? removeItem(owned.id) : addItem(item)}><div className="catalog-art"><ItemArt category={item.category} color={item.color} sprite={getSampleImage(item.id)} itemLabel={item.customCategory || item.name} /><span className="catalog-plus">{active ? <Check size={15} /> : <Plus size={16} />}</span></div><strong>{item.name}</strong><span>{item.customCategory || item.category} · {item.color}</span></button> })}</div>
        <details className="custom-add"><summary><span>목록에 없는 옷 직접 등록</span><ArrowDownToLine size={16} /></summary><form onSubmit={submitCustomItem}><label>옷 이름<input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="예: 내가 자주 입는 셔츠" /></label><div className="form-grid"><label>카테고리<select value={customCategory} onChange={(event) => setCustomCategory(event.target.value as Category)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>색상<select value={customColor} onChange={(event) => setCustomColor(event.target.value)}>{colors.map((color) => <option key={color}>{color}</option>)}</select></label><label>스타일<select value={customStyle} onChange={(event) => setCustomStyle(event.target.value)}>{styles.map((style) => <option key={style}>{style}</option>)}</select></label><label>보온 정도<select value={customWarmth} onChange={(event) => setCustomWarmth(event.target.value as WarmthLevel)}>{(['얇음', '보통', '따뜻함', '미설정'] as WarmthLevel[]).map((level) => <option key={level}>{level}</option>)}</select></label>{customCategory === '기타' && <label>직접 지정<input value={customDetail} onChange={(event) => setCustomDetail(event.target.value)} placeholder="예: 목도리, 장갑" /></label>}</div><p className="warmth-hint">보온 정도를 입력하지 않으면 날씨 적합성을 추측하지 않아요.</p><div className="weather-tag-select"><span>방한·방수 정보 (선택)</span>{(['방한', '보온', '방수', '우산'] as WeatherTag[]).map((tag) => <label key={tag} className="check-label"><input type="checkbox" checked={customWeather.includes(tag)} onChange={() => setCustomWeather((current) => current.includes(tag) ? current.filter((entry) => entry !== tag) : [...current, tag])} />{tag}</label>)}</div>{formError && <p className="form-error">{formError}</p>}<button type="submit" className="button-dark">옷장에 등록</button></form></details>
         <div className="modal-bottom"><span><strong>{saved.closet.length}개</strong> 옷장에 담김</span><button className="button-dark" onClick={() => { setShowAdd(false); setSection('closet') }}>선택 완료 <ArrowRight size={16} /></button></div></section></div>}

      {showSettings && <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSettings(false) }}><aside className="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div className="drawer-header"><div><p className="eyebrow">PREFERENCES</p><h2 id="settings-title">설정</h2></div><button className="icon-button" aria-label="설정 닫기" onClick={() => setShowSettings(false)}><X size={19} /></button></div><section className="settings-section"><h3>저장 위치</h3><p>옷장 정보와 일정은 이 브라우저에 저장돼요. 다른 기기와 공유되지 않으며, 브라우저 데이터를 지우면 옷장도 사라질 수 있어요. 참고 이미지는 IndexedDB에 저장돼요.</p><div className="settings-status"><span className="green-dot" />이 브라우저에 {saved.closet.length}개 아이템 저장 중 {saved.demoCloset ? '· 시연 데이터 포함' : ''}</div></section><section className="settings-section"><h3>위치와 날씨</h3><p>선택한 도시 또는 동의한 현재 위치 좌표를 Open-Meteo 날씨 조회에 전달합니다. 위치 좌표는 저장하지 않으며, 현재 위치 사용은 선택 사항이에요.</p><div className="settings-status"><Compass size={15} />{locationOverride ? '현재 위치를 이번 방문에서 사용 중' : '도시를 직접 선택하는 중'}</div></section><section className="settings-section"><h3>추천 방식</h3><p>외출 시간대 예보와 실제 옷장에 등록된 카테고리·보온·방수 정보를 사용합니다. 체감온도 {outingRecommendationRules.maxFeelsLikeForWarm}°C 이상, {outingRecommendationRules.maxFeelsLikeForCold}°C 이하, {outingRecommendationRules.notableTemperatureDrop}°C 이상 하락, 강수확률 {outingRecommendationRules.rainProbability}% 이상은 앱 참고 기준입니다. 미설정 정보는 추정하지 않으며 외부 AI나 이미지 인식은 사용하지 않습니다.</p></section><section className="settings-section"><details className="settings-demo-tools"><summary>시연용 데모 모드</summary><p>테스트용 날씨 조건입니다. 선택한 결과는 실제 예보가 아니며, 옷장 데이터는 변경하지 않아요.</p><div className="demo-mode-picker">{weatherModes.map((mode) => <button type="button" key={mode} aria-pressed={weatherTestMode === mode} className={weatherTestMode === mode ? 'selected' : ''} onClick={() => setWeatherTestMode(mode)}>{mode}</button>)}</div><span className="demo-selection-note">현재 선택: {weatherTestMode}</span></details></section><section className="settings-section reset-section"><h3>데이터 초기화</h3><p>현재 브라우저에 저장된 옷장, 참고 이미지와 일정 설정을 삭제합니다.</p><button className="reset-button" onClick={resetData}><RotateCcw size={16} /> 옷장 및 설정 초기화</button></section><div className="drawer-footer">로그인 없이 이용 중 · 계정 정보는 저장하지 않아요</div></aside></div>}
    </div>
  )
}

function OutingResultView({
  result, closet, demoCloset, onAdd,
}: {
  result: OutingResult
  closet: ClosetItem[]
  demoCloset: boolean
  onAdd: () => void
}) {
  const { hourly } = result
  const { date: outDate, departure, returnTime, purpose } = result.plan
  const analysisCloset = result.scenario === '적합한 옷 없음'
    ? []
    : result.scenario === '보온 정보 부족'
      ? closet.map((item) => ({
        ...item,
        warmth: '미설정' as const,
        weatherTags: item.weatherTags.filter((tag) => tag !== '방한' && tag !== '보온'),
      }))
      : closet
  const recommendation = recommendForOuting(analysisCloset, hourly, purpose)
  const [selectedBaseIds, setSelectedBaseIds] = useState<string[]>(() => recommendation.baseItems.map((item) => item.id))
  const chosenBaseItems = recommendation.baseItems.filter((item) => selectedBaseIds.includes(item.id))
  const scenarioNote = result.scenario === '보온 정보 부족'
    ? '시연용 가정: 옷의 보온·방한 정보가 등록되지 않은 상태를 보여줍니다. 실제 옷장 정보는 바뀌지 않습니다.'
    : result.scenario === '적합한 옷 없음'
      ? '시연용 가정: 외출 코디에 사용할 옷이 옷장에 없는 상태를 보여줍니다. 실제 옷장 정보는 바뀌지 않습니다.'
      : result.source === 'demo' ? '시연용 샘플 날씨예요. 실제 예보가 아닙니다.' : undefined
  const minFeels = Math.min(...hourly.map((point) => point.apparentTemperature))
  const maxFeels = Math.max(...hourly.map((point) => point.apparentTemperature))
  const dayLabel = new Date(`${outDate}T12:00:00`).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  const overnight = returnTime <= departure
  const returnDayLabel = overnight ? new Date(`${addCalendarDays(outDate, 1)}T12:00:00`).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }) : ''
  const datePurpose = `${dayLabel}${overnight ? ` → ${returnDayLabel}` : ''} · ${purpose}`
  return <section className="outing-results" aria-live="polite">
    <div className="result-heading"><div><p className="eyebrow">외출 시간 예보</p><h2>{datePurpose}</h2><p>{result.locationLabel} · {departure} 출발 · {returnTime} 귀가{overnight ? ' (다음 날)' : ''} · Asia/Seoul</p></div><div className={`forecast-badge ${result.source === 'demo' ? 'is-demo' : ''}`}>{result.source === 'demo' ? '시연용 샘플 · 실제 예보 아님' : 'Open-Meteo · 실제 시간별 예보'}</div></div>
    {scenarioNote && <div className="scenario-note"><Sparkles size={15} /><span>{scenarioNote}</span></div>}
    {demoCloset && <div className="scenario-note closet-demo-note"><Shirt size={15} /><span>옷장에 체험용 샘플이 포함될 수 있어요. 각 옷 카드의 ‘체험용’ 표기를 확인해 주세요.</span></div>}
    <div className="weather-summary-strip"><div><Thermometer size={17} /><span>외출 중 체감온도</span><strong>{Math.round(minFeels)}° <small>~</small> {Math.round(maxFeels)}°C</strong></div><div><CloudDrizzle size={17} /><span>시간별 강수</span><strong>{recommendation.rainy ? '비 가능성 있음' : '뚜렷한 강수 예보 없음'}</strong></div><div><span className="purpose-marker">{purpose.slice(0, 1)}</span><span>외출 목적</span><strong>{purpose}</strong></div></div>
    <WeatherTimeline hourly={hourly} departure={departure} returnTime={returnTime} />
    <p className="recommendation-rule-note">앱 참고 기준: 체감온도 {outingRecommendationRules.maxFeelsLikeForWarm}°C 이상은 가벼운 겉옷, {outingRecommendationRules.maxFeelsLikeForCold}°C 이하 또는 {outingRecommendationRules.notableTemperatureDrop}°C 이상 하락은 보온 아이템을 확인해요. 강수확률 {outingRecommendationRules.rainProbability}% 이상 또는 시간 강수량 {outingRecommendationRules.measurableRainMm}mm 이상이면 비 대비를 안내합니다. 공식 기상특보 기준은 아닙니다.</p>
    <div className="outfit-recommendation">
      <div className="recommendation-title"><div><p className="eyebrow">내 옷장에서 고르기</p><h3>{recommendation.suitable ? '이번 외출에 입어볼 조합' : '아직 조합할 옷이 부족해요'}</h3></div><span>점수 없이, 옷장 정보와 예보로 안내해요</span></div>
      {recommendation.suitable ? <div className="recommended-items">{recommendation.baseItems.map((item) => <ClothingCard key={item.id} item={item} label="기본 구성" selected={selectedBaseIds.includes(item.id)} onSelect={() => setSelectedBaseIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} />)}</div> : <div className="no-recommendation"><Shirt size={22} /><p>등록된 상의·하의·신발을 찾지 못했어요. 옷을 추가하면 실제 옷장 기준으로 다시 확인할 수 있습니다.</p><button className="button-dark" onClick={onAdd}>옷장에 아이템 추가</button></div>}
      {recommendation.suitable && <div className="final-outfit-choice"><strong>{chosenBaseItems.length ? '오늘 입기로 고른 조합' : '아직 코디를 선택하지 않았어요'}</strong><p>{chosenBaseItems.length ? chosenBaseItems.map((item) => `${item.category} · ${item.name}`).join(' / ') : '추천된 옷 카드를 눌러 최종 코디를 골라보세요.'}</p><span>선택은 이 화면에서만 유지돼요.</span></div>}
      {recommendation.missingBaseCategories.length > 0 && recommendation.suitable && <p className="missing-base-note">기본 구성에서 더 필요한 종류: {recommendation.missingBaseCategories.join(' · ')}</p>}
      {recommendation.alternativeOutfits.length > 0 && <div className="alternative-outfits"><div><strong>다른 조합</strong><span>옷장에 등록된 아이템으로 바꿔 골라보세요.</span></div>{recommendation.alternativeOutfits.map((combo, index) => <button type="button" key={combo.map((item) => item.id).join('|')} onClick={() => setSelectedBaseIds(combo.map((item) => item.id))}><span>조합 {index + 1}</span>{combo.map((item) => <i key={item.id}>{item.category} · {item.name}</i>)}</button>)}</div>}
      {recommendation.reasons.length > 0 && <div className="reason-list"><h4>추천 이유</h4>{recommendation.reasons.map((reason) => <p key={reason}><Check size={14} />{reason}</p>)}</div>}
      {recommendation.missingInfo.length > 0 && <div className="unknown-warmth-note"><strong>판단하지 않은 정보</strong>{recommendation.missingInfo.map((info) => <p key={info}>{info}</p>)}</div>}
      {recommendation.extraItems.length > 0 && <div className="extra-items"><div><h4>함께 챙겨볼 아이템</h4><p>옷장에 실제 등록된 보온·방수 정보를 바탕으로 표시했어요.</p></div><div className="recommended-items">{recommendation.extraItems.map((item) => <ClothingCard key={item.id} item={closet.find((owned) => owned.id === item.id) ?? item} label={item.weatherTags.includes('우산') || item.weatherTags.includes('방수') ? '비 대비' : '기온 변화 대비'} />)}</div></div>}
      {recommendation.rainy && !recommendation.extraItems.some((item) => item.weatherTags.includes('우산') || item.weatherTags.includes('방수')) && <p className="missing-base-note">비 예보가 있지만 옷장에 우산·방수로 표시된 아이템이 없어요.</p>}
      <p className="purpose-disclaimer">외출 목적은 요약에 반영했으며, 목적만으로 격식이나 스타일을 추측하지 않았어요.</p>
    </div>
    <p className="weather-attribution">날씨 데이터: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · 시간별 예보는 변경될 수 있어요.</p>
  </section>
}

function ClothingCard({ item, label, selected, onSelect }: { item: ClosetItem; label: string; selected?: boolean; onSelect?: () => void }) {
  const cardLabel = item.id.startsWith('demo-') ? `${label} · 체험용` : label
  return <article className={`recommended-item-card ${selected ? 'is-outfit-selected' : ''}`}><div className="recommended-item-art"><ItemArt category={item.category} color={item.color} compact photoUrl={closetImage(item)} sprite={displayProductSprite(item)} itemLabel={item.customCategory || item.name} /><span>{cardLabel}</span></div><div className="recommended-item-details"><strong>{item.name}</strong><small>{item.color} · {item.category}</small><small>보온 · {item.warmth || '미설정'}</small>{onSelect && <button type="button" aria-pressed={selected} onClick={onSelect}>{selected ? '선택됨' : '이 옷으로 입기'}</button>}</div></article>
}

function WeatherTimeline({ hourly, departure, returnTime }: { hourly: HourlyForecast[]; departure: string; returnTime: string }) {
  const width = 720
  const height = 170
  const left = 38
  const right = width - 14
  const top = 18
  const bottom = 122
  const values = hourly.map((point) => point.temperature)
  const min = Math.floor(Math.min(...values) - 2)
  const max = Math.ceil(Math.max(...values) + 2)
  const span = Math.max(1, max - min)
  const points = hourly.map((point, index) => {
    const x = hourly.length === 1 ? (left + right) / 2 : left + index * (right - left) / (hourly.length - 1)
    const y = bottom - ((point.temperature - min) / span) * (bottom - top)
    return { ...point, x, y }
  })
  const line = points.map((point) => `${point.x},${point.y}`).join(' ')
  return <section className="timeline-card">
    <div className="timeline-heading"><div><p className="eyebrow">시간대별 날씨</p><h3>출발부터 귀가까지</h3></div><span>기온 · 강수 확률</span></div>
    <div className="timeline-scroll"><svg className="weather-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="외출 시간별 기온과 강수확률 그래프">
      {[0, 1, 2].map((row) => { const y = top + row * (bottom - top) / 2; const label = Math.round(max - row * span / 2); return <g key={row}><line x1={left} y1={y} x2={right} y2={y} stroke="#e8e6df" strokeDasharray="3 5" /><text x="4" y={y + 4} className="chart-axis-label">{label}°</text></g> })}
      <polyline points={line} fill="none" stroke="#3155e7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => <g key={point.time}>
        {point.precipitationProbability >= 40 && <rect x={point.x - 6} y={bottom + 17} width="12" height={Math.max(4, point.precipitationProbability * .24)} rx="3" fill="#9aabb0" opacity=".8" />}
        <circle cx={point.x} cy={point.y} r="3.5" fill="#fff" stroke="#3155e7" strokeWidth="2" />
        {index % 3 === 0 && index !== 0 && index !== points.length - 1 && <text x={point.x} y={height - 5} textAnchor="middle" className="chart-time-label">{point.time.slice(11, 16)}</text>}
        {(index === 0 || index === points.length - 1 || point.precipitationProbability >= 60) && <text x={point.x} y={point.y - 10} textAnchor="middle" className="chart-temp-label">{Math.round(point.temperature)}°</text>}
      </g>)}
      <text x={left} y={height - 5} textAnchor="start" className="chart-time-label">출발 {departure}</text>
      <text x={right} y={height - 5} textAnchor="end" className="chart-time-label">귀가 {returnTime}</text>
    </svg></div>
    <div className="timeline-legend"><span><i className="legend-temp" />기온</span><span><i className="legend-rain" />강수 확률 40% 이상 시간대</span><small>강수 막대는 API 강수확률 표시이며, 공식 특보가 아닙니다.</small></div>
  </section>
}

function ReferenceLookCard({ reference, closet, imageUrl, onDelete }: { reference: ReferenceLook; closet: ClosetItem[]; imageUrl?: string; onDelete: () => void }) {
  const matches = matchReferenceGarments(reference.garments, closet)
  return <article className="reference-look-card">
    <header className="reference-look-header"><div><p className="eyebrow">사용자가 직접 입력한 참고 정보</p><h3>{reference.title}</h3><span>{reference.garments.length ? `${reference.garments.length}개 항목을 입력했어요` : '의류 구성 정보 없음'}</span></div><button type="button" className="delete-button" aria-label={`${reference.title} 이미지 삭제`} onClick={onDelete}><Trash2 size={16} /></button></header>
    <div className="reference-compare">
      <section><div className="comparison-label"><span>REFERENCE IMAGE</span><strong>업로드한 이미지</strong></div><div className={`reference-uploaded-image ${imageUrl ? '' : 'image-unavailable'}`}>{imageUrl && <img src={imageUrl} alt={`${reference.title} 참고 이미지`} onError={(event) => event.currentTarget.parentElement?.classList.add('image-unavailable')} />}<div className="reference-image-missing"><Compass size={23} /><span>이미지를 불러올 수 없어요</span></div></div></section>
      <section className="reference-match-results"><div className="comparison-label"><span>YOUR CLOSET</span><strong>내 옷장과 비교</strong></div>{matches.length ? matches.map(({ reference: garment, candidates, reason }) => <div className="reference-match-row" key={garment.id}><div className="reference-garment-info"><span>{garment.category}</span><b>{garment.color} · {garment.style}</b><small>{reason}</small></div>{candidates.length ? <div className="reference-candidates">{candidates.slice(0, 4).map((item) => <div className="reference-candidate" key={item.id}><div><ItemArt category={item.category} color={item.color} compact photoUrl={closetImage(item)} sprite={displayProductSprite(item)} itemLabel={item.customCategory || item.name} /></div><b>{item.name}</b><small>{item.color} · {item.style}</small></div>)}</div> : <span className="reference-no-match">일치하는 카테고리 없음</span>}</div>) : <div className="reference-no-details"><p>이미지 자동 인식은 하지 않아요. 보이는 옷의 카테고리·색상·스타일을 직접 입력하면 여기에 비교 결과가 나타납니다.</p></div>}</section>
    </div>
  </article>
}

export default App
