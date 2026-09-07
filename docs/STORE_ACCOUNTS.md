# חשבונות מפתח — App Store ו-Google Play

יש לפתוח את שני החשבונות **בהקדם** — האימות יכול לקחת ימים. בזמן ההמתנה אפשר לבנות ולהריץ את האפליקציה מקומית עם Capacitor.

## Apple Developer Program (~$99 / שנה)

1. היכנסו ל-[developer.apple.com/programs](https://developer.apple.com/programs) והירשמו עם Apple ID.
2. למוצר עסקי מומלץ חשבון **Organization** על שם ALTMAN Group (דורש מספר D-U-N-S).
3. אחרי האישור: App Store Connect → יצירת אפליקציה חדשה עם Bundle ID `il.co.altmangroup.app`.
4. לבנייה נדרשים: Xcode + חשבון מפתח מחובר ב-Xcode (Settings → Accounts).

## Google Play Console (~$25 חד-פעמי)

1. היכנסו ל-[play.google.com/console](https://play.google.com/console).
2. שלמו את דמי הרישום והשלימו אימות זהות / ארגון.
3. האפליקציה כבר קיימת ב-Play Console: שם `ALTMAN Group`, package `il.co.altmangroup.android` (כי `il.co.altmangroup.app` היה תפוס). iOS נשאר `il.co.altmangroup.app`.
4. לבנייה נדרשים: Android Studio + JDK.

## אחרי שהחשבונות מאושרים

ראו [STORE_SUBMIT.md](./STORE_SUBMIT.md) לשלבי TestFlight, Play Internal Testing והגשה רשמית.
