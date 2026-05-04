# Cấu hình nâng cao — `.claudeos-scan.json`

Với các layout dự án bất thường, ta override hành vi của scanner frontend qua tệp `.claudeos-scan.json` ở thư mục gốc dự án.

Trang này dành cho người dùng nâng cao. Phần lớn dự án không cần, auto-detection thiết kế để chạy không cần cấu hình.

> Bản gốc tiếng Anh: [docs/advanced-config.md](../advanced-config.md). Bản dịch tiếng Việt đồng bộ với bản tiếng Anh.

---

## `.claudeos-scan.json` làm gì (và không làm gì)

**Có:**
- Mở rộng nhận diện platform/subapp của scanner frontend với từ khóa hoặc tên skip bổ sung.
- Điều chỉnh ngưỡng cho cái gì tính là subapp thật.
- Buộc phát subapp trong các dự án single-platform.

**KHÔNG:**
- Ép một stack cụ thể (phát hiện stack của scanner chạy trước và không cấu hình được).
- Thêm mặc định ngôn ngữ output tùy chỉnh.
- Cấu hình đường dẫn bỏ qua toàn cục (scanner frontend có list ignore built-in riêng).
- Cấu hình các scanner backend (Java, Kotlin, Python, v.v. không đọc tệp này).
- Đánh dấu tệp là "preserved" (cơ chế đó không tồn tại).

Nếu thấy tài liệu cũ mô tả các trường như `stack`, `ignorePaths`, `preserve`, `defaultPort`, `language`, hoặc `subapps`: chúng chưa được implement. Tập trường thật sự hỗ trợ thì nhỏ và nằm gọn dưới `frontendScan`.

---

## Định dạng tệp

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

Cả 4 trường đều tùy chọn. Scanner đọc tệp qua `JSON.parse`. Nếu tệp thiếu hoặc JSON không hợp lệ, scanning lặng lẽ rơi về mặc định.

---

## Reference trường (scanner frontend)

### `frontendScan.platformKeywords` — từ khóa platform bổ sung (mảng string)

Scanner frontend phát hiện layout `src/{platform}/{subapp}/` khi `{platform}` khớp một trong các mặc định:

```
desktop, pc, web,
mobile, mc, mo, sp,
tablet, tab, pwa,
tv, ctv, ott,
watch, wear,
admin, cms, backoffice, back-office, portal
```

Dùng `platformKeywords` để mở rộng (không thay thế) list mặc định:

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk", "embedded", "internal"]
  }
}
```

Sau override này, `src/kiosk/checkout/` sẽ được nhận là cặp platform-subapp và phát ra domain `kiosk-checkout`.

**Lưu ý:** viết tắt `adm` cố ý loại khỏi mặc định (quá mơ hồ khi đứng một mình). Nếu dự án dùng `src/adm/` làm root tier admin, hãy đổi tên thành `admin` hoặc thêm `"adm"` vào `platformKeywords`.

### `frontendScan.skipSubappNames` — tên bổ sung cần skip (mảng string)

Scanner skip các tên thư mục hạ tầng / cấu trúc đã biết ở mức subapp để chúng không bị phát thành domain:

```
assets, common, shared, utils, util,
lib, libs, config, constants, helpers, types,
test, tests, __mocks__, mocks, __tests__,
components, hooks, layouts, layout,
widgets, features, entities,
app, pages, routes, views, screens, containers,
modules, domains
```

Dùng `skipSubappNames` để mở rộng list skip:

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "deprecated-api", "vendor"]
  }
}
```

Sau override này, các thư mục trùng tên sẽ bỏ qua khi scanning subapp.

### `frontendScan.minSubappFiles` — số tệp tối thiểu để là subapp (số, mặc định 2)

Thư mục có 1 tệp dưới root platform thường là fixture vô tình hoặc placeholder, không phải subapp thật. Tối thiểu mặc định là 2 tệp. Override nếu cấu trúc dự án khác:

```json
{
  "frontendScan": {
    "minSubappFiles": 3
  }
}
```

Đặt giá trị này thành `1` sẽ phát các subapp 1 tệp (dễ gây nhiễu trong group plan của Pass 1).

### `frontendScan.forceSubappSplit` — opt out khỏi single-SPA skip (boolean, mặc định false)

Scanner có **quy tắc skip single-SPA**: khi chỉ MỘT từ khóa platform khớp trong toàn dự án (ví dụ dự án có `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/` mà không có platform khác), scanner bỏ qua khâu phát subapp để tránh phân mảnh layer kiến trúc.

Mặc định này đúng cho các SPA single-platform nhưng sai cho dự án chủ ý dùng con của một platform duy nhất làm domain feature. Để opt out:

```json
{
  "frontendScan": {
    "forceSubappSplit": true
  }
}
```

Chỉ dùng tùy chọn này khi chắc chắn các con của platform root duy nhất thật sự là subapp feature độc lập.

---

## Ví dụ

### Thêm từ khóa platform tùy chỉnh

```json
{
  "frontendScan": {
    "platformKeywords": ["embedded", "kiosk"]
  }
}
```

Dự án có `src/embedded/dashboard/` giờ sẽ phát `embedded-dashboard` thành domain.

### Skip thư mục vendored hoặc legacy

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "vendor", "old-portal"]
  }
}
```

Các thư mục có tên này bỏ qua khi scanning, kể cả khi nằm dưới root platform.

### Dự án single-platform muốn phát subapp dù sao

```json
{
  "frontendScan": {
    "forceSubappSplit": true,
    "minSubappFiles": 3
  }
}
```

Bỏ qua quy tắc skip single-SPA. Kết hợp `minSubappFiles` cao để lọc nhiễu.

### Monorepo NX Angular skip các app legacy

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "old-portal"]
  }
}
```

Scanner Angular đã xử lý monorepo NX tự động. List skip giữ các app legacy ra khỏi danh sách domain.

---

## Tệp này có gì và không có gì

Nếu thấy tài liệu cũ nào mô tả các trường không có trong list này, các trường đó không tồn tại. Code đọc `.claudeos-scan.json` thật sự nằm ở:

- `plan-installer/scanners/scan-frontend.js` — `loadScanOverrides()`

Đó là chỗ duy nhất. Scanner backend và orchestrator không đọc tệp này.

Nếu cần một tùy chọn cấu hình chưa có, [mở issue](https://github.com/claudeos-core/claudeos-core/issues) mô tả cấu trúc dự án và muốn công cụ làm gì.

---

## Xem thêm

- [stacks.md](stacks.md): auto-detection nhặt gì mặc định
- [troubleshooting.md](troubleshooting.md): khi phát hiện scanner sai
