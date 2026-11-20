import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { deleteReferenceImage, loadReferenceImage, saveReferenceImage } from './imageStore'

afterEach(async () => {
  await deleteReferenceImage('test-reference').catch(() => undefined)
})

describe('reference image storage', () => {
  it('stores and loads image blobs in IndexedDB', async () => {
    const image = new Blob(['image-binary-fixture'], { type: 'image/png' })
    await saveReferenceImage('test-reference', image)
    const loaded = await loadReferenceImage('test-reference')
    expect(loaded?.type).toBe('image/png')
    expect(await loaded?.text()).toBe('image-binary-fixture')
  })

  it('returns undefined for a missing image key', async () => {
    await expect(loadReferenceImage('missing-reference')).resolves.toBeUndefined()
  })

  it('deletes stored image blobs', async () => {
    await saveReferenceImage('test-reference', new Blob(['data'], { type: 'image/webp' }))
    await deleteReferenceImage('test-reference')
    await expect(loadReferenceImage('test-reference')).resolves.toBeUndefined()
  })
})
