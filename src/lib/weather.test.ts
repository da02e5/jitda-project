import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchHourlyForecast, fetchTodayWeather, makeDemoForecast, WEATHER_TIMEZONE } from './weather'

afterEach(() => vi.unstubAllGlobals())

describe('weather data', () => {
  it('provides clearly selectable warm, temperature-drop, rain, and warmth-missing scenarios', () => {
    const date = '2026-06-10'
    const warm = makeDemoForecast(date, '따뜻한 날')
    const drop = makeDemoForecast(date, '귀가 때 기온 하락')
    const rain = makeDemoForecast(date, '비 예보')
    const warmthMissing = makeDemoForecast(date, '보온 정보 부족')
    expect(warm).toHaveLength(24)
    expect(drop[20].apparentTemperature).toBeLessThan(drop[9].apparentTemperature - 7)
    expect(rain.some((hour) => hour.precipitationProbability >= 70 && hour.precipitation > 0)).toBe(true)
    expect(warmthMissing[20].apparentTemperature).toBeLessThan(warmthMissing[9].apparentTemperature - 7)
  })

  it('simulates API failure as an explicit demo case', () => {
    expect(() => makeDemoForecast('2026-06-10', 'API 조회 실패')).toThrow('시연용 API 오류')
  })

  it('requests hourly Open-Meteo fields and reports HTTP failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false })
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchHourlyForecast(37.5, 127, '2026-06-10')).rejects.toThrow('날씨 API 요청에 실패했습니다.')
    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]))
    expect(requestUrl.origin + requestUrl.pathname).toBe('https://api.open-meteo.com/v1/forecast')
    expect(requestUrl.searchParams.get('start_date')).toBe('2026-06-10')
    expect(requestUrl.searchParams.has('forecast_days')).toBe(false)
    expect(requestUrl.searchParams.get('timezone')).toBe('Asia/Seoul')
  })

  it('normalizes valid hourly API response fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hourly: {
        time: ['2026-06-10T09:00'], temperature_2m: [19], apparent_temperature: [18],
        precipitation_probability: [20], precipitation: [0], weather_code: [1],
      } }),
    }))
    await expect(fetchHourlyForecast(37.5, 127, '2026-06-10')).resolves.toEqual([{
      time: '2026-06-10T09:00', temperature: 19, apparentTemperature: 18,
      precipitationProbability: 20, precipitation: 0, weatherCode: 1,
    }])
  })

  it('requests exact city coordinates and maps current, daily extrema and the current-hour rain probability', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: { time: '2026-11-20T09:00', temperature_2m: 0 },
        daily: { time: ['2026-11-20'], temperature_2m_max: [1], temperature_2m_min: [-3] },
        hourly: {
          time: ['2026-11-20T08:00', '2026-11-20T09:00', '2026-11-20T10:00'],
          precipitation_probability: [25, 0, 80],
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchTodayWeather(37.5665, 126.978)).resolves.toEqual({
      date: '2026-11-20', time: '2026-11-20T09:00', temperature: 0,
      high: 1, low: -3, precipitationProbability: 0, precipitationTime: '09:00',
    })
    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]))
    expect(requestUrl.searchParams.get('latitude')).toBe('37.5665')
    expect(requestUrl.searchParams.get('longitude')).toBe('126.978')
    expect(requestUrl.searchParams.get('timezone')).toBe(WEATHER_TIMEZONE)
    expect(requestUrl.searchParams.get('current')).toBe('temperature_2m')
    expect(requestUrl.searchParams.get('daily')).toBe('temperature_2m_max,temperature_2m_min')
  })

  it('does not replace missing current or daily weather values with zero', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: { time: '2026-11-20T09:00' },
        daily: { time: ['2026-11-20'], temperature_2m_max: [1], temperature_2m_min: [-3] },
        hourly: { time: ['2026-11-20T09:00'], precipitation_probability: [0] },
      }),
    }))
    await expect(fetchTodayWeather(37.5665, 126.978)).rejects.toThrow('현재·일별·시간별 날씨 정보가 충분하지 않습니다.')
  })
})
