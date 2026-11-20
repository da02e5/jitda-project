import type { HourlyForecast } from './recommendation'

export type City = { name: string; latitude: number; longitude: number }
export const WEATHER_TIMEZONE = 'Asia/Seoul'

export const domesticCities: City[] = [
  { name: '서울', latitude: 37.5665, longitude: 126.978 },
  { name: '부산', latitude: 35.1796, longitude: 129.0756 },
  { name: '인천', latitude: 37.4563, longitude: 126.7052 },
  { name: '대구', latitude: 35.8714, longitude: 128.6014 },
  { name: '대전', latitude: 36.3504, longitude: 127.3845 },
  { name: '광주', latitude: 35.1595, longitude: 126.8526 },
  { name: '울산', latitude: 35.5384, longitude: 129.3114 },
  { name: '세종', latitude: 36.4801, longitude: 127.289 },
  { name: '제주', latitude: 33.4996, longitude: 126.5312 },
  { name: '강릉', latitude: 37.7519, longitude: 128.8761 },
  { name: '전주', latitude: 35.8242, longitude: 127.148 },
]

type OpenMeteoResponse = {
  current?: { time?: string; temperature_2m?: number }
  daily?: { time?: string[]; temperature_2m_max?: number[]; temperature_2m_min?: number[] }
  hourly?: {
    time?: string[]
    temperature_2m?: number[]
    apparent_temperature?: number[]
    precipitation_probability?: number[]
    precipitation?: number[]
    weather_code?: number[]
  }
}

export type TodayWeather = {
  date: string
  time: string
  temperature: number
  high: number
  low: number
  precipitationProbability: number
  precipitationTime: string
}

async function requestOpenMeteo(params: URLSearchParams): Promise<OpenMeteoResponse> {
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!response.ok) throw new Error(`날씨 API 요청에 실패했습니다. (HTTP ${response.status ?? 'unknown'})`)
  return await response.json() as OpenMeteoResponse
}

export async function fetchTodayWeather(latitude: number, longitude: number): Promise<TodayWeather> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m',
    daily: 'temperature_2m_max,temperature_2m_min',
    hourly: 'precipitation_probability',
    forecast_days: '1',
    timezone: WEATHER_TIMEZONE,
  })
  const data = await requestOpenMeteo(params)
  const time = data.current?.time
  const temperature = data.current?.temperature_2m
  const date = data.daily?.time?.[0]
  const high = data.daily?.temperature_2m_max?.[0]
  const low = data.daily?.temperature_2m_min?.[0]
  const hourlyTimes = data.hourly?.time
  const probabilities = data.hourly?.precipitation_probability
  if (!time || !date || !Number.isFinite(temperature) || !Number.isFinite(high) || !Number.isFinite(low) || !hourlyTimes || !probabilities) {
    throw new Error('현재·일별·시간별 날씨 정보가 충분하지 않습니다.')
  }
  const dateHourlyTimes = hourlyTimes.filter((hour) => hour.startsWith(date))
  const currentHour = `${time.slice(0, 13)}:00`
  const currentHourIndex = dateHourlyTimes.indexOf(currentHour)
  const probability = currentHourIndex >= 0 ? probabilities[hourlyTimes.indexOf(currentHour)] : undefined
  if (!Number.isFinite(probability)) throw new Error('현재 시간의 강수확률을 확인할 수 없습니다.')
  return {
    date,
    time,
    temperature: temperature!,
    high: high!,
    low: low!,
    precipitationProbability: probability!,
    precipitationTime: currentHour.slice(11, 16),
  }
}

export async function fetchHourlyForecast(
  latitude: number,
  longitude: number,
  date: string,
): Promise<HourlyForecast[]> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code',
    start_date: date,
    end_date: date,
    timezone: 'auto',
  })
  params.set('timezone', WEATHER_TIMEZONE)
  const data = await requestOpenMeteo(params)
  const hourly = data.hourly
  const times = hourly?.time
  const temperatures = hourly?.temperature_2m
  const apparent = hourly?.apparent_temperature
  const probabilities = hourly?.precipitation_probability
  const precipitation = hourly?.precipitation
  const codes = hourly?.weather_code
  if (!times?.length || !temperatures || !apparent || !probabilities || !precipitation || !codes) {
    throw new Error('시간별 예보 데이터가 충분하지 않습니다.')
  }
  return times.map((time, index) => ({
    time,
    temperature: temperatures[index],
    apparentTemperature: apparent[index],
    precipitationProbability: probabilities[index],
    precipitation: precipitation[index],
    weatherCode: codes[index],
  })).filter((point) =>
    Number.isFinite(point.temperature)
    && Number.isFinite(point.apparentTemperature)
    && Number.isFinite(point.precipitationProbability)
    && Number.isFinite(point.precipitation)
    && Number.isFinite(point.weatherCode),
  )
}

export type DemoWeatherScenario = '따뜻한 날' | '귀가 때 기온 하락' | '비 예보' | '보온 정보 부족' | '적합한 옷 없음' | 'API 조회 실패'

export function makeDemoForecast(date: string, scenario: DemoWeatherScenario, hours = 24): HourlyForecast[] {
  if (scenario === 'API 조회 실패') throw new Error('시연용 API 오류')
  const startDate = new Date(`${date}T12:00:00`)
  return Array.from({ length: hours }, (_, index) => {
    const hour = index % 24
    const pointDate = new Date(startDate)
    pointDate.setDate(pointDate.getDate() + Math.floor(index / 24))
    const pointDateLabel = localDateString(pointDate)
    let temperature = 20
    let apparentTemperature = 19
    let precipitationProbability = 5
    let precipitation = 0
    let weatherCode = 1
    if (scenario === '따뜻한 날') {
      temperature = 22 - Math.abs(hour - 14) * 0.2
      apparentTemperature = temperature - 1
    } else if (scenario === '귀가 때 기온 하락') {
      temperature = hour < 15 ? 19 : 19 - (hour - 15) * 1.7
      apparentTemperature = temperature - 2
    } else if (scenario === '비 예보') {
      temperature = 17 - Math.abs(hour - 15) * 0.18
      apparentTemperature = temperature - 1
      precipitationProbability = hour >= 14 && hour <= 20 ? 75 : 10
      precipitation = hour >= 14 && hour <= 20 ? 0.7 : 0
      weatherCode = precipitation ? 61 : 3
    } else if (scenario === '보온 정보 부족') {
      temperature = hour < 15 ? 13 : 7 - Math.max(0, hour - 17) * 0.8
      apparentTemperature = temperature - 1
    }
    return {
      time: `${pointDateLabel}T${String(hour).padStart(2, '0')}:00`,
      temperature: Math.round(temperature * 10) / 10,
      apparentTemperature: Math.round(apparentTemperature * 10) / 10,
      precipitationProbability,
      precipitation,
      weatherCode,
    }
  })
}

function localDateString(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}
