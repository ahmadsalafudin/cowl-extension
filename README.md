# Cowl — Secure Messaging Privacy Extension for Firefox

Cowl adalah ekstensi Firefox yang memberikan lapisan privasi tambahan untuk WhatsApp Web dan Telegram Web. Bekerja dengan dua mekanisme utama:

1. **Blur Engine** — otomatis mengaburkan pesan, nama kontak, dan media agar tidak terbaca sekilas (shoulder surfing protection). Efek blur hilang saat di-hover.
2. **Lock System** — mengunci akses ke halaman messaging dengan password terenkripsi (SHA-256 + salt), dilengkapi auto-lock berbasis idle timer.

Semua data disimpan lokal di `browser.storage.local`. Tidak ada server eksternal.

## Tech Stack

| Layer         | Teknologi                                              |
| ------------- | ------------------------------------------------------ |
| Manifest      | Manifest V3 (WebExtensions API)                        |
| UI            | HTML5 + vanilla JavaScript (ES6+) + Tailwind CSS v3    |
| Hashing       | Web Crypto API (`crypto.subtle`, SHA-256 + salt)     |
| Storage       | `browser.storage.local`                              |
| Messaging     | `browser.runtime.sendMessage` / `onMessage`        |
| Auth Recovery | `browser.identity.launchWebAuthFlow` (OAuth2 + PKCE) |
| Build/Package | web-ext, Tailwind CLI                                  |

## Cara Menjalankan

```bash
# 1. Install dependencies
npm install

# 2. Build Tailwind CSS (dijalankan sekali, atau setiap kali ada perubahan class Tailwind)
npm run build:css

# 3. Jalankan extension di Firefox instance sementara (hot reload)
npm run dev

# 4. Lint — wajib sebelum submit ke AMO
npm run lint

# 5. Build paket .xpi untuk distribusi
npm run build
# Hasil: dist/cowl_-_secure_messaging_privacy-1.0.0.zip
```

## Struktur Direktori

```
cowl-extension/
├── manifest.json
├── _locales/en/messages.json
├── assets/
│   ├── icons/                    # Icon extension (16, 48, 128px)
│   └── css/
│       ├── tailwind.css          # Compiled Tailwind (jangan edit manual)
│       ├── tailwind.src.css      # Source Tailwind
│       └── injected-blur.css     # CSS blur & lockscreen (di-inject ke halaman)
├── background/
│   └── background.js             # State, idle timer, hashing, message hub, OAuth
├── content/
│   ├── blur-whatsapp.js          # DOM observer & blur engine WhatsApp
│   ├── blur-telegram.js          # DOM observer & blur engine Telegram
│   └── lockscreen.js             # Fullscreen password overlay
├── popup/
│   ├── popup.html                # Quick control popup
│   ├── popup.js
│   └── popup.css
└── options/
    ├── options.html              # Admin dashboard
    ├── options.js
    └── options.css
```

## Catatan Penting

- **Client ID Google OAuth** masih placeholder di `background.js`. Ganti dengan client ID real dari Google Cloud Console sebelum fitur reset password Google berfungsi.
- Extension ini khusus Firefox (Manifest V3, `browser.*` API). Tidak kompatibel dengan Chrome/Edge tanpa adaptasi.
- Proteksi uninstall hanya berlaku untuk tombol "Hapus Extension" di dalam UI Cowl, tidak untuk uninstall via `about:addons`.
