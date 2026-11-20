import topsOuterwearSheet from '../../ai-images/closet-tops-outerwear.png'
import bottomsShoesSheet from '../../ai-images/closet-bottoms-shoes-a.png'
import shoesAccessoriesSheet from '../../ai-images/closet-shoes-accessories.png'
import trenchCoatImage from '../../ai-images/closet-trench-coat.png'

export type SampleImage = { src: string; position?: string; mode: 'sprite' | 'contain' }

const sheets = {
  tops: topsOuterwearSheet,
  bottoms: bottomsShoesSheet,
  accessories: shoesAccessoriesSheet,
}

const cells: Record<string, { sheet: keyof typeof sheets; column: number; row: number }> = {
  'sample-shirt': { sheet: 'tops', column: 0, row: 0 },
  'sample-stripe': { sheet: 'tops', column: 1, row: 0 },
  'sample-knit': { sheet: 'tops', column: 2, row: 0 },
  'sample-sweat': { sheet: 'tops', column: 0, row: 1 },
  'sample-jacket': { sheet: 'tops', column: 1, row: 1 },
  'sample-cardigan': { sheet: 'tops', column: 2, row: 1 },
  'sample-black-pants': { sheet: 'bottoms', column: 0, row: 0 },
  'sample-denim': { sheet: 'bottoms', column: 1, row: 0 },
  'sample-wide': { sheet: 'bottoms', column: 2, row: 0 },
  'sample-cotton': { sheet: 'bottoms', column: 0, row: 1 },
  'sample-loafers': { sheet: 'bottoms', column: 1, row: 1 },
  'sample-sneakers': { sheet: 'bottoms', column: 2, row: 1 },
  'sample-suede': { sheet: 'accessories', column: 0, row: 0 },
  'sample-boots': { sheet: 'accessories', column: 1, row: 0 },
  'sample-scarf': { sheet: 'accessories', column: 2, row: 0 },
  'sample-gloves': { sheet: 'accessories', column: 0, row: 1 },
  'sample-umbrella': { sheet: 'accessories', column: 1, row: 1 },
}

export const sampleGarmentIds = [
  'sample-shirt', 'sample-stripe', 'sample-knit', 'sample-sweat',
  'sample-black-pants', 'sample-denim', 'sample-wide', 'sample-cotton',
  'sample-jacket', 'sample-cardigan', 'sample-trench',
  'sample-loafers', 'sample-sneakers', 'sample-suede', 'sample-boots',
  'sample-scarf', 'sample-gloves', 'sample-umbrella',
] as const

export function getSampleImage(itemId: string): SampleImage | undefined {
  const id = itemId.replace(/^demo-/, '')
  if (id === 'sample-trench') return { src: trenchCoatImage, mode: 'contain' }
  const cell = cells[id]
  if (!cell) return undefined
  return {
    src: sheets[cell.sheet],
    position: `${cell.column * 50}% ${cell.row * 100}%`,
    mode: 'sprite',
  }
}
