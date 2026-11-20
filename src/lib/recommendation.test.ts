import { describe, expect, it } from 'vitest'
import { getWeatherAdvice, matchOutfits, matchReferenceGarments, mergeDemoClosetItems, recommendForOuting, selectOutingForecast, type ClosetItem, type HourlyForecast, type ReferenceOutfit } from './recommendation'

const outfit: ReferenceOutfit = {
  id: 'test-look',
  title: '테스트 코디',
  note: '',
  pieces: [
    { category: '상의', name: '셔츠', color: '화이트', style: '미니멀', role: '필수' },
    { category: '하의', name: '팬츠', color: '블랙', style: '캐주얼', role: '필수' },
    { category: '아우터', name: '재킷', color: '그레이', style: '클래식', role: '추천' },
  ],
}

const shirt: ClosetItem = {
  id: 'shirt-1', name: '화이트 셔츠', category: '상의', color: '화이트', style: '미니멀', weatherTags: [],
}
const pants: ClosetItem = {
  id: 'pants-1', name: '블랙 팬츠', category: '하의', color: '블랙', style: '캐주얼', weatherTags: [],
}

describe('matchOutfits', () => {
  it('필수 구성을 모두 가진 경우 코디 가능으로 표시한다', () => {
    const [match] = matchOutfits([shirt, pants], [outfit])
    expect(match.isComplete).toBe(true)
    expect(match.missingRequired).toHaveLength(0)
  })

  it('일부 필수 구성이 없으면 부족한 아이템만 반환한다', () => {
    const [match] = matchOutfits([shirt], [outfit])
    expect(match.isComplete).toBe(false)
    expect(match.missingRequired.map((piece) => piece.category)).toEqual(['하의'])
  })

  it('매칭할 옷이 없으면 모든 필수 구성을 부족 항목으로 반환한다', () => {
    const [match] = matchOutfits([], [outfit])
    expect(match.isComplete).toBe(false)
    expect(match.missingRequired).toHaveLength(2)
    expect(match.pieces.every((piece) => piece.owned.length === 0)).toBe(true)
  })

  it('빈 옷장에서도 오류 없이 코디 정보를 반환한다', () => {
    expect(matchOutfits([], [outfit])).toHaveLength(1)
  })

  it('아이템 추가와 삭제가 결과를 바꾼다', () => {
    expect(matchOutfits([shirt], [outfit])[0].missingRequired).toHaveLength(1)
    expect(matchOutfits([shirt, pants], [outfit])[0].missingRequired).toHaveLength(0)
    expect(matchOutfits([shirt], [outfit])[0].missingRequired).toHaveLength(1)
  })

  it('같은 입력은 같은 결과 순서를 반환한다', () => {
    const first = matchOutfits([pants, shirt], [outfit])
    const second = matchOutfits([shirt, pants], [outfit])
    expect(first).toEqual(second)
  })

  it('색 계열과 스타일이 맞으면 평가 점수 대신 이유를 설명한다', () => {
    const [match] = matchOutfits([shirt, pants], [outfit])
    expect(match.pieces[0].reason).toContain('색 계열과 스타일')
  })

  it('기타 분류의 다른 소품을 우산으로 잘못 매칭하지 않는다', () => {
    const belt: ClosetItem = { id: 'belt', name: '가죽 벨트', category: '기타', customCategory: '벨트', color: '브라운', style: '클래식', weatherTags: [] }
    const umbrella: ClosetItem = { id: 'umbrella', name: '접이식 우산', category: '기타', customCategory: '우산', color: '블랙', style: '베이직', weatherTags: ['우산'] }
    const rainLook = {
      id: 'rain', title: '비 오는 날', note: '',
      pieces: [{ category: '기타' as const, name: '접이식 우산', color: '블랙', style: '베이직', role: '추천' as const }],
    }
    expect(matchOutfits([belt], [rainLook])[0].pieces[0].owned).toEqual([])
    expect(matchOutfits([umbrella], [rainLook])[0].pieces[0].owned).toEqual([umbrella])
  })
})

describe('getWeatherAdvice', () => {
  it('영하일 때 방한·보온 태그가 있는 옷만 안내한다', () => {
    const gloves: ClosetItem = { id: 'gloves', name: '울 장갑', category: '기타', customCategory: '장갑', color: '브라운', style: '베이직', weatherTags: ['방한'] }
    const [advice] = getWeatherAdvice({ temperature: -2, apparentTemperature: -4, precipitationProbability: 0, nextThreeHourPrecipitation: 0, weatherCode: 0 }, [gloves, shirt])
    expect(advice.kind).toBe('cold')
    expect(advice.items.map((item) => item.id)).toEqual(['gloves'])
  })

  it('강수 예보가 있을 때 강수량에 따라 강한 비 안내를 구분한다', () => {
    const [advice] = getWeatherAdvice({ temperature: 12, apparentTemperature: 12, precipitationProbability: 80, nextThreeHourPrecipitation: 12, weatherCode: 3 }, [])
    expect(advice.kind).toBe('heavy-rain')
  })

  it('기온이 0도이고 체감온도가 0도면 영하라고 표시하지 않는다', () => {
    const [advice] = getWeatherAdvice({ temperature: 0, apparentTemperature: 0, precipitationProbability: 0, nextThreeHourPrecipitation: 0, weatherCode: 0 }, [])
    expect(advice.title).toBe('체감온도가 0°C 이하예요')
  })
})

const hourly: HourlyForecast[] = [
  { time: '2026-06-10T09:00', temperature: 20, apparentTemperature: 19, precipitationProbability: 0, precipitation: 0, weatherCode: 1 },
  { time: '2026-06-10T12:00', temperature: 22, apparentTemperature: 21, precipitationProbability: 0, precipitation: 0, weatherCode: 1 },
  { time: '2026-06-10T18:00', temperature: 11, apparentTemperature: 9, precipitationProbability: 70, precipitation: 1.2, weatherCode: 61 },
]

describe('outing weather recommendation', () => {
  it('출발과 귀가 시각 구간에 포함되는 시간별 데이터만 고른다', () => {
    expect(selectOutingForecast(hourly, '10:00', '18:30').map((point) => point.time)).toEqual([
      '2026-06-10T12:00', '2026-06-10T18:00',
    ])
  })

  it('귀가 전 기온이 크게 내려가면 실제 보온 아이템을 추가 준비물로 고른다', () => {
    const jacket: ClosetItem = { id: 'warm-coat', name: '따뜻한 코트', category: '아우터', color: '브라운', style: '클래식', warmth: '따뜻함', weatherTags: [] }
    const result = recommendForOuting([shirt, pants, jacket], hourly)
    expect(result.temperatureDrop).toBe(10)
    expect(result.extraItems.map((item) => item.id)).toContain('warm-coat')
    expect(result.rainy).toBe(true)
  })

  it('보온 미설정 옷은 추운 날씨에 보온 아이템인 것처럼 추천하지 않는다', () => {
    const unknownCoat: ClosetItem = { id: 'unknown-coat', name: '코트', category: '아우터', color: '블랙', style: '클래식', warmth: '미설정', weatherTags: [] }
    const cold = hourly.map((point) => ({ ...point, apparentTemperature: 2, precipitationProbability: 0, precipitation: 0 }))
    const result = recommendForOuting([shirt, pants, unknownCoat], cold)
    expect(result.extraItems).toEqual([])
    expect(result.missingInfo).toContain('보온 정보가 미설정된 아우터는 보온용으로 추천하지 않았어요.')
  })

  it('비 예보일 때 옷장의 우산·방수 아이템만 추가한다', () => {
    const umbrella: ClosetItem = { id: 'umbrella', name: '접이식 우산', category: '기타', color: '블랙', style: '베이직', weatherTags: ['우산'] }
    const waterproof: ClosetItem = { id: 'raincoat', name: '방수 코트', category: '아우터', color: '카키', style: '캐주얼', weatherTags: ['방수'] }
    const result = recommendForOuting([shirt, pants, umbrella, waterproof], hourly)
    expect(result.rainy).toBe(true)
    expect(result.extraItems.map((item) => item.id).sort()).toEqual(['raincoat', 'umbrella'])
  })

  it('적합한 옷이 없는 빈 옷장은 임의의 아이템을 만들지 않는다', () => {
    const result = recommendForOuting([], hourly)
    expect(result.suitable).toBe(false)
    expect(result.baseItems).toEqual([])
    expect(result.extraItems).toEqual([])
  })

  it('외출 시간 순서가 잘못되면 빈 예보 구간을 반환한다', () => {
    expect(selectOutingForecast(hourly, '20:00', '09:00')).toEqual([])
  })

  it('날짜를 지정하면 출발 당일에서 다음 날 귀가까지 예보를 이어서 선택한다', () => {
    const twoDays = [
      { ...hourly[0], time: '2026-06-10T22:00' },
      { ...hourly[1], time: '2026-06-10T23:00' },
      { ...hourly[2], time: '2026-06-11T00:00' },
      { ...hourly[2], time: '2026-06-11T01:00' },
      { ...hourly[2], time: '2026-06-11T02:00' },
    ]
    expect(selectOutingForecast(twoDays, '22:00', '02:00', '2026-06-10').map((point) => point.time)).toEqual(twoDays.map((point) => point.time))
  })

  it('같은 날짜 지정 시 시간 역순은 다음 날까지의 구간으로 처리한다', () => {
    const twoDays = [
      { ...hourly[0], time: '2026-06-10T08:00' },
      { ...hourly[1], time: '2026-06-10T22:00' },
      { ...hourly[2], time: '2026-06-11T01:00' },
      { ...hourly[2], time: '2026-06-11T06:00' },
    ]
    expect(selectOutingForecast(twoDays, '22:00', '02:00', '2026-06-10').map((point) => point.time)).toEqual(twoDays.slice(1, 3).map((point) => point.time))
  })

  it('외출 목적 스타일 선호와 대체 가능한 기본 아이템 순서가 결정적이다', () => {
    const casualTop: ClosetItem = { id: 'top-a', name: '티셔츠', category: '상의', color: '화이트', style: '캐주얼', weatherTags: [] }
    const dateTop: ClosetItem = { id: 'top-b', name: '블라우스', category: '상의', color: '핑크', style: '로맨틱', weatherTags: [] }
    const dateLook = recommendForOuting([casualTop, dateTop, pants], hourly, '데이트')
    expect(dateLook.baseItems.find((item) => item.category === '상의')?.id).toBe('top-b')
    expect(dateLook.reasons).toContain('데이트 목적에 맞춰 등록된 로맨틱 스타일을 우선 골랐어요.')
  })

  it('실제 옷장 데이터를 덮어쓰지 않고 중복 없는 샘플 아이템만 병합한다', () => {
    const userItem: ClosetItem = { id: 'mine', name: '내 셔츠', category: '상의', color: '블루', style: '클래식', weatherTags: [] }
    const demo = { ...shirt, id: 'sample-shirt' }
    const first = mergeDemoClosetItems([userItem], [demo])
    const second = mergeDemoClosetItems(first, [demo])
    expect(first[0]).toEqual(userItem)
    expect(first[1].id).toBe('demo-sample-shirt')
    expect(second).toEqual(first)
    expect(mergeDemoClosetItems([], [demo])).toHaveLength(1)
  })

  it('여러 조합이 있으면 선택한 기본 조합 외에 결정적 대안을 반환한다', () => {
    const otherTop: ClosetItem = { id: 'top-2', name: '니트', category: '상의', color: '베이지', style: '클래식', weatherTags: [] }
    const otherPants: ClosetItem = { id: 'pants-2', name: '데님', category: '하의', color: '블루', style: '캐주얼', weatherTags: [] }
    const result = recommendForOuting([shirt, otherTop, pants, otherPants], hourly)
    expect(result.baseItems.map((item) => item.id)).toEqual(['shirt-1', 'pants-1'])
    expect(result.alternativeOutfits).toHaveLength(3)
    expect(result.alternativeOutfits[0].map((item) => item.id)).toEqual(['shirt-1', 'pants-2'])
  })
})

describe('matchReferenceGarments', () => {
  it('수동 입력한 참고 항목을 카테고리, 색 계열, 스타일로 정렬하고 없는 옷은 표시한다', () => {
    const garments = [{ id: 'ref-top', category: '상의' as const, color: '오프화이트', style: '미니멀' }]
    const similar: ClosetItem = { id: 'similar', name: '아이보리 셔츠', category: '상의', color: '화이트', style: '미니멀', weatherTags: [] }
    const other: ClosetItem = { id: 'other', name: '검정 티', category: '상의', color: '블랙', style: '스트릿', weatherTags: [] }
    const [result] = matchReferenceGarments(garments, [other, similar])
    expect(result.candidates.map((item) => item.id)).toEqual(['similar', 'other'])
    expect(result.reason).toContain('같은 색 계열과 스타일')
    expect(matchReferenceGarments([{ ...garments[0], category: '신발' }], [similar])[0].candidates).toEqual([])
  })

  it('같은 입력은 동일한 후보 순서와 근거를 반환한다', () => {
    const garments = [{ id: 'ref-bottom', category: '하의' as const, color: '블랙', style: '클래식' }]
    expect(matchReferenceGarments(garments, [pants, { ...pants, id: 'pants-2' }])).toEqual(
      matchReferenceGarments(garments, [{ ...pants, id: 'pants-2' }, pants]),
    )
  })
})
