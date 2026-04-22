# CLAUDE.md — sample-project

> Validator परीक्षण के लिए हिंदी में मान्य CLAUDE.md नमूना।

## 1. Role Definition (भूमिका परिभाषा)

इस रिपॉजिटरी के वरिष्ठ डेवलपर के रूप में, आप कोड लिखने, संशोधित करने और समीक्षा करने के लिए जिम्मेदार हैं। प्रतिक्रियाएं हिंदी में होनी चाहिए।
PostgreSQL रिलेशनल स्टोर के ऊपर Node.js Express REST API सर्वर।

## 2. Project Overview (परियोजना अवलोकन)

| आइटम | मान |
|---|---|
| भाषा | TypeScript 5.4 |
| फ्रेमवर्क | Express 4.19 |
| बिल्ड टूल | tsc |
| पैकेज प्रबंधक | npm |
| सर्वर पोर्ट | 3000 |
| डेटाबेस | PostgreSQL 15 |
| ORM | Prisma 5 |
| परीक्षण रनर | Vitest |

## 3. Build & Run Commands (बिल्ड और रन कमांड)

```bash
npm install
npm run dev
npm run build
npm test
```

`package.json` के scripts को सत्य का एकमात्र स्रोत मानें।

## 4. Core Architecture (मूल आर्किटेक्चर)

### समग्र संरचना

```
Client → Express Router → Service → Prisma → PostgreSQL
```

### डेटा प्रवाह

1. अनुरोध राउटर पर पहुंचता है।
2. मिडलवेयर प्रमाणीकरण सत्यापित करता है।
3. सेवा व्यावसायिक तर्क निष्पादित करती है।
4. Prisma डीबी पढ़ता/लिखता है।
5. प्रतिक्रिया क्रमबद्ध होती है।

### मूल पैटर्न

- **लेयर्ड**: router → service → repository।
- **DTO सत्यापन**: राउटर सीमा पर zod स्कीमा।
- **त्रुटि मिडलवेयर**: केंद्रीकृत त्रुटि प्रबंधन।

## 5. Directory Structure (डायरेक्टरी संरचना)

```
sample-project/
├─ src/
└─ tests/
```

**स्वतः उत्पन्न**: कोई नहीं।
**परीक्षण दायरा**: `tests/` `src/` को प्रतिबिंबित करता है।
**बिल्ड आउटपुट**: `dist/`।

## 6. Standard / Rules / Skills Reference (Standard / Rules / Skills संदर्भ)

### Standard (सत्य का एकमात्र स्रोत)

| पथ | विवरण |
|---|---|
| `claudeos-core/standard/00.core/01.project-overview.md` | परियोजना अवलोकन |
| `claudeos-core/standard/00.core/04.doc-writing-guide.md` | दस्तावेज़ लेखन गाइड |

### Rules (स्वतः लोडेड गार्डरेल)

| पथ | विवरण |
|---|---|
| `.claude/rules/00.core/*` | मूल नियम |
| `.claude/rules/60.memory/*` | L4 मेमोरी गार्ड |

### Skills (स्वचालित प्रक्रियाएं)

- `claudeos-core/skills/00.shared/MANIFEST.md`

## 7. DO NOT Read (न पढ़ें)

| पथ | कारण |
|---|---|
| `claudeos-core/guide/` | मानव-सामना करने वाले दस्तावेज़ |
| `dist/` | बिल्ड आउटपुट |
| `node_modules/` | निर्भरताएं |

## 8. Common Rules & Memory (L4) (सामान्य नियम और मेमोरी (L4))

### सामान्य नियम (प्रत्येक संपादन पर स्वतः लोड)

| नियम फ़ाइल | भूमिका | मूल प्रवर्तन |
|---|---|---|
| `.claude/rules/00.core/51.doc-writing-rules.md` | दस्तावेज़ लेखन नियम | paths आवश्यक, कोई hardcoding नहीं |
| `.claude/rules/00.core/52.ai-work-rules.md` | AI कार्य नियम | तथ्य-आधारित, संपादन से पहले Read |

विस्तृत मार्गदर्शन के लिए, पढ़ें `claudeos-core/standard/00.core/04.doc-writing-guide.md`।

### L4 मेमोरी (मांग पर संदर्भ)

दीर्घकालिक संदर्भ (निर्णय · विफलताएं · संकुचन · स्व-प्रस्ताव) `claudeos-core/memory/` में संग्रहीत होते हैं।
`paths` ग्लोब के माध्यम से स्वतः लोड होने वाले rules के विपरीत, यह परत **मांग पर** संदर्भित होती है।

#### L4 मेमोरी फ़ाइलें

| फ़ाइल | उद्देश्य | व्यवहार |
|---|---|---|
| `claudeos-core/memory/decision-log.md` | डिज़ाइन निर्णयों का क्यों | केवल-जोड़। सत्र शुरू में स्किम करें। |
| `claudeos-core/memory/failure-patterns.md` | दोहराई गई त्रुटियां | सत्र शुरू में खोजें। |
| `claudeos-core/memory/compaction.md` | 4-चरण संकुचन नीति | केवल नीति बदलने पर संशोधित करें। |
| `claudeos-core/memory/auto-rule-update.md` | नियम परिवर्तन प्रस्ताव | समीक्षा और स्वीकार करें। |

#### मेमोरी कार्यप्रवाह

1. सत्र शुरू में failure-patterns स्कैन करें।
2. हाल के निर्णयों को स्किम करें।
3. नए निर्णयों को जोड़ के रूप में रिकॉर्ड करें।
4. दोहराई गई त्रुटियों को pattern-id के साथ रजिस्टर करें।
5. फ़ाइलें 400 पंक्तियों के करीब आने पर compact चलाएं।
6. rule-update प्रस्तावों की समीक्षा करें।

## 9. मेमोरी (L4)

> प्रत्येक संपादन पर स्वतः लोड होने वाले सामान्य गार्डरेल और मांग पर दीर्घकालिक मेमोरी फ़ाइलें।

### सामान्य नियम (प्रत्येक संपादन पर स्वतः लोड)

| नियम फ़ाइल | भूमिका |
|---|---|
| `.claude/rules/00.core/51.doc-writing-rules.md` | दस्तावेज़ लेखन नियम |
| `.claude/rules/00.core/52.ai-work-rules.md` | AI कार्य नियम |

### L4 मेमोरी फ़ाइलें

| फ़ाइल | उद्देश्य | व्यवहार |
|---|---|---|
| `claudeos-core/memory/decision-log.md` | डिज़ाइन निर्णयों का क्यों | केवल-जोड़। |
| `claudeos-core/memory/failure-patterns.md` | दोहराई गई त्रुटियां | खोज। |
| `claudeos-core/memory/compaction.md` | 4-चरण नीति | केवल नीति बदलने पर। |
| `claudeos-core/memory/auto-rule-update.md` | प्रस्ताव | समीक्षा। |
