# הגשה ל-App Store ו-Google Play

לאחר שחשבונות המפתח מאושרים והבילדים המקומיים עובדים.

## מזהים

| שדה | ערך |
|-----|-----|
| iOS Bundle ID | `il.co.altmangroup.app` |
| Android package | `il.co.altmangroup.android` |
| שם האפליקציה | ALTMAN Group |
| כתובת האפליקציה | https://altman-group.vercel.app |
| מדיניות פרטיות | https://altman-group.vercel.app/privacy |

`il.co.altmangroup.app` היה תפוס ב-Play, לכן חבילת Android בקונסולה היא `il.co.altmangroup.android`. ה-AAB חייב להתאים בדיוק. iOS לא משתנה.

טקסטים, שאלון תוכן ונכסים: [PLAY_LISTING.md](./PLAY_LISTING.md). נכסי גרפיקה: `store/play/`.

## Google Play — Internal Testing → Closed → Production

1. ממלאים דף חנות + שאלון תוכן לפי [PLAY_LISTING.md](./PLAY_LISTING.md).
2. Play App Signing (ברירת המחדל בקונסולה).
3. יצירת `android/keystore.properties` ממפתח ההעלאה, ואז:
   ```bash
   npm run cap:sync
   cd android && ./gradlew bundleRelease
   ```
4. בדיקה פנימית → העלאת `app-release.aab` והזמנת בודקים.
5. בדיקות בקבוצות מוגדרות (בחשבון חדש: בדרך כלל 12 בודקים × 14 ימים).
6. בקשת גישה לייצור רק אחרי סיום הבדיקות הסגורות.

## App Store — TestFlight → Review

1. App Store Connect → New App עם Bundle ID `il.co.altmangroup.app`.
2. ב-Xcode: Signing & Capabilities עם הצוות שלכם → Product → Archive.
3. Distribute App → App Store Connect → העלאה.
4. TestFlight → הוספת בודקים פנימיים.
5. הכנת עמוד המוצר: צילומי מסך iPhone, תיאור בעברית, Privacy Nutrition Labels.
6. Submit for Review.

## צילומי מסך

Android: `store/play/` (1080×1920).  
iOS: `store/appstore/`.

## הערות חשובות

- עדכוני UI ב-Next.js → דיפלוי ל-Vercel בלבד (בלי הגשה מחדש).
- שינוי מעטפת נייטיבית (אייקון, הרשאות, גרסת Capacitor) → בילד חדש + הגשה לחנות.
- אל תסמנו את האפליקציה כ"אתר בלבד" — יש splash, אייקון ומדיניות פרטיות כחלק מהמעטפת.
- אל תריצו `npx cap add android` מחדש — זה עלול לדרוס את `applicationId`.
