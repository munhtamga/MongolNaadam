# 🤼 Монгол Бөхийн Prediction Market

Telegram Mini App — барилдааны хэн давахыг урьдчилан таамаглах платформ.

---

## 🚀 Суулгах заавар

### 1-р алхам: Supabase тохируулах

1. [supabase.com](https://supabase.com) дээр бүртгэл үүсгэнэ
2. Шинэ project нэмнэ
3. **SQL Editor** хэсэгт ороод `supabase-schema.sql` файлын кодыг ажиллуулна
4. **Project Settings → API** хэсгээс:
   - `Project URL` хуулна
   - `anon public` key хуулна

### 2-р алхам: GitHub-т оруулах

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/ТАНЫ_НЭР/bokh-prediction.git
git push -u origin main
```

### 3-р алхам: Vercel-д deploy хийх

1. [vercel.com](https://vercel.com) дээр GitHub-аар нэвтэрнэ
2. "Import Project" → таны repo-г сонгоно
3. **Environment Variables** хэсэгт нэмнэ:
   - `VITE_SUPABASE_URL` = Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = Supabase anon key
4. Deploy дарна → URL авна (жишээ: `https://bokh.vercel.app`)

### 4-р алхам: Telegram Bot үүсгэх

1. Telegram дээр **@BotFather** -д бичнэ
2. `/newbot` → нэр өгнө → username өгнө
3. Token авна (жишээ: `7123456:AAF...`)
4. `/newapp` командаар Mini App нэмнэ:
   - Title: `Монгол Бөх`
   - Description: `Барилдааны урьдчилан таамаглал`
   - URL: Vercel URL-аа тавина
5. Bot-оо Telegram группдээ нэмнэ
6. `/start` эсвэл Mini App товч дарахад апп нээгдэнэ!

---

## 📱 Функцүүд

- ✅ Барилдааны жагсаалт харах
- ✅ Хэн давахыг санал өгөх (нэг хүн нэг санал)
- ✅ Санал хувиар харах (60% vs 40%)
- ✅ Давагч тэмдэглэх → түүхэнд шилжих
- ✅ Шинэ барилдаан нэмэх
- ✅ Realtime шинэчлэгдэх
- ✅ Telegram хэрэглэгчийн ID-р давхар санал хориглох
