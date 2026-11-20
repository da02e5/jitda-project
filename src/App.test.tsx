// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { loadReferenceImage } from './lib/imageStore'

const STORAGE_KEY = 'my-closet-mvp-v1'

beforeEach(() => {
  localStorage.clear()
  URL.createObjectURL = vi.fn(() => 'blob:test-image')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
})

describe('main app flows', () => {
  it('starts with an empty closet and offers the sample wardrobe as an explicit action', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: '오늘 뭐 입지?' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /내 옷장 0/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: '샘플 옷장으로 체험하기' })).toBeTruthy()
  })

  it('adds the demo wardrobe without overwriting existing user items', async () => {
    const user = userEvent.setup()
    const existing = { id: 'mine', name: '내 셔츠', category: '상의', color: '블루', style: '클래식', weatherTags: [] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ closet: [existing], skippedIntro: true, demoCloset: false }))
    render(<App />)
    await user.click(screen.getByRole('button', { name: /내 옷장 1/ }))
    await user.click(screen.getByRole('button', { name: '샘플 옷장으로 체험하기' }))
    await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).closet).toHaveLength(19))
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.closet[0]).toEqual(existing)
    expect(stored.closet.some((item: { id: string }) => item.id === 'demo-sample-shirt')).toBe(true)
  })

  it('clearly marks a selected catalog item and persists adding it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /내 옷장 관리/ }))
    await user.click(screen.getByRole('button', { name: '옷 추가하기' }))
    expect(document.querySelectorAll('.catalog-art .product-sprite')).toHaveLength(18)
    const shirt = screen.getByRole('button', { name: /코튼 셔츠.*상의.*화이트/ })
    expect(shirt.getAttribute('aria-pressed')).toBe('false')
    await user.click(shirt)
    await waitFor(() => expect(screen.getByRole('button', { name: /코튼 셔츠.*상의.*화이트/ }).getAttribute('aria-pressed')).toBe('true'))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).closet[0].id).toBe('sample-shirt')
  })

  it('prefers a stored user image and replaces the known legacy catalog photo with its corrected product sprite', async () => {
    const userImage = 'blob:my-uploaded-shirt'
    const legacyCatalogUrl = 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=640&q=80'
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      closet: [
        { id: 'sample-shirt', name: '코튼 셔츠', category: '상의', color: '화이트', style: '미니멀', weatherTags: [], imageUrl: legacyCatalogUrl },
        { id: 'my-uploaded-coat', name: '내 코트', category: '아우터', color: '블랙', style: '클래식', weatherTags: [], imageUrl: userImage },
      ],
      skippedIntro: true,
      demoCloset: false,
    }))
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.click(screen.getByRole('button', { name: /내 옷장 2/ }))
    const garmentCards = container.querySelectorAll('.closet-card')
    expect(garmentCards[0].querySelector('.product-sprite')).toBeTruthy()
    expect(garmentCards[0].querySelector('.clothing-photo')).toBeNull()
    expect((garmentCards[1].querySelector('.clothing-photo') as HTMLImageElement).src).toBe(userImage)
  })

  it('uploads a reference image, saves its observed garments and shows wardrobe comparisons', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '샘플 옷장으로 체험하기' }))
    await user.click(screen.getByRole('button', { name: '참고 이미지 추가' }))

    const file = new File(['image fixture'], 'street-look.webp', { type: 'image/webp' })
    const upload = document.querySelector<HTMLInputElement>('input[type="file"]')!
    await user.upload(upload, file)
    await user.clear(screen.getByLabelText('코디 이름 (선택)'))
    await user.type(screen.getByLabelText('코디 이름 (선택)'), '퇴근길 코디')
    await user.click(screen.getByRole('button', { name: '구성 항목 추가' }))
    await user.click(screen.getByRole('button', { name: '참고 코디 저장' }))
    expect(await screen.findByRole('heading', { name: '퇴근길 코디' })).toBeTruthy()
    expect(screen.getByText(/같은 색 계열|같은 카테고리|같은 스타일/)).toBeTruthy()
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.references).toHaveLength(1)
    expect(stored.references[0].garments).toHaveLength(1)
    const blob = await loadReferenceImage(stored.references[0].imageKey)
    expect(blob).toBeTruthy()
  })

  it('rejects an unsupported reference image type', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '참고 이미지 추가' }))
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' })
    const upload = document.querySelector<HTMLInputElement>('input[type="file"]')!
    fireEvent.change(upload, { target: { files: [file] } })
    expect(await screen.findByText('PNG, JPG, WEBP 이미지 파일만 업로드할 수 있어요.')).toBeTruthy()
  })

  it('shows actual current/daily/rain fields with the selected city and refreshes the request when city changes', async () => {
    const user = userEvent.setup()
    const dateParts = new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date())
    const date = `${dateParts.find((part) => part.type === 'year')?.value}-${dateParts.find((part) => part.type === 'month')?.value}-${dateParts.find((part) => part.type === 'day')?.value}`
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: { time: `${date}T10:30`, temperature_2m: 0.3 },
        daily: { time: [date], temperature_2m_max: [1.4], temperature_2m_min: [-3.1] },
        hourly: { time: [`${date}T10:00`], precipitation_probability: [0] },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const summary = await screen.findByText('0.3°')
    expect(summary).toBeTruthy()
    expect(screen.getByText(/서울 · .* · 현재 시각 기준/)).toBeTruthy()
    expect(screen.getByText(/최저 -3.1° \/ 최고 1.4°/)).toBeTruthy()
    expect(screen.getByText(/현재 시간대\(10시\) 강수확률 0%/)).toBeTruthy()
    expect(screen.getByText('날씨 출처 · Open-Meteo')).toBeTruthy()

    fireEvent.click(document.querySelector('.outing-settings summary')!)
    await user.selectOptions(screen.getByRole('combobox', { name: /외출 지역/ }), '부산')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const secondUrl = new URL(String(fetchMock.mock.calls[1][0]))
    expect(secondUrl.searchParams.get('latitude')).toBe('35.1796')
    expect(secondUrl.searchParams.get('longitude')).toBe('129.0756')
    expect(await screen.findByText(/부산 · .* · 현재 시각 기준/)).toBeTruthy()
  })

  it('shows a weather-unavailable message instead of substituting zero after an API failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(<App />)
    expect(await screen.findByText('날씨 정보를 불러올 수 없어요')).toBeTruthy()
    expect(document.querySelector('.today-weather-summary')?.textContent).not.toContain('0°')
  })
})
