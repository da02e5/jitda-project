import { describe, expect, it } from 'vitest'
import { getSampleImage, sampleGarmentIds } from './sampleImages'

describe('sample garment images', () => {
  it('maps all 18 unchanged sample IDs to a distinct product crop or image file', () => {
    const images = sampleGarmentIds.map((id) => [id, getSampleImage(id)] as const)
    expect(images).toHaveLength(18)
    expect(images.every(([, image]) => Boolean(image?.src))).toBe(true)
    expect(new Set(images.map(([, image]) => `${image?.src}|${image?.position ?? 'single'}`)).size).toBe(18)
  })

  it('maps the scarf to its scarf cell rather than a top/clothing silhouette', () => {
    const scarf = getSampleImage('demo-sample-scarf')
    expect(scarf?.src).toContain('closet-shoes-accessories')
    expect(scarf?.position).toBe('100% 0%')
  })

  it('maps the trench to its own bundled product image', () => {
    expect(getSampleImage('sample-trench')?.src).toContain('closet-trench-coat')
  })
})
