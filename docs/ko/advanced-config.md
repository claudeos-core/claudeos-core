# 고급 설정 — `.claudeos-scan.json`

비표준 프로젝트 layout의 경우, 프로젝트 루트의 `.claudeos-scan.json` 파일로 frontend scanner의 동작을 override할 수 있습니다.

이는 고급 사용자용입니다. 대부분 프로젝트는 필요 없습니다 — 자동 감지가 설정 없이 작동하도록 설계되었습니다.

> 영문 원본: [docs/advanced-config.md](../advanced-config.md).

---

## `.claudeos-scan.json`이 하는 일과 안 하는 일

**하는 것:**
- frontend scanner의 platform/subapp 인식을 추가 키워드 또는 skip 이름으로 확장.
- 진짜 subapp으로 인정될 임계값 조정.
- single-platform 프로젝트에서 subapp emission 강제.

**안 하는 것:**
- 특정 스택 강제 (scanner의 stack 감지가 먼저 실행되며 설정 불가).
- custom 출력 언어 기본값 추가.
- 전역 무시 경로 설정 (frontend scanner는 자체 빌트인 무시 list).
- backend scanner 설정 (Java, Kotlin, Python 등은 이 파일을 읽지 않음).
- 파일을 "preserved"로 표시 (그런 메커니즘이 없음).

옛 docs에서 `stack`, `ignorePaths`, `preserve`, `defaultPort`, `language`, `subapps` 같은 필드를 봤다면 — 그것들은 구현되지 않았습니다. 실제 지원 필드 set은 작고 모두 `frontendScan` 아래에 있습니다.

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

4개 필드 모두 선택. scanner는 `JSON.parse`로 파일을 읽음; 파일이 없거나 invalid JSON이면 scanning이 조용히 기본값으로 fallback.

---

## 필드 reference (frontend scanner)

### `frontendScan.platformKeywords` — 추가 platform 키워드 (string array)

frontend scanner는 `{platform}`이 다음 기본값 중 하나와 매치되는 `src/{platform}/{subapp}/` layout을 감지:

```
desktop, pc, web,
mobile, mc, mo, sp,
tablet, tab, pwa,
tv, ctv, ott,
watch, wear,
admin, cms, backoffice, back-office, portal
```

`platformKeywords`로 이 기본 list를 (대체가 아닌) 확장:

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk", "embedded", "internal"]
  }
}
```

이 override 후 `src/kiosk/checkout/`이 platform-subapp 쌍으로 인식되어 도메인 `kiosk-checkout`으로 emit됩니다.

**참고:** 약어 `adm`은 기본값에서 의도적으로 제외 (단독으로는 너무 모호). 프로젝트가 `src/adm/`을 admin tier root로 쓴다면 `admin`으로 이름 변경하거나 `"adm"`을 `platformKeywords`에 추가.

### `frontendScan.skipSubappNames` — skip할 추가 이름 (string array)

scanner는 알려진 인프라 / 구조 디렉토리 이름을 subapp 레벨에서 skip하여 도메인으로 emit하지 않음:

```
assets, common, shared, utils, util,
lib, libs, config, constants, helpers, types,
test, tests, __mocks__, mocks, __tests__,
components, hooks, layouts, layout,
widgets, features, entities,
app, pages, routes, views, screens, containers,
modules, domains
```

`skipSubappNames`로 skip list 확장:

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "deprecated-api", "vendor"]
  }
}
```

이 override 후 해당 이름과 매치되는 디렉토리는 subapp scanning에서 무시됩니다.

### `frontendScan.minSubappFiles` — subapp이 되기 위한 최소 파일 수 (number, 기본 2)

platform root 아래의 single-file 디렉토리는 보통 우연한 fixture 또는 placeholder이지 진짜 subapp이 아닙니다. 기본 최소값은 2개 파일. 프로젝트 구조가 다르면 override:

```json
{
  "frontendScan": {
    "minSubappFiles": 3
  }
}
```

`1`로 설정하면 1-file subapp을 emit (Pass 1 그룹 plan에서 시끄러울 가능성).

### `frontendScan.forceSubappSplit` — single-SPA skip opt-out (boolean, 기본 false)

scanner에는 **single-SPA skip rule**이 있음: 프로젝트 전체에서 ONE platform 키워드만 매치되면 (예: 프로젝트가 다른 platform 없이 `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/`를 가질 때), architectural-layer 분리를 막기 위해 subapp emission을 skip.

이 기본값은 single-platform SPA에는 옳지만, 단독 platform의 children을 의도적으로 feature 도메인으로 사용하는 프로젝트에는 잘못. opt-out:

```json
{
  "frontendScan": {
    "forceSubappSplit": true
  }
}
```

단독 platform root의 children이 정말 독립 feature subapp인 것을 확신할 때만 사용.

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

`src/embedded/dashboard/`가 있는 프로젝트는 이제 `embedded-dashboard`를 도메인으로 emit합니다.

### Vendored 또는 legacy 디렉토리 skip

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "vendor", "old-portal"]
  }
}
```

이 이름의 디렉토리는 platform root 아래에 있어도 scanning에서 무시됩니다.

### Single-platform 프로젝트가 subapp emission을 원하는 경우

```json
{
  "frontendScan": {
    "forceSubappSplit": true,
    "minSubappFiles": 3
  }
}
```

single-SPA skip rule을 우회. 노이즈를 필터하기 위해 높은 `minSubappFiles`와 결합.

### legacy app을 skip하는 NX Angular monorepo

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "old-portal"]
  }
}
```

Angular scanner는 NX monorepo를 자동 처리. skip list는 명명된 legacy app이 도메인 list에 들어가지 않게 함.

---

## 이 파일에 살고 안 사는 것

이 list에 없는 필드를 설명하는 옛 doc을 발견했다면 그 필드는 존재하지 않습니다. `.claudeos-scan.json`을 읽는 실제 코드는:

- `plan-installer/scanners/scan-frontend.js` — `loadScanOverrides()`

거기뿐. backend scanner와 orchestrator는 이 파일을 읽지 않습니다.

존재하지 않는 설정 옵션이 필요하면 [issue를 열어](https://github.com/claudeos-core/claudeos-core/issues) 프로젝트 구조와 도구가 어떻게 동작했으면 하는지 설명해주세요.

---

## See also

- [stacks.md](stacks.md) — 자동 감지가 기본적으로 인식하는 것
- [troubleshooting.md](troubleshooting.md) — scanner 감지가 빗나갈 때
