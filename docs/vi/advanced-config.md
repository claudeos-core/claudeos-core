# Cấu hình nâng cao — `.claudeos-scan.json`

Cho các layout dự án bất thường, bạn có thể override hành vi của scanner frontend qua tệp `.claudeos-scan.json` ở thư mục gốc dự án.

Đây là cho người dùng nâng cao. Hầu hết dự án không cần — auto-detection được thiết kế để hoạt động không cần cấu hình.

> Bản gốc tiếng Anh: [docs/advanced-config.md](../advanced-config.md). Bản dịch tiếng Việt được đồng bộ với bản tiếng Anh.

---

## `.claudeos-scan.json` làm gì (và không làm gì)

**Có:**
- Mở rộng nhận diện platform/subapp của scanner frontend với từ khóa hoặc tên skip bổ sung.
- Điều chỉnh ngưỡng cho cái gì được tính là subapp thật.
- Buộc phát subapp trong các dự án single-platform.

**KHÔNG:**
- Buộc một stack cụ thể (phát hiện stack của scanner chạy trước và không cấu hình được).
- Thêm mặc định ngôn ngữ output tùy chỉnh.
- Cấu hình đường dẫn bị bỏ qua trên toàn cục (scanner frontend có list ignore built-in riêng).
- Cấu hình các scanner backend (Java, Kotlin, Python, v.v. không đọc tệp này).
- Đánh dấu tệp là "preserved" (cơ chế đó không tồn tại).

Nếu bạn từng thấy tài liệu cũ mô tả các trường như `stack`, `ignorePaths`, `preserve`, `defaultPort`, `language`, hoặc `subapps` — chúng không được implement. Tập trường thực sự được hỗ trợ thì nhỏ và nằm hoàn toàn dưới `frontendScan`.

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

Cả bốn trường đều tùy chọn. Scanner đọc tệp qua `JSON.parse`; nếu tệp thiếu hoặc JSON không hợp lệ, scanning lặng lẽ fallback về mặc định.

---

## Reference trường (scanner frontend)

### `frontendScan.platformKeywords` — từ khóa platform bổ sung (mảng string)

Scanner frontend phát hiện layout `src/{platform}/{subapp}/` nơi `{platform}` khớp một trong các mặc định:

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

**Lưu ý:** viết tắt `adm` được loại trừ có chủ ý khỏi mặc định (quá mơ hồ khi đứng một mình). Nếu dự án dùng `src/adm/` làm root tier admin, hoặc đổi tên thành `admin` hoặc thêm `"adm"` vào `platformKeywords`.

### `frontendScan.skipSubappNames` — tên bổ sung để skip (mảng string)

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

Sau override này, các thư mục khớp tên đó sẽ bị bỏ qua khi scanning subapp.

### `frontendScan.minSubappFiles` — số tệp tối thiểu để là subapp (số, mặc định 2)

Một thư mục đơn-tệp dưới root platform thường là fixture vô tình hoặc placeholder, không phải subapp thật. Tối thiểu mặc định là 2 tệp. Override nếu cấu trúc dự án khác:

```json
{
  "frontendScan": {
    "minSubappFiles": 3
  }
}
```

Đặt giá trị này thành `1` sẽ phát các subapp 1-tệp (có thể gây nhiễu trong group plan của Pass 1).

### `frontendScan.forceSubappSplit` — opt out khỏi single-SPA skip (boolean, mặc định false)

Scanner có **quy tắc skip single-SPA**: khi chỉ MỘT từ khóa platform khớp trong toàn dự án (ví dụ dự án có `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/` mà không có platform khác), việc phát subapp bị bỏ qua để ngăn fragment hóa layer kiến trúc.

Mặc định này đúng cho các SPA single-platform nhưng sai cho dự án cố ý dùng con của một platform duy nhất làm domain feature. Để opt out:

```json
{
  "frontendScan": {
    "forceSubappSplit": true
  }
}
```

Chỉ dùng cái này khi bạn chắc chắn các con của platform root duy nhất thực sự là subapp feature độc lập.

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

Một dự án có `src/embedded/dashboard/` giờ sẽ phát `embedded-dashboard` thành domain.

### Skip thư mục vendored hoặc legacy

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "vendor", "old-portal"]
  }
}
```

Các thư mục với tên này bị bỏ qua khi scanning, ngay cả khi chúng nằm dưới root platform.

### Dự án single-platform muốn phát subapp dù sao

```json
{
  "frontendScan": {
    "forceSubappSplit": true,
    "minSubappFiles": 3
  }
}
```

Bỏ qua quy tắc skip single-SPA. Kết hợp với `minSubappFiles` cao để lọc nhiễu.

### Monorepo NX Angular skip các app legacy

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "old-portal"]
  }
}
```

Scanner Angular đã xử lý monorepo NX tự động. List skip giữ các app legacy có tên ra khỏi danh sách domain.

---

## Cái gì có trong tệp này vs. cái gì không có

Nếu bạn tìm thấy một tài liệu cũ mô tả các trường không có trong list này, các trường đó không tồn tại. Code thực sự đọc `.claudeos-scan.json` ở:

- `plan-installer/scanners/scan-frontend.js` — `loadScanOverrides()`

Đó là chỗ duy nhất. Scanner backend và orchestrator không đọc tệp này.

Nếu bạn cần một tùy chọn cấu hình không tồn tại, [mở issue](https://github.com/claudeos-core/claudeos-core/issues) mô tả cấu trúc dự án và bạn muốn công cụ làm gì.

---

## Xem thêm

- [stacks.md](stacks.md) — auto-detection nhặt gì mặc định
- [troubleshooting.md](troubleshooting.md) — khi phát hiện scanner sai
