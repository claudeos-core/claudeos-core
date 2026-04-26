# 고급 설정 — `.claudeos-scan.json`

비표준 프로젝트 layout의 경우, 프로젝트 루트에 `.claudeos-scan.json` 파일을 두면 frontend scanner의 동작을 override할 수 있습니다.

고급 사용자용 옵션입니다. 대부분의 프로젝트에는 필요 없습니다. 자동 감지가 별도 설정 없이도 동작하도록 만들어져 있습니다.

> 영문 원본: [docs/advanced-config.md](../advanced-config.md).

---

## `.claudeos-scan.json`이 하는 일과 하지 않는 일

**하는 일:**
- frontend scanner의 platform/subapp 인식을 추가 키워드나 skip 이름으로 확장.
- 진짜 subapp으로 인정할 임계값 조정.
- single-platform 프로젝트에서도 subapp emission을 강제.

**하지 않는 일:**
- 특정 스택을 강제로 지정 (scanner의 stack 감지가 먼저 실행되고, 설정으로 바꿀 수 없습니다).
- 출력 언어 기본값을 custom으로 지정.
- 전역 ignore 경로 설정 (frontend scanner는 자체 빌트인 ignore 목록을 사용합니다).
- backend scanner 설정 (Java, Kotlin, Python 등은 이 파일을 읽지 않습니다).
- 파일을 "preserved"로 표시 (그런 메커니즘은 없습니다).

이전 문서에서 `stack`, `ignorePaths`, `preserve`, `defaultPort`, `language`, `subapps` 같은 필드를 본 적이 있다면, 그것들은 구현되어 있지 않습니다. 실제로 지원하는 필드는 적고 모두 `frontendScan` 아래에 있습니다.

---

## 파일 형식

```json
{
  "frontendScan": {
    "platformKeywords": ["custom-platform"],
    "skipSubappNames": ["legacy-app"],
    "minSubappFiles": 3,
    "forceSubappSplit": false
  }
}
```

4개 필드 모두 선택 사항입니다. scanner는 `JSON.parse`로 파일을 읽고, 파일이 없거나 invalid JSON이면 조용히 기본값으로 돌아갑니다.

---

## 필드 reference (frontend scanner)

### `frontendScan.platformKeywords` — 추가 platform 키워드 (string array)

frontend scanner는 `{platform}`이 다음 기본값 중 하나와 매치되는 `src/{platform}/{subapp}/` layout을 감지합니다:

```
desktop, pc, web,
mobile, mc, mo, sp,
tablet, tab, pwa,
tv, ctv, ott,
watch, wear,
admin, cms, backoffice, back-office, portal
```

`platformKeywords`로 이 기본 목록을 (대체가 아니라) 확장합니다:

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk", "embedded", "internal"]
  }
}
```

이렇게 override하면 `src/kiosk/checkout/`이 platform-subapp 쌍으로 인식되어 `kiosk-checkout` 도메인으로 출력됩니다.

**참고:** 약어 `adm`은 기본값에서 일부러 제외했습니다 (단독으로는 너무 모호). 프로젝트가 `src/adm/`을 admin tier root로 쓰고 있다면 `admin`으로 이름을 바꾸거나 `"adm"`을 `platformKeywords`에 추가하세요.

### `frontendScan.skipSubappNames` — skip할 추가 이름 (string array)

scanner는 잘 알려진 인프라/구조 디렉토리 이름을 subapp 레벨에서 skip해 도메인으로 출력하지 않습니다:

```
assets, common, shared, utils, util,
lib, libs, config, constants, helpers, types,
test, tests, __mocks__, mocks, __tests__,
components, hooks, layouts, layout,
widgets, features, entities,
app, pages, routes, views, screens, containers,
modules, domains
```

`skipSubappNames`로 skip 목록을 확장합니다:

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "deprecated-api", "vendor"]
  }
}
```

이렇게 override하면 해당 이름과 매치되는 디렉토리는 subapp scanning에서 제외됩니다.

### `frontendScan.minSubappFiles` — subapp으로 인정하는 최소 파일 수 (number, 기본 2)

platform root 아래의 single-file 디렉토리는 대개 우연히 들어간 fixture나 placeholder이지 진짜 subapp이 아닙니다. 기본 최솟값은 2개 파일이고, 프로젝트 구조가 다르면 override하세요:

```json
{
  "frontendScan": {
    "minSubappFiles": 3
  }
}
```

`1`로 설정하면 1-file subapp도 출력합니다 (Pass 1 그룹 plan에서 노이즈가 많아질 수 있습니다).

### `frontendScan.forceSubappSplit` — single-SPA skip opt-out (boolean, 기본 false)

scanner에는 **single-SPA skip rule**이 있습니다. 프로젝트 전체에서 platform 키워드가 단 하나만 매치되면 (예: 다른 platform 없이 `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/`만 있는 경우), architectural-layer 단위로 잘못 쪼개지는 것을 막기 위해 subapp emission을 건너뜁니다.

이 기본값은 single-platform SPA에는 적절하지만, 단독 platform 아래의 자식 디렉토리를 의도적으로 feature 도메인으로 쓰는 프로젝트에는 맞지 않습니다. 그럴 때는 opt-out하세요:

```json
{
  "frontendScan": {
    "forceSubappSplit": true
  }
}
```

단독 platform root의 자식 디렉토리가 정말 독립적인 feature subapp이라고 확신할 때만 사용하세요.

---

## 예시

### Custom platform 키워드 추가

```json
{
  "frontendScan": {
    "platformKeywords": ["embedded", "kiosk"]
  }
}
```

`src/embedded/dashboard/`가 있는 프로젝트라면 이제 `embedded-dashboard`가 도메인으로 출력됩니다.

### Vendored 또는 legacy 디렉토리 skip

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "vendor", "old-portal"]
  }
}
```

해당 이름의 디렉토리는 platform root 아래에 있어도 scanning에서 제외됩니다.

### Single-platform 프로젝트에서 subapp을 출력하고 싶을 때

```json
{
  "frontendScan": {
    "forceSubappSplit": true,
    "minSubappFiles": 3
  }
}
```

single-SPA skip rule을 우회합니다. 노이즈를 줄이려면 `minSubappFiles`를 높여서 함께 쓰면 됩니다.

### legacy app을 skip하는 NX Angular monorepo

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "old-portal"]
  }
}
```

Angular scanner는 NX monorepo를 자동으로 처리합니다. skip list는 지정된 legacy app이 도메인 목록에 들어가지 않게 막아 줍니다.

---

## 이 파일에 들어 있는 것과 들어 있지 않은 것

이 목록에 없는 필드를 설명하는 옛 문서를 봤다면 그 필드는 존재하지 않습니다. `.claudeos-scan.json`을 실제로 읽는 코드는 다음 한 곳뿐입니다:

- `plan-installer/scanners/scan-frontend.js` — `loadScanOverrides()`

backend scanner와 orchestrator는 이 파일을 읽지 않습니다.

존재하지 않는 설정 옵션이 필요하다면 [issue를 열어](https://github.com/claudeos-core/claudeos-core/issues) 프로젝트 구조와 도구가 어떻게 동작했으면 좋겠는지 설명해 주세요.

---

## See also

- [stacks.md](stacks.md) — 자동 감지가 기본적으로 인식하는 것
- [troubleshooting.md](troubleshooting.md) — scanner 감지가 어긋날 때
