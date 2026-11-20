export type Category = '상의' | '하의' | '아우터' | '신발' | '기타'
export type WeatherTag = '방한' | '보온' | '방수' | '우산'

export type WarmthLevel = '얇음' | '보통' | '따뜻함' | '미설정'

export type ClosetItem = {
  id: string
  name: string
  category: Category
  color: string
  style: string
  weatherTags: WeatherTag[]
  customCategory?: string
  imageUrl?: string
  warmth?: WarmthLevel
}

export function mergeDemoClosetItems(existing: ClosetItem[], samples: ClosetItem[]): ClosetItem[] {
  const existingIds = new Set(existing.map((item) => item.id))
  const additional = samples
    .map((item) => ({ ...item, id: item.id.startsWith('demo-') ? item.id : `demo-${item.id}` }))
    .filter((item) => !existingIds.has(item.id))
  return [...existing, ...additional]
}

export type OutfitPiece = {
  category: Category
  name: string
  color: string
  style: string
  role: '필수' | '추천'
}

export type ReferenceOutfit = {
  id: string
  title: string
  note: string
  pieces: OutfitPiece[]
}

export type ReferenceGarment = {
  id: string
  category: Category
  color: string
  style: string
}

export type ReferenceGarmentMatch = {
  reference: ReferenceGarment
  candidates: ClosetItem[]
  reason: string
}

export function matchReferenceGarments(
  reference: ReferenceGarment[],
  closet: ClosetItem[],
): ReferenceGarmentMatch[] {
  return reference.map((garment) => {
    const candidates = closet
      .filter((item) => item.category === garment.category)
      .slice()
      .sort((a, b) => {
        const aColor = colorFamily(a.color) === colorFamily(garment.color) ? 0 : 1
        const bColor = colorFamily(b.color) === colorFamily(garment.color) ? 0 : 1
        const aStyle = a.style === garment.style ? 0 : 1
        const bStyle = b.style === garment.style ? 0 : 1
        return aColor - bColor || aStyle - bStyle || a.id.localeCompare(b.id)
      })
    const reason = candidates.length === 0
      ? `옷장에 등록된 ${garment.category}이 없어요.`
      : candidates.some((item) => colorFamily(item.color) === colorFamily(garment.color) && item.style === garment.style)
        ? '같은 색 계열과 스타일의 보유 아이템이 있어요.'
        : candidates.some((item) => colorFamily(item.color) === colorFamily(garment.color))
          ? '같은 색 계열의 보유 아이템이 있어요.'
          : candidates.some((item) => item.style === garment.style)
            ? '같은 스타일의 보유 아이템이 있어요.'
            : '같은 카테고리의 옷으로 바꿔 입어볼 수 있어요.'
    return { reference: garment, candidates, reason }
  })
}

export type OutfitMatch = {
  outfit: ReferenceOutfit
  pieces: Array<{
    reference: OutfitPiece
    owned: ClosetItem[]
    reason: string
  }>
  missingRequired: OutfitPiece[]
  isComplete: boolean
}

function isSameSlot(item: ClosetItem, reference: OutfitPiece): boolean {
  if (item.category !== reference.category) return false
  if (reference.category !== '기타') return true

  const target = reference.name.includes('우산') ? '우산'
    : reference.name.includes('장갑') ? '장갑'
      : reference.name.includes('목도리') ? '목도리'
        : null
  if (!target) return false
  return item.customCategory?.includes(target) === true
    || item.name.includes(target)
    || item.weatherTags.includes(target as WeatherTag)
}

function colorFamily(color: string): string {
  const normalized = color.toLowerCase()
  if (['오프화이트', '아이보리', '크림', '화이트'].includes(normalized)) return '화이트'
  if (['차콜', '그레이', '회색'].includes(normalized)) return '그레이'
  if (['토프', '샌드', '베이지'].includes(normalized)) return '베이지'
  if (['블루', '네이비'].includes(normalized)) return '블루'
  return normalized
}

export const referenceOutfits: ReferenceOutfit[] = [
  {
    id: 'quiet-morning',
    title: '조용한 아침',
    note: '담백한 셔츠와 여유로운 실루엣',
    pieces: [
      { category: '상의', name: '코튼 셔츠', color: '오프화이트', style: '미니멀', role: '필수' },
      { category: '하의', name: '스트레이트 팬츠', color: '차콜', style: '미니멀', role: '필수' },
      { category: '신발', name: '로퍼', color: '블랙', style: '클래식', role: '필수' },
      { category: '아우터', name: '싱글 재킷', color: '토프', style: '클래식', role: '추천' },
    ],
  },
  {
    id: 'weekend-walk',
    title: '주말 산책',
    note: '편안한 데님에 가벼운 레이어드',
    pieces: [
      { category: '상의', name: '스트라이프 티셔츠', color: '네이비', style: '캐주얼', role: '필수' },
      { category: '하의', name: '데님 팬츠', color: '블루', style: '캐주얼', role: '필수' },
      { category: '신발', name: '캔버스 스니커즈', color: '오프화이트', style: '캐주얼', role: '필수' },
      { category: '아우터', name: '가디건', color: '그레이', style: '클래식', role: '추천' },
    ],
  },
  {
    id: 'soft-layers',
    title: '부드러운 레이어',
    note: '뉴트럴 톤으로 차분하게 맞춘 조합',
    pieces: [
      { category: '상의', name: '니트 탑', color: '크림', style: '클래식', role: '필수' },
      { category: '하의', name: '와이드 팬츠', color: '베이지', style: '클래식', role: '필수' },
      { category: '신발', name: '스웨이드 슈즈', color: '브라운', style: '클래식', role: '필수' },
      { category: '아우터', name: '트렌치 코트', color: '샌드', style: '클래식', role: '추천' },
    ],
  },
  {
    id: 'rainy-day',
    title: '비 오는 날',
    note: '편하게 걷고 가볍게 챙기는 구성',
    pieces: [
      { category: '상의', name: '후드 스웨트셔츠', color: '그레이', style: '캐주얼', role: '필수' },
      { category: '하의', name: '코튼 팬츠', color: '네이비', style: '캐주얼', role: '필수' },
      { category: '신발', name: '레인 부츠', color: '블랙', style: '캐주얼', role: '추천' },
      { category: '기타', name: '접이식 우산', color: '블랙', style: '베이직', role: '추천' },
    ],
  },
]

export function matchOutfits(
  closet: ClosetItem[],
  outfits: ReferenceOutfit[] = referenceOutfits,
): OutfitMatch[] {
  return outfits.map((outfit) => {
    const pieces = outfit.pieces.map((reference) => {
      const owned = closet
        .filter((item) => isSameSlot(item, reference))
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id))
      const sameColor = owned.some((item) => colorFamily(item.color) === colorFamily(reference.color))
      const sameStyle = owned.some((item) => item.style === reference.style)
      const reason = owned.length === 0
        ? `${reference.category} 옷이 옷장에 없어요.`
        : sameColor && sameStyle
          ? '참고 코디와 색 계열과 스타일이 같은 아이템이 있어요.'
          : sameColor
            ? '참고 코디와 같은 색 계열의 아이템이 있어요.'
            : sameStyle
              ? '비슷한 스타일의 옷으로 바꿔 입어볼 수 있어요.'
              : `옷장에 있는 ${reference.category} 아이템으로 바꿔 입어볼 수 있어요.`
      return { reference, owned, reason }
    })
    const missingRequired = pieces
      .filter(({ reference, owned }) => reference.role === '필수' && owned.length === 0)
      .map(({ reference }) => reference)
    return { outfit, pieces, missingRequired, isComplete: missingRequired.length === 0 }
  })
}

export type WeatherSnapshot = {
  temperature: number
  apparentTemperature: number
  precipitationProbability: number
  nextThreeHourPrecipitation: number
  weatherCode: number
}

export type WeatherAdvice = {
  title: string
  detail: string
  items: ClosetItem[]
  kind: 'cold' | 'rain' | 'heavy-rain' | 'clear'
}

export function getWeatherAdvice(weather: WeatherSnapshot, closet: ClosetItem[]): WeatherAdvice[] {
  const advice: WeatherAdvice[] = []
  const cold = weather.temperature < 0 || weather.apparentTemperature <= 0
  if (cold) {
    const items = closet.filter((item) =>
      item.weatherTags.some((tag) => tag === '방한' || tag === '보온'),
    )
    advice.push({
      title: weather.temperature < 0 ? '영하 날씨예요' : '체감온도가 0°C 이하예요',
      detail: items.length ? '옷장에 있는 방한·보온 아이템을 살펴보세요.' : '방한·보온으로 표시한 옷은 아직 옷장에 없어요.',
      items,
      kind: 'cold',
    })
  }

  const rainyCode = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 97, 99]
  const likelyRain = weather.precipitationProbability >= 40 || rainyCode.includes(weather.weatherCode)
  if (likelyRain) {
    const heavy = weather.nextThreeHourPrecipitation >= 10
    const items = closet.filter((item) => item.weatherTags.some((tag) => tag === '방수' || tag === '우산'))
    advice.push({
      title: heavy ? '강한 비 예보가 있어요' : '비 예보가 있어요',
      detail: heavy
        ? '앱 기준으로 앞으로 3시간 예상 강수량이 10mm 이상이에요. 공식 기상특보와는 달라요.'
        : '옷장에 있는 우산이나 방수 아이템을 살펴보세요.',
      items,
      kind: heavy ? 'heavy-rain' : 'rain',
    })
  }

  if (!advice.length) {
    advice.push({
      title: '현재 예보에서 추위나 비가 두드러지지 않아요',
      detail: '옷장에 등록한 옷으로 편하게 조합해 보세요.',
      items: [],
      kind: 'clear',
    })
  }
  return advice
}

export type HourlyForecast = {
  time: string
  temperature: number
  apparentTemperature: number
  precipitationProbability: number
  precipitation: number
  weatherCode: number
}

export type OutingPlan = {
  city: string
  date: string
  departure: string
  returnTime: string
  purpose: '일상' | '데이트' | '여행' | '야외 활동'
}

export type OutingRecommendation = {
  baseItems: ClosetItem[]
  alternativeOutfits: ClosetItem[][]
  extraItems: ClosetItem[]
  missingBaseCategories: Category[]
  reasons: string[]
  missingInfo: string[]
  temperatureDrop: number
  rainy: boolean
  suitable: boolean
}

export const outingRecommendationRules = {
  maxFeelsLikeForWarm: 18,
  maxFeelsLikeForCold: 5,
  notableTemperatureDrop: 7,
  rainProbability: 40,
  measurableRainMm: 0.1,
} as const

export function selectOutingForecast(
  hourly: HourlyForecast[],
  departure: string,
  returnTime: string,
  outingDate?: string,
): HourlyForecast[] {
  const startMinutes = toMinutes(departure)
  const endMinutes = toMinutes(returnTime)
  if (startMinutes === null || endMinutes === null || (endMinutes === startMinutes && !outingDate)) return []
  const startHour = Math.floor(startMinutes / 60) * 60
  const endHour = Math.floor(endMinutes / 60) * 60
  const startDate = outingDate ? new Date(`${outingDate}T12:00:00`) : null
  const endDate = startDate ? new Date(startDate) : null
  if (endDate && endMinutes <= startMinutes) endDate.setDate(endDate.getDate() + 1)
  const startDateKey = startDate ? localDateString(startDate) : null
  const endDateKey = endDate ? localDateString(endDate) : null
  return hourly.filter((point) => {
    const pointDate = point.time.slice(0, 10)
    const time = point.time.slice(11, 16)
    const minutes = toMinutes(time)
    if (minutes === null) return false
    if (startDateKey && endDateKey) {
      const afterStart = pointDate > startDateKey || (pointDate === startDateKey && minutes >= startHour)
      const beforeEnd = pointDate < endDateKey || (pointDate === endDateKey && minutes <= endHour)
      return afterStart && beforeEnd
    }
    return minutes >= startHour && minutes <= endHour
  })
}

function localDateString(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function toMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null
}

export function recommendForOuting(
  closet: ClosetItem[],
  forecast: HourlyForecast[],
  purpose: '일상' | '데이트' | '여행' | '야외 활동' = '일상',
): OutingRecommendation {
  const ordered = forecast.slice().sort((a, b) => a.time.localeCompare(b.time))
  const empty = {
    baseItems: [] as ClosetItem[], alternativeOutfits: [] as ClosetItem[][], extraItems: [] as ClosetItem[], reasons: [] as string[],
    missingInfo: [] as string[], missingBaseCategories: ['상의', '하의', '신발'] as Category[],
    temperatureDrop: 0, rainy: false, suitable: false,
  }
  if (!ordered.length) return empty

  const temperatures = ordered.map((point) => point.apparentTemperature)
  const firstFeelsLike = temperatures[0]
  const minimumFeelsLike = Math.min(...temperatures)
  const temperatureDrop = Math.max(0, firstFeelsLike - minimumFeelsLike)
  const coldestFeelsLike = minimumFeelsLike
  const rainy = ordered.some((point) =>
    point.precipitationProbability >= outingRecommendationRules.rainProbability
    || point.precipitation >= outingRecommendationRules.measurableRainMm,
  )
  const hasWarmthData = closet.some((item) => item.warmth && item.warmth !== '미설정')
  const warmEnough = (item: ClosetItem) =>
    item.warmth === '따뜻함' || item.weatherTags.includes('방한') || item.weatherTags.includes('보온')
  const lightEnough = (item: ClosetItem) => item.warmth === '얇음' || item.warmth === '보통'
  const isCold = coldestFeelsLike <= outingRecommendationRules.maxFeelsLikeForCold
  const dropsSignificantly = temperatureDrop >= outingRecommendationRules.notableTemperatureDrop

  const baseCategories: Category[] = ['상의', '하의', '신발']
  const purposeStyles: Record<typeof purpose, string[]> = {
    일상: [],
    데이트: ['로맨틱', '클래식'],
    여행: ['캐주얼', '스포티'],
    '야외 활동': ['스포티', '캐주얼'],
  }
  const baseItems = baseCategories.flatMap((category) => {
    const candidates = closet.filter((item) => item.category === category).slice().sort((a, b) => a.id.localeCompare(b.id))
    const preferredStyles = purposeStyles[purpose]
    return [
      candidates.find((item) => preferredStyles.includes(item.style)) ?? candidates[0],
    ].filter((item): item is ClosetItem => Boolean(item))
  })
  const candidatesByCategory = baseCategories
    .map((category) => closet.filter((item) => item.category === category).slice().sort((a, b) => a.id.localeCompare(b.id)))
    .filter((items) => items.length > 0)
  const combinations = candidatesByCategory.reduce<ClosetItem[][]>(
    (current, candidates) => current.flatMap((combo) => candidates.map((item) => [...combo, item])),
    [[]],
  )
  const baseSignature = baseItems.map((item) => item.id).join('|')
  const alternativeOutfits = combinations
    .filter((combo) => combo.length > 0 && combo.map((item) => item.id).join('|') !== baseSignature)
    .slice(0, 3)
  const missingBaseCategories = baseCategories.filter((category) => !baseItems.some((item) => item.category === category))
  const extraItems: ClosetItem[] = []
  const reasons: string[] = []
  const missingInfo: string[] = []

  if (coldestFeelsLike >= outingRecommendationRules.maxFeelsLikeForWarm && baseItems.length) {
    reasons.push('외출 시간 동안 체감온도가 비교적 온화해 기본 옷차림으로 움직이기 좋아요.')
    const removableOuter = closet.filter((item) => item.category === '아우터' && lightEnough(item))
    extraItems.push(...removableOuter)
    if (!hasWarmthData && closet.some((item) => item.category === '아우터')) {
      missingInfo.push('아우터의 보온 정보가 없어 더울지 여부는 판단하지 않았어요.')
    }
  } else if (isCold || dropsSignificantly) {
    if (temperatureDrop >= 7) reasons.push(`외출 중 체감온도가 약 ${Math.round(temperatureDrop)}°C 내려갈 수 있어요.`)
    else reasons.push(`외출 중 가장 낮은 체감온도가 약 ${Math.round(coldestFeelsLike)}°C로 예상돼요.`)
    const warmItems = closet.filter((item) => item.category === '아우터' && warmEnough(item))
    extraItems.push(...warmItems)
    const unknownOuter = closet.filter((item) => item.category === '아우터' && (!item.warmth || item.warmth === '미설정') && !item.weatherTags.some((tag) => tag === '방한' || tag === '보온'))
    if (unknownOuter.length) missingInfo.push('보온 정보가 미설정된 아우터는 보온용으로 추천하지 않았어요.')
    const warmAccessories = closet.filter((item) => item.category === '기타' && item.weatherTags.includes('방한'))
    extraItems.push(...warmAccessories)
    if (!warmItems.length && !warmAccessories.length) {
      reasons.push('옷장에 보온·방한 정보가 등록된 아우터나 소품이 없어요.')
    }
  } else {
    reasons.push('외출 시간대에 큰 기온 하락은 예상되지 않아 옷장에서 기본 조합을 골랐어요.')
  }

  const chosenPurposeStyle = purposeStyles[purpose].find((style) => baseItems.some((item) => item.style === style))
  if (chosenPurposeStyle) reasons.push(`${purpose} 목적에 맞춰 등록된 ${chosenPurposeStyle} 스타일을 우선 골랐어요.`)

  if (rainy) {
    reasons.push('외출 시간 중 비가 예상돼요. 등록된 우산이나 방수 아이템을 함께 확인해 보세요.')
    extraItems.push(...closet.filter((item) => item.weatherTags.includes('우산') || item.weatherTags.includes('방수')))
  }

  const uniqueExtra = [...new Map(extraItems.map((item) => [item.id, item])).values()]
  const suitable = baseItems.length > 0
  if (missingBaseCategories.length) reasons.push(`기본 구성 중 ${missingBaseCategories.join('·')}이(가) 옷장에 없어요.`)
  if (!suitable) reasons.push('현재 옷장에서 외출 코디로 구성할 아이템을 찾지 못했어요.')

  return {
    baseItems: baseItems.slice(0, 3),
    alternativeOutfits,
    extraItems: uniqueExtra,
    missingBaseCategories,
    reasons,
    missingInfo,
    temperatureDrop,
    rainy,
    suitable,
  }
}
