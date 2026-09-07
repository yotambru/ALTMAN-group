# בילדים מקומיים — iOS ו-Android

הפרויקטים הנייטיביים כבר נוצרו תחת `ios/` ו-`android/`.
לפני הרצה ראשונה יש להתקין את כלי הפיתוח של אפל וגוגל.

## דרישות מקדימות

### משותף
```bash
nvm use          # Node 22 (ראה .nvmrc)
npm install
npm run cap:sync
```

### iOS
1. התקינו **Xcode** מ-Mac App Store (לא רק Command Line Tools).
2. פתחו פעם אחת את Xcode והתקינו רכיבי פלטפורמה נוספים אם מתבקש.
3. בדקו:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   xcodebuild -version
   ```

### Android
1. התקינו **Android Studio**.
2. ב-Android Studio: Settings → Languages & Frameworks → Android SDK — התקינו SDK Platform 35 + Build-Tools.
3. התקינו JDK 21 (Temurin) אם Android Studio לא מספק.
4. הגדירו:
   ```bash
   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export PATH="$PATH:$ANDROID_HOME/platform-tools"
   ```

## הרצה — iOS

```bash
npm run cap:sync
npm run cap:ios
```

ב-Xcode: בחרו סימולטור iPhone → ▶ Run.

ארכיון להגשה (אחרי חשבון Developer):
Product → Archive → Distribute App → App Store Connect.

## הרצה — Android

```bash
npm run cap:sync
npm run cap:android
```

ב-Android Studio: בחרו מכשיר / אמולטור → Run.

בילד debug משורת הפקודה (אחרי SDK + JDK):
```bash
cd android && ./gradlew assembleDebug
```

ה-APK יופיע ב-`android/app/build/outputs/apk/debug/`.

בילד AAB להעלאה ל-Play (אחרי `android/keystore.properties` — ראו [PLAY_LISTING.md](./PLAY_LISTING.md)):
```bash
cd android && ./gradlew bundleRelease
```
החבילה בחנות היא `il.co.altmangroup.android`.

## בדיקת תקינות מהירה

האפליקציה אמורה:
1. להציג splash navy עם לוגו
2. לטעון את https://altman-group.vercel.app
3. לאפשר כניסה עם `manager` / `1234`
4. לכבד RTL + safe areas באייפון עם notch

אם מופיע מסך "אין חיבור לרשת" — בדקו אינטרנט במכשיר/סימולטור.
