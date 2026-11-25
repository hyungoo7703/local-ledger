import { useEffect, useRef } from 'react';

// 안드로이드 뒤로가기가 앱을 끄는 대신 맨 위 화면부터 닫게 한다.
//
// 설치한 PWA는 브라우저 기록이 한 칸뿐이라 뒤로가기를 누르면 바로 앱이 꺼진다.
// 그래서 열려 있는 화면 수만큼 기록을 쌓아 두고, 뒤로가기로 기록이 줄면 그만큼 화면을 닫는다.
//
// 화면마다 따로 기록을 넣고 빼지 않고 "기록 깊이 = 열린 화면 수"만 맞춘다.
// 그래야 버튼으로 닫았을 때와 뒤로가기로 닫았을 때가 서로 꼬이지 않는다.

const STATE_KEY = 'backDepth';

interface Layer {
  close: () => void;
}

/** 지금 열려 있는 화면들. 연 순서대로 쌓인다 */
const layers: Layer[] = [];

function depthOf(state: unknown): number {
  const depth = state && typeof state === 'object' ? Number((state as Record<string, unknown>)[STATE_KEY]) : 0;
  return Number.isFinite(depth) && depth > 0 ? depth : 0;
}

// 새로고침하면 화면은 처음으로 돌아가지만 기록에는 쌓아둔 칸이 남는다. 그 값에서 시작해야 걷어낼 수 있다
let historyDepth = depthOf(history.state);

function syncHistory(): void {
  const diff = layers.length - historyDepth;
  if (diff > 0) {
    for (let depth = historyDepth + 1; depth <= layers.length; depth++) {
      history.pushState({ [STATE_KEY]: depth }, '');
    }
  } else if (diff < 0) {
    history.go(diff); // 버튼으로 닫았을 때. 쌓아둔 기록을 직접 걷어낸다
  }
  historyDepth = layers.length;
}

window.addEventListener('popstate', (e) => {
  const target = depthOf(e.state);
  if (target > layers.length) {
    // 브라우저의 앞으로 가기. 다시 열 화면이 없으므로 제자리로 돌린다
    history.go(layers.length - target);
    return;
  }
  historyDepth = target;
  layers.slice(target).reverse().forEach((layer) => layer.close());
});

// 앱을 다시 불러온 직후 남아 있는 기록을 걷어낸다
syncHistory();

/** isOpen인 동안 뒤로가기 한 번이 onClose를 부른다. 여러 화면이 열려 있으면 나중에 연 것부터 닫힌다. */
export function useBackLayer(isOpen: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const layer: Layer = { close: () => onCloseRef.current() };
    layers.push(layer);
    syncHistory();
    return () => {
      layers.splice(layers.indexOf(layer), 1);
      syncHistory();
    };
  }, [isOpen]);
}
