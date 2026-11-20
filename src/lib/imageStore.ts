const DATABASE_NAME = 'my-closet-images'
const STORE_NAME = 'reference-images'
const DATABASE_VERSION = 1

function openImageDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('이 브라우저는 이미지 영구 저장을 지원하지 않습니다.'))
      return
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('이미지 저장소를 열지 못했습니다.'))
  })
}

export async function saveReferenceImage(key: string, image: Blob): Promise<void> {
  const database = await openImageDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(image, key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('이미지를 저장하지 못했습니다.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('이미지 저장이 취소되었습니다.'))
  }).finally(() => database.close())
}

export async function loadReferenceImage(key: string): Promise<Blob | undefined> {
  const database = await openImageDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(key)
    request.onsuccess = () => resolve(request.result as Blob | undefined)
    request.onerror = () => reject(request.error ?? new Error('이미지를 불러오지 못했습니다.'))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => database.close()
  })
}

export async function deleteReferenceImage(key: string): Promise<void> {
  const database = await openImageDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('이미지를 삭제하지 못했습니다.'))
  }).finally(() => database.close())
}
