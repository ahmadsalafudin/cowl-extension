# Product Requirement Document (PRD)
## Cowl — Secure Messaging Privacy Extension for Firefox

**Versi Dokumen:** 1.0
**Status:** Draft
**Platform:** Firefox (WebExtensions, Manifest V3)

---

## 1. Ringkasan Eksekutif

**Cowl** adalah ekstensi Firefox yang memberikan lapisan privasi tambahan untuk aplikasi messaging berbasis web (WhatsApp Web & Telegram Web). Cowl bekerja dengan dua mekanisme utama:

1. **Blur Engine** — otomatis mengaburkan (blur) pesan, nama kontak, dan media agar tidak terbaca sekilas oleh orang di sekitar pengguna (shoulder surfing protection).
2. **Lock System** — mengunci akses ke halaman messaging dengan password/PIN terenkripsi, lengkap dengan auto-lock berbasis idle timer.

Nama "Cowl" merepresentasikan konsep "jubah/selubung" yang menutupi informasi sensitif pengguna dari pandangan yang tidak diinginkan.

---

## 2. Latar Belakang & Problem Statement

Banyak pengguna membuka WhatsApp Web / Telegram Web di lingkungan kerja atau publik (kantor, coworking space, kampus) di mana layar mereka bisa dilihat orang lain. Notifikasi preview, riwayat chat yang tetap terbuka, dan media pribadi berisiko terlihat tanpa sengaja. Saat ini tidak ada solusi bawaan dari WhatsApp/Telegram Web untuk:

- Menyembunyikan isi chat secara visual saat tidak sedang difokuskan.
- Mengunci akses sesi web tersebut dengan password terpisah dari akun.
- Mengatur otomatisasi lock berdasarkan waktu idle.

Cowl hadir untuk mengisi gap ini sebagai ekstensi ringan, aman, dan tidak bergantung pada server eksternal (fully local/offline).

---

## 3. Tujuan Produk (Goals)

| # | Tujuan | Metrik Keberhasilan |
|---|--------|----------------------|
| 1 | Mencegah kebocoran visual isi chat | Blur aktif default di semua elemen sensitif |
| 2 | Memberi proteksi akses berlapis | Lock screen tidak bisa di-bypass tanpa password benar |
| 3 | Menjaga performa web messaging | Tidak ada lag/input delay terukur akibat observer |
| 4 | Compliance dengan Mozilla AMO | Lolos review tanpa revisi keamanan |
| 5 | Kemudahan konfigurasi pengguna | Pengaturan granular per-platform di satu dashboard |

### Non-Goals (Di luar cakupan v1.0)
- Tidak mendukung browser selain Firefox (Chrome/Edge menyusul di versi terpisah).
- Tidak melakukan enkripsi terhadap isi pesan itu sendiri (bukan pengganti end-to-end encryption bawaan WhatsApp/Telegram).
- Tidak ada sinkronisasi cloud untuk pengaturan/password (murni lokal).

---

## 4. Target Pengguna & Use Case

**Persona utama:**
- Karyawan kantor yang sering membuka WhatsApp/Telegram Web di layar bersama/shared workspace.
- Pengguna yang meminjamkan laptop/PC ke orang lain sementara sesi messaging masih terbuka.
- Individu yang mengutamakan privasi percakapan dari pandangan sekilas (glance-proof).

**Use case utama:**
1. Pengguna membuka WhatsApp Web di kantor → pesan otomatis blur, hanya terlihat saat hover.
2. Pengguna meninggalkan meja → setelah idle 5 menit, layar terkunci otomatis dengan overlay password.
3. Pengguna kembali → memasukkan password untuk membuka blur/lock.

---

## 5. Ruang Lingkup Fitur (Functional Requirements)

### 5.1 Blur Engine
- Blur otomatis untuk: isi pesan, nama kontak/profil, thumbnail media (gambar/video).
- Efek blur hilang sementara saat elemen di-hover oleh cursor, kembali blur saat cursor menjauh.
- Radius blur dapat diatur pengguna (slider, default 8px).
- Pengaturan on/off terpisah per elemen (`blurMessages`, `blurNames`, `blurMedia`, `blurInput`) dan per platform (WhatsApp, Telegram).
- Menggunakan `MutationObserver` untuk menjaga blur tetap konsisten meskipun DOM berubah dinamis (infinite scroll, pesan baru masuk).

### 5.2 Lock & Security System
- Master password/PIN disimpan dalam bentuk hash (tidak pernah plain text).
- Overlay fullscreen lock screen yang menutupi seluruh konten halaman saat terkunci.
- Auto-lock berdasarkan:
  - Idle timer (default 5 menit, dapat diatur).
  - Opsional: lock saat tab/window kehilangan fokus (`lockOnBackground`).
- Tidak ada mekanisme bypass (misalnya lewat DevTools/reload) — lock state divalidasi ulang di background script.

### 5.3 Admin UI (Popup & Options Page)
- **Popup (Quick Panel):** toggle cepat aktif/nonaktifkan blur, tombol lock manual.
- **Options Page (Dashboard):**
  - Pengaturan radius blur.
  - Pengaturan waktu auto-lock.
  - Ganti password/PIN.
  - Manajemen pengaturan per-platform (WhatsApp vs Telegram).
  - Menu "Hubungkan Akun Google" (recovery) — lihat 5.4.
  - Menu "Hapus Extension" dengan konfirmasi password — lihat 5.5.

### 5.4 Reset Password via Login Google
- Saat setup awal (atau kapan saja lewat Options Page), pengguna dapat **menghubungkan akun Google** sebagai metode recovery jika lupa password/PIN.
- Alur teknis:
  1. Menggunakan `browser.identity.launchWebAuthFlow` (OAuth2 + PKCE, tanpa client secret di sisi ekstensi — sesuai standar public client).
  2. Setelah autentikasi berhasil, ekstensi mengambil **email** dari akun Google (via endpoint `userinfo` Google) dan menyimpan **hash dari email tersebut** sebagai `recoveryAccountHash` (bukan token, bukan email plain).
  3. Token OAuth **tidak disimpan** — hanya dipakai sesaat untuk verifikasi identitas, lalu dibuang setelah proses selesai (stateless verification).
- Alur "Lupa Password":
  1. Pengguna klik **"Reset via Google"** di lock screen atau options page.
  2. Pengguna login ulang dengan akun Google yang sama.
  3. Ekstensi cocokkan hash email hasil login dengan `recoveryAccountHash` tersimpan.
  4. Jika cocok → tampilkan form set password/PIN baru → generate `passwordHash` + `salt` baru.
  5. Jika tidak cocok / dibatalkan → reset ditolak, data & pengaturan lain tetap terkunci.
- **Fallback tanpa Google:** jika pengguna tidak menghubungkan akun Google, satu-satunya opsi reset adalah **hapus & instal ulang ekstensi** (semua pengaturan lokal hilang) — perilaku ini tetap dipertahankan sebagai fallback minimum.
- **Catatan keamanan:** fitur ini hanya untuk **verifikasi identitas**, bukan menyimpan kredensial Google. Tidak ada permission `identity.email` yang bocor ke storage dalam bentuk plain text.

### 5.5 Konfirmasi Password Sebelum Uninstall
- Ditambahkan menu **"Hapus Extension"** di Options Page yang meminta pengguna memasukkan password/PIN terlebih dahulu sebelum proses uninstall dijalankan.
- Jika password benar → ekstensi memanggil `browser.management.uninstallSelf({ showConfirmDialog: true })` untuk memulai proses uninstall resmi dari Firefox.
- Jika password salah → uninstall dibatalkan, tidak ada aksi lanjutan.
- **⚠️ Batasan teknis (penting):** WebExtensions API **tidak menyediakan hook untuk mencegah atau memvalidasi uninstall yang dilakukan lewat jalur `about:addons`** (klik kanan → Hapus, atau menu tiga titik → Kelola Ekstensi → Hapus). Proteksi password pada 5.5 **hanya berlaku untuk tombol "Hapus Extension" di dalam UI Cowl sendiri**, sebagai *soft deterrent* / lapisan konfirmasi tambahan — bukan proteksi penuh di level browser.
- Sebagai mitigasi tambahan (opsional, non-blocking):
  - Gunakan `browser.management.onUninstalled` untuk mengirim notifikasi lokal terakhir (best-effort, event ini terpicu *setelah* uninstall terjadi sehingga sifatnya informatif, bukan preventif).
  - Cantumkan penjelasan batasan ini secara transparan di Options Page agar ekspektasi pengguna sesuai dengan kemampuan platform.

---

## 6. Non-Functional Requirements

| Kategori | Requirement |
|----------|-------------|
| **Keamanan** | Password wajib di-hash dengan SHA-256 + unique salt via `crypto.subtle` (Web Crypto API). Tidak ada remote code execution atau inline dynamic script (sesuai kebijakan Mozilla AMO). |
| **Performa** | Content script observer harus ringan; tidak boleh menyebabkan lag atau input latency di UI chat. |
| **Resiliensi DOM** | WhatsApp Web & Telegram Web sering mengubah struktur DOM/class name. Wajib gunakan selector berbasis atribut (`data-testid`, dsb.) dan fallback yang robust. |
| **Kompatibilitas** | Manifest V3, mengikuti Mozilla Add-on Review Guidelines sepenuhnya. |
| **Privasi Data** | Semua data (password hash, pengaturan) disimpan lokal via `browser.storage.local`, tidak ada transmisi ke server eksternal. |

---

## 7. Arsitektur Teknis

```
+-----------------------------------------------------------------------+
|                         Cowl — Firefox Extension                      |
+-----------------------------------------------------------------------+
|  Frontend UI          : HTML5, JavaScript (ES6+), Tailwind CSS (v3)   |
|  Manifest Version     : Manifest V3 (WebExtensions API)               |
|  Security / Hashing   : SubtleCrypto API (SHA-256 with Salt)          |
|  Storage              : browser.storage.local                        |
|  Messaging            : browser.runtime.sendMessage / onMessage      |
+-----------------------------------------------------------------------+
```

### 7.1 Skema Penyimpanan (`browser.storage.local`)

```json
{
  "security": {
    "passwordHash": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
    "salt": "e4d909c290d0fb1ca068ffaddf22cbd0",
    "isLocked": true,
    "autoLockEnabled": true,
    "autoLockTimeoutMinutes": 5,
    "lockOnBackground": false,
    "recovery": {
      "googleLinked": true,
      "recoveryAccountHash": "f3c2a9e1b7d84f0a1c9e2b5d7a8f3c1e9b0d4a2f7c5e8b1d3a6f9c2e5b8d1a4f",
      "linkedAt": "2026-07-30T10:00:00Z"
    }
  },
  "blurSettings": {
    "enabled": true,
    "blurRadiusPx": 8,
    "whatsapp": {
      "blurMessages": true,
      "blurNames": true,
      "blurMedia": true,
      "blurInput": false
    },
    "telegram": {
      "blurMessages": true,
      "blurNames": true,
      "blurMedia": true,
      "blurInput": false
    }
  }
}
```

### 7.2 Struktur Direktori & File

```
cowl-extension/
├── manifest.json
├── _locales/
│   └── en/
│       └── messages.json
├── assets/
│   ├── icons/
│   │   ├── icon-16.png
│   │   ├── icon-48.png
│   │   └── icon-128.png
│   └── css/
│       ├── tailwind.css        # Compiled Tailwind CSS untuk Admin UI
│       └── injected-blur.css   # Dynamic blur style rules
├── background/
│   └── background.js           # State, idle timer, storage listener
├── content/
│   ├── blur-whatsapp.js        # DOM observer & CSS injection WhatsApp
│   ├── blur-telegram.js        # DOM observer & CSS injection Telegram
│   └── lockscreen.js           # Fullscreen password overlay generator
├── popup/
│   ├── popup.html              # Tailwind-styled quick control popup
│   ├── popup.js
│   └── popup.css
└── options/
    ├── options.html            # Tailwind Admin Panel Dashboard
    ├── options.js
    └── options.css
```

### 7.3 Referensi `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "Cowl - Secure Messaging Privacy",
  "version": "1.0.0",
  "description": "Blurs messages/media and adds password auto-lock protection for WhatsApp Web and Telegram Web.",
  "permissions": [
    "storage",
    "idle",
    "tabs",
    "identity",
    "management"
  ],
  "host_permissions": [
    "*://web.whatsapp.com/*",
    "*://web.telegram.org/*",
    "https://accounts.google.com/*",
    "https://www.googleapis.com/*"
  ],
  "background": {
    "scripts": ["background/background.js"]
  },
  "content_scripts": [
    {
      "matches": ["*://web.whatsapp.com/*"],
      "js": ["content/blur-whatsapp.js", "content/lockscreen.js"],
      "css": ["assets/css/injected-blur.css"],
      "run_at": "document_start"
    },
    {
      "matches": ["*://web.telegram.org/*"],
      "js": ["content/blur-telegram.js", "content/lockscreen.js"],
      "css": ["assets/css/injected-blur.css"],
      "run_at": "document_start"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon-16.png",
      "48": "assets/icons/icon-48.png",
      "128": "assets/icons/icon-128.png"
    }
  },
  "options_ui": {
    "page": "options/options.html",
    "open_in_tab": true
  }
}
```

---

## 8. Roadmap & Milestone Implementasi

```
+-------------------------------------------------------------------------+
| PHASE 1: Core Foundation & Manifest V3 Setup                           |
| - Setup manifest.json, arsitektur storage, modul hashing SHA-256.      |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| PHASE 2: Blur Engine Implementation                                     |
| - Riset DOM selector WhatsApp Web & Telegram Web.                       |
| - Implementasi CSS blur injection & MutationObserver.                   |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| PHASE 3: Security Lock & Auto-Lock Logic                                |
| - Injeksi overlay fullscreen lock screen.                               |
| - Idle timer & manajemen state lock di background.js.                   |
| - Integrasi OAuth2 Google (identity API) untuk reset password.          |
| - Menu "Hapus Extension" dengan konfirmasi password di Options Page.    |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| PHASE 4: Tailwind Admin UI & Options Page                               |
| - Compile Tailwind CSS untuk Admin Dashboard.                           |
| - Bangun Popup UI dan Options Page (blur settings, security config).    |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| PHASE 5: Testing & Firefox AMO Packaging                                |
| - Cross-domain testing, audit keamanan, pembuatan paket web-ext.        |
+-------------------------------------------------------------------------+
```

---

## 9. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| WhatsApp/Telegram Web mengubah struktur DOM | Blur/lock gagal berfungsi | Gunakan selector berbasis atribut stabil (`data-testid`) + fallback selector, monitoring rutin |
| Lupa master password | Pengguna terkunci dari fitur (bukan dari akun WA/Telegram) | Sediakan mekanisme reset password (hapus storage lokal via options page dengan konfirmasi eksplisit) |
| Observer terlalu berat | Lag saat mengetik/scroll chat | Debounce/throttle pada MutationObserver, batasi scope observasi ke elemen relevan saja |
| Ditolak Mozilla AMO review | Delay rilis | Hindari eval/inline script, ikuti checklist Manifest V3 & AMO guidelines sejak awal development |
| Pengguna mengira password bisa mencegah uninstall lewat `about:addons` | Ekspektasi pengguna tidak sesuai kemampuan platform | Jelaskan batasan secara eksplisit di UI (lihat 5.5) — WebExtensions API tidak punya hook untuk memblokir uninstall manual |
| Akun Google yang di-link hilang akses / lupa email | Pengguna tidak bisa reset password via Google | Sediakan fallback hapus & instal ulang ekstensi sebagai opsi terakhir |

---

## 10. Kriteria Sukses (Definition of Done v1.0)

- [ ] Blur aktif otomatis di WhatsApp Web & Telegram Web sesuai pengaturan default.
- [ ] Lock screen tidak dapat di-bypass melalui reload, DevTools, atau navigasi ulang.
- [ ] Password tersimpan dalam bentuk hash + salt, tidak pernah plain text.
- [ ] Auto-lock berdasarkan idle timer berjalan sesuai durasi yang dikonfigurasi.
- [ ] Popup & Options Page berfungsi penuh dengan Tailwind UI.
- [ ] Lolos review Mozilla AMO tanpa temuan keamanan mayor.
- [ ] Pengguna dapat menghubungkan akun Google dan berhasil reset password melalui alur OAuth2 tanpa menyimpan token/kredensial secara permanen.
- [ ] Menu "Hapus Extension" di Options Page meminta password dan hanya melanjutkan uninstall jika password benar.
- [ ] Batasan proteksi uninstall (tidak berlaku untuk `about:addons`) dijelaskan secara jelas di UI.

---

*Dokumen ini adalah hasil penyusunan ulang dari draft awal menjadi format PRD terstruktur untuk kebutuhan pengembangan ekstensi Cowl.*