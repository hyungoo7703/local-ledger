/**
 * 저장소 영속성.
 *
 * 웹 저장소는 기본이 'best-effort'라, 기기 용량이 빠듯해지면 브라우저가 예고 없이
 * 통째로 비울 수 있다. persist()가 허가되면 그 자동 삭제 대상에서 빠진다.
 *
 * 막아주지 못하는 것: 사용자가 직접 사이트 데이터를 지우거나 앱을 삭제하는 경우.
 * 그래서 이게 백업을 대신하지는 않는다.
 */
export type PersistState = 'checking' | 'unsupported' | 'persisted' | 'best-effort';

export async function requestPersistentStorage(): Promise<PersistState> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return 'unsupported';
  try {
    // 이미 허가됐다면 다시 요청하지 않는다
    if (await navigator.storage.persisted()) return 'persisted';
    return (await navigator.storage.persist()) ? 'persisted' : 'best-effort';
  } catch (err) {
    console.error('Failed to request persistent storage', err);
    return 'unsupported';
  }
}
