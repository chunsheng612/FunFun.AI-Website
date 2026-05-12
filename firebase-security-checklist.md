# Firebase Security Checklist

1. Firestore 規則
- 於 Firebase Console -> Firestore -> Rules 套用 `firestore.rules`。

2. Authentication
- 僅啟用你需要的登入供應商（目前 Google）。
- 設定授權網域（Authorized domains）只包含你的正式網域與 localhost。

3. API key 認知
- Web `apiKey` 在前端可見是 Firebase 正常設計，不能當秘密。
- 真正安全邊界是 Firestore Rules + Auth + App Check（可選）。

4. 可選強化
- 啟用 App Check（reCAPTCHA v3）降低濫用。
- 在 Google Cloud Console 對 key 增加 HTTP referrer 限制（你的正式網域）。
