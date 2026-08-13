# הגשה ל-App Store ו-Google Play

לאחר שחשבונות המפתח מאושרים והבילדים המקומיים עובדים.

## מזהים

| שדה | ערך |
|-----|-----|
| Bundle / Package ID | `il.co.altmangroup.app` |
| שם האפליקציה | ALTMAN Group |
| כתובת האפליקציה | https://altman-group.vercel.app |
| מדיניות פרטיות | https://altman-group.vercel.app/privacy |

## Google Play — Internal Testing → Production

1. Play Console → Create app → מלאים פרטי החנות בעברית.
2. הגדרות → App integrity / signing (Play App Signing).
3. ב-Android Studio: Build → Generate Signed Bundle (AAB), או:
   ```bash
   npm run cap:sync
   cd android && ./gradlew bundleRelease
   ```
4. Release → Testing → Internal testing → העלאת ה-AAB והזמנת בודקים.
5. אחרי בדיקה: Closed testing / Production.
6. חובה: קישור מדיניות פרטיות, צילומי מסך, דירוג תוכן.

## App Store — TestFlight → Review

1. App Store Connect → New App עם Bundle ID `il.co.altmangroup.app`.
2. ב-Xcode: Signing & Capabilities עם הצוות שלכם → Product → Archive.
3. Distribute App → App Store Connect → העלאה.
4. TestFlight → הוספת בודקים פנימיים.
5. הכנת עמוד המוצר: צילומי מסך iPhone, תיאור בעברית, Privacy Nutrition Labels.
6. Submit for Review.

## צילומי מסך מומלצים

- מסך כניסה
- דשבורד מנהל
- דשבורד משכיר
- דשבורד שוכר

רצוי בגדלים הרשמיים של כל חנות (iPhone 6.7", Android phone).

## הערות חשובות

- עדכוני UI ב-Next.js → דיפלוי ל-Vercel בלבד (בלי הגשה מחדש).
- שינוי מעטפת נייטיבית (אייקון, הרשאות, גרסת Capacitor) → בילד חדש + הגשה לחנות.
- אל תסמנו את האפליקציה כ"אתר בלבד" — יש splash, אייקון ומדיניות פרטיות כחלק מהמעטפת.
