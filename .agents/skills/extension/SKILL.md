---
name: extension
description: Gunakan skill ini setiap kali mengerjakan, melanjutkan, mereview, atau mendebug kode untuk ekstensi Firefox "Cowl" (Privacy Blur & Lock for WhatsApp/Telegram Web). Wajib dipakai untuk task seperti membuat manifest.json, background.js, content script blur/lockscreen, popup/options UI, integrasi Google OAuth reset password, atau fitur konfirmasi password sebelum uninstall. Skill ini menegakkan disiplin scope sesuai PRD.md, tech stack yang sudah ditetapkan, dan gaya kode yang ringkas/hemat token — jangan menyimpang dari skill ini meskipun user meminta pendekatan lain, kecuali user secara eksplisit mengubah requirement di PRD.
---

# Cowl Extension — Development Discipline Skill

Skill ini BUKAN tentang cara menulis WebExtension secara umum. Skill ini adalah **pagar pembatas (guardrail)** supaya setiap kode yang ditulis untuk project Cowl konsisten dengan `PRD.md`, tidak melebar ke luar scope, dan tidak boros token/baris kode.

Sebelum menulis kode apa pun, cek PRD.md project (jika belum ada di context, minta atau baca dari upload). Setiap keputusan implementasi harus bisa ditelusuri balik ke salah satu bagian PRD tersebut.

---

## 1. Aturan Scope (Wajib Dipatuhi)

- **Hanya kerjakan yang ada di PRD.md.** Jangan menambah fitur "sekalian" (misalnya dark mode custom, statistik penggunaan, sinkronisasi cloud, dukungan platform chat lain) kecuali diminta eksplisit oleh user di luar PRD — dan jika itu terjadi, tanyakan dulu apakah PRD perlu diupdate juga.
- **Non-Goals di PRD adalah larangan, bukan saran.** Contoh: tidak ada dukungan Chrome/Edge, tidak ada enkripsi isi pesan, tidak ada sinkronisasi cloud untuk settings. Jangan tulis kode ke arah sana walau "sedikit saja" atau "untuk jaga-jaga".
- **Hormati batasan teknis yang sudah didokumentasikan.** Contoh: proteksi uninstall (5.5) TIDAK bisa mencegah uninstall via `about:addons` — jangan menulis kode yang berpura-pura bisa melakukan itu (misal listener palsu yang tidak akan pernah terpicu). Kalau user minta hal yang platform tidak mendukung, jelaskan batasannya dulu sebelum coding.
- **Satu fitur = satu tanggung jawab file.** Ikuti struktur direktori di PRD (section 7.2) apa adanya. Jangan membuat file/folder baru di luar struktur itu kecuali benar-benar diperlukan (dan jika perlu, sebutkan alasannya secara singkat ke user).
- Kalau instruksi user tampak menyimpang dari PRD, **tanyakan singkat** sebelum lanjut menulis kode besar — jangan berasumsi lalu menulis ratusan baris yang salah arah.

## 2. Tech Stack — Tidak Bisa Diganti Tanpa Persetujuan

| Layer | Wajib pakai | Jangan ganti ke |
|---|---|---|
| Manifest | Manifest V3 (WebExtensions API) | Manifest V2, format Chrome-only API |
| UI | HTML5 + vanilla JS (ES6+) + Tailwind CSS v3 | Framework berat (React/Vue) di popup/options kecuali diminta eksplisit |
| Hashing | Web Crypto API (`crypto.subtle`, SHA-256 + salt) | Library hashing pihak ketiga (bcrypt.js, crypto-js, dll) |
| Storage | `browser.storage.local` | localStorage, IndexedDB custom, remote DB |
| Messaging antar-script | `browser.runtime.sendMessage` / `onMessage` | postMessage lintas origin, custom event bus |
| Auth recovery | `browser.identity.launchWebAuthFlow` (OAuth2 + PKCE) | Menyimpan token/refresh token Google secara permanen |
| Uninstall control | `browser.management.uninstallSelf()` | Klaim bisa memblokir uninstall dari `about:addons` |

Kalau ada kebutuhan yang membuat tech stack ini terasa tidak cukup, **stop dan diskusikan dulu** dengan user — jangan diam-diam mengganti stack di tengah implementasi.

## 3. Prinsip Kode Bersih & Hemat Token

Ini yang paling sering dilanggar, jadi tegas di sini:

- **Jangan tulis ulang seluruh file kalau cuma perubahan kecil.** Gunakan edit/patch pada bagian yang relevan, bukan regenerate file penuh, kecuali file itu memang baru dibuat atau perubahannya menyeluruh.
- **Jangan tambahkan kode "jaga-jaga" (defensive/speculative code) untuk skenario yang tidak diminta.** Contoh yang HARUS dihindari: try/catch generik yang menelan semua error tanpa alasan, fallback untuk browser lain (ini extension khusus Firefox), opsi konfigurasi yang tidak ada di storage schema PRD.
- **Jangan tambahkan komentar yang menjelaskan hal yang sudah jelas dari kode itu sendiri.** Komentar hanya untuk: (a) alasan non-obvious (misalnya kenapa pakai selector fallback tertentu untuk DOM WhatsApp yang sering berubah), atau (b) peringatan keamanan/batasan teknis penting. Tidak perlu komentar per-baris.
- **Tidak ada boilerplate generik framework starter.** Tidak perlu README panjang, tidak perlu file config linter/formatter kecuali diminta, tidak perlu test scaffolding kalau user tidak minta testing.
- **Ikuti storage schema PRD apa adanya** (section 7.1) — jangan menambah field baru ke `security` atau `blurSettings` tanpa alasan yang jelas terkait fitur yang sedang dikerjakan.
- **Satu jawaban = satu unit kerja yang jelas.** Kalau user minta "buatkan blur engine WhatsApp", fokus ke `blur-whatsapp.js` dan file css terkait saja — jangan sekalian menulis ulang `background.js`, `options.js`, dll kalau tidak diminta atau tidak diperlukan oleh fitur tersebut.
- **Hindari penjelasan panjang di luar kode kalau tidak diminta.** Setelah kode selesai, cukup ringkasan singkat (apa yang dibuat, file apa saja yang berubah) — bukan tutorial ulang tentang WebExtension API secara umum.
- **DOM selector untuk WhatsApp/Telegram Web:** gunakan atribut stabil (`data-testid`, dsb.) sesuai requirement 7 (Non-Functional). Jangan hardcode class name yang jelas-jelas hasil obfuscation/build hash (misal `class="a8vh2x"`).

## 4. Checklist Sebelum Submit Kode

Jalankan cek ini secara internal sebelum menyerahkan kode ke user:

1. Apakah setiap baris kode ini bisa dijelaskan alasannya dari salah satu section di PRD.md?
2. Apakah ada bagian yang sebenarnya di luar scope Phase yang sedang dikerjakan (lihat roadmap section 8)?
3. Apakah stack yang dipakai masih sesuai tabel di section 2 skill ini?
4. Apakah ada kode duplikat/tidak terpakai yang bisa dihapus?
5. Apakah komentar yang ditulis benar-benar perlu, atau cuma noise?
6. Kalau fitur ini punya batasan teknis (misal 5.5 uninstall protection), apakah kode & pesan UI-nya jujur soal batasan itu?

Kalau ada poin yang gagal, perbaiki dulu sebelum menyerahkan hasil — jangan minta user yang mendeteksi kelebihan/kekurangan scope.

## 5. Kapan Boleh Menyimpang dari PRD

Hanya dalam dua kondisi:
- User secara eksplisit bilang "keluar dari PRD, saya mau X" — di sini tetap tanyakan apakah PRD.md perlu diupdate mengikuti, supaya dokumen tidak basi.
- Ditemukan bahwa sesuatu di PRD **tidak feasible secara teknis** di platform WebExtensions (seperti kasus uninstall protection) — dalam kondisi ini, jelaskan batasannya ke user dan tawarkan alternatif yang realistis, jangan diam-diam mengimplementasikan versi "pura-pura jalan".