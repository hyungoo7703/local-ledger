import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

export const LICENSES_FILE = 'third-party-licenses.txt';

const LICENSE_FILE_NAME = /^licen[cs]e(\.(md|txt))?$/i;
const RULE = '='.repeat(72);

/**
 * 배포 파일에 실제로 들어간 패키지의 라이선스 원문을 모아 dist에 함께 내보낸다.
 *
 * MIT·ISC는 저작권 표기를 사본에 포함하라고 요구하는데, 압축 과정에서
 * 패키지 머리의 주석이 대부분 사라진다. 그래서 파일로 따로 남긴다.
 *
 * 서비스 워커(workbox)는 vite-plugin-pwa가 closeBundle에서 따로 번들하므로
 * 앱 번들의 모듈 목록에 잡히지 않는다. 생성된 파일에 박힌
 * 'workbox:<모듈>:<버전>' 표식으로 어떤 모듈이 들어갔는지 찾는다.
 */
export function thirdPartyLicenses(): Plugin {
  const packageDirs = new Set<string>();
  let root = '';
  let outDir = '';

  return {
    name: 'third-party-licenses',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        for (const id of chunk.moduleIds) {
          const dir = packageDirOf(id);
          if (dir) packageDirs.add(dir);
        }
      }
    },
    // vite-plugin-pwa가 서비스 워커를 다 만든 뒤에 돌아야 workbox 파일을 읽을 수 있다
    closeBundle: {
      sequential: true,
      order: 'post',
      handler() {
        for (const file of fs.readdirSync(outDir)) {
          if (!/^workbox-.*\.js$/.test(file)) continue;
          const source = fs.readFileSync(path.join(outDir, file), 'utf8');
          for (const [, name] of source.matchAll(/workbox:([a-z-]+):[\d.]+/g)) {
            packageDirs.add(path.join(root, 'node_modules', `workbox-${name}`));
          }
        }

        const sections = new Map<string, string>();
        for (const dir of packageDirs) {
          const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
          const licenseFile = fs.readdirSync(dir).find((f) => LICENSE_FILE_NAME.test(f));
          // 원문이 없으면 표기 의무를 채울 수 없다. 조용히 빼지 말고 빌드 로그에 드러낸다
          if (!licenseFile) this.warn(`${pkg.name}: 라이선스 원문 파일이 없어 선언만 적습니다`);
          const body = licenseFile
            ? fs.readFileSync(path.join(dir, licenseFile), 'utf8').trim()
            : `License: ${pkg.license ?? '(표기 없음)'}`;
          sections.set(
            `${pkg.name}@${pkg.version}`,
            `${RULE}\n${pkg.name}@${pkg.version} (${pkg.license ?? '?'})\n${RULE}\n\n${body}\n`
          );
        }

        const names = [...sections.keys()].sort((a, b) => a.localeCompare(b));
        const header =
          '이 앱의 배포 파일에 포함된 오픈소스 소프트웨어와 그 라이선스입니다.\n' +
          `Third-party software included in this build (${names.length} packages).\n\n` +
          names.map((n) => `  - ${n}`).join('\n') +
          '\n\n';
        // BOM을 붙인다. 서버가 charset 없이 text/plain으로 주면 브라우저가 인코딩을 추측해 한글이 깨진다
        fs.writeFileSync(
          path.join(outDir, LICENSES_FILE),
          '﻿' + header + names.map((n) => sections.get(n)).join('\n')
        );
      }
    }
  };
}

/** 모듈 경로에서 패키지 폴더를 뽑는다. 중첩 설치를 고려해 마지막 node_modules를 기준으로 한다. */
function packageDirOf(id: string): string | null {
  const normalized = id.replace(/^\0/, '').replace(/\\/g, '/');
  const marker = '/node_modules/';
  const at = normalized.lastIndexOf(marker);
  if (at < 0) return null;
  const segments = normalized.slice(at + marker.length).split('/');
  const name = segments[0].startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
  return normalized.slice(0, at + marker.length) + name;
}
