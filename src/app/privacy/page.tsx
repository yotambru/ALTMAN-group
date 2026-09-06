import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata = {
  title: "מדיניות פרטיות — ALTMAN Group",
  description: "מדיניות הפרטיות של אפליקציית ALTMAN Group לניהול נכסים ושכירויות.",
};

export default function PrivacyPage() {
  return (
    <main className="app-shell flex min-h-[100dvh] flex-col bg-surface px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="flex justify-center py-6">
        <Logo size="md" withTagline={false} />
      </div>

      <h1 className="text-2xl font-extrabold text-navy">מדיניות פרטיות</h1>
      <p className="mt-2 text-sm text-text-muted">עדכון אחרון: ספטמבר 2026</p>

      <div className="mt-6 space-y-5 text-sm leading-relaxed text-text">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-navy">כללי</h2>
          <p>
            אפליקציית ALTMAN Group (&quot;האפליקציה&quot;) משמשת לניהול נכסים, שכירויות
            ותקשורת בין מנהלים, משכירים, שוכרים ובעלי מקצוע. מסמך זה מתאר אילו
            נתונים נאספים וכיצד נעשה בהם שימוש.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-navy">נתונים שנאספים</h2>
          <p>
            נתוני הפורטפוליו (נכסים, חוזים, תקלות, צ׳אט ומסמכים) נשמרים בשרת
            מאובטח של Supabase באירופה. סשן ההתחברות לדמו (בחירת תפקיד) נשמר
            מקומית במכשיר. קבצים שמועלים (תעודות, חוזים, תמונות) מאוחסנים ב-Supabase
            Storage.
          </p>
          <ul className="list-disc space-y-1 ps-5">
            <li>פרטי זיהוי בסיסיים לכניסה (שם משתמש / סיסמה בדמו)</li>
            <li>נתוני ניהול נכסים ושכירויות המשותפים בין משתמשי המערכת</li>
            <li>קבצים ומסמכים שמועלים דרך האפליקציה</li>
            <li>העדפות ממשק שנשמרות מקומית במכשיר</li>
            <li>נתוני שימוש טכניים סטנדרטיים מצד ספקי האחסון (Vercel, Supabase) כגון כתובת IP ולוגים</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-navy">שימוש בנתונים</h2>
          <p>
            הנתונים משמשים להפעלת האפליקציה, סנכרון בין מכשירים ומשתמשים, ושמירת
            מצב התחברות מקומי. איננו מוכרים מידע אישי לצדדים שלישיים.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-navy">אבטחה</h2>
          <p>
            התקשורת לאתר האפליקציה ולמסד הנתונים מתבצעת באמצעות HTTPS. בשלב
            הנוכחי ההתחברות היא דמו משותף; מדיניות זו תעודכן כשיתווסף אימות אמיתי
            לכל משתמש.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-navy">זכויות המשתמש ומחיקת חשבון</h2>
          <p>
            ניתן להתנתק מהמערכת בכל עת. מחיקת חשבון מתבצעת מתוך האפליקציה:
            פרופיל ← מחיקת חשבון. המחיקה מסירה לצמיתות את חשבון הכניסה ואת
            הנתונים האישיים מהשרת, ולא ניתן לשחזר אותם. בקשות נוספות ניתן
            להפנות אל{" "}
            <a
              className="font-semibold text-orange underline-offset-2 hover:underline"
              href="mailto:privacy@altmangroup.co.il"
            >
              privacy@altmangroup.co.il
            </a>
            .
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-bold text-navy">מצלמה וגלריה</h2>
          <p>
            האפליקציה מבקשת גישה למצלמה ולגלריה רק כדי לצלם או לבחור תמונות
            לנכסים, לקריאות תחזוקה, למסמכים ולתמונת פרופיל. אין שימוש במצלמה
            ברקע ואין שיתוף התמונות לצדדים שלישיים למטרות פרסום.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-navy">יצירת קשר</h2>
          <p>
            לשאלות בנוגע למדיניות זו:{" "}
            <a
              className="font-semibold text-orange underline-offset-2 hover:underline"
              href="mailto:privacy@altmangroup.co.il"
            >
              privacy@altmangroup.co.il
            </a>
          </p>
        </section>
      </div>

      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-orange px-6 text-sm font-bold text-white"
      >
        חזרה למסך הכניסה
      </Link>
    </main>
  );
}
