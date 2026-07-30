# AGENTS.md

Repo ini adalah source code ekstensi Firefox **Cowl** (Privacy Blur & Lock for WhatsApp/Telegram Web).
Spesifikasi produk ada di `PRD.md`, aturan kerja/scope ada di `SKILL.md` (skill: `cowl-extension-dev`).
**Baca `PRD.md` dan `SKILL.md` sebelum menyentuh kode apa pun** — keduanya adalah sumber kebenaran untuk scope, tech stack, dan gaya kode di repo ini, lebih diprioritaskan daripada asumsi default agent.

---

## 0. Urutan Baca Wajib

1. `PRD.md` — requirement, storage schema, struktur direktori resmi, roadmap phase.
2. `SKILL.md` — guardrail scope, tech stack yang mengunci, prinsip kode bersih/hemat token.
3. `manifest.json` (kalau sudah ada) — sumber kebenaran permission & entry point aktual, bisa berbeda dari draft di PRD kalau PRD belum di-sync.
4. File ini (`AGENTS.md`) — command eksekusi konkret.

Kalau ada konflik antara PRD/SKILL dan kode aktual di repo, **tanyakan ke user**, jangan pilih sepihak salah satu yang "kelihatan lebih benar".

---

## 1. Struktur Proyek (Bukan Monorepo)

Ini **single-package WebExtension**, bukan monorepo. Tidak ada workspace, tidak ada package terpisah untuk popup/options/content — semuanya satu `package.json` di root.

```
cowl-extension/
├── manifest.json
├── package.json
├── web-ext-config.js          # config untuk web-ext (run/lint/build)
├── tailwind.config.js
├── _locales/en/messages.json
├── assets/
│   ├── icons/
│   └── css/
│       ├── tailwind.css       # HASIL BUILD — jangan edit manual, edit source Tailwind
│       └── injected-blur.css  # ditulis manual (bukan hasil build Tailwind)
├── background/background.js
├── content/
│   ├── blur-whatsapp.js
│   ├── blur-telegram.js
│   └── lockscreen.js
├── popup/{popup.html,popup.js,popup.css}
└── options/{options.html,options.js,options.css}
```

**Batas tanggung jawab file (jangan dilanggar):**

- `content/blur-*.js` hanya urus DOM observer + inject class blur. Tidak boleh berisi logic password/hash.
- `background/background.js` satu-satunya tempat yang boleh baca/tulis `security.*` di storage dan panggil `browser.identity` / `browser.management`.
- `popup/*` dan `options/*` tidak boleh langsung akses `browser.storage.local` untuk data security — selalu lewat message passing ke background (lihat PRD 7 — Messaging).
- `lockscreen.js` di-share ke kedua content script (WhatsApp & Telegram) — perubahan di sini berdampak ke dua platform sekaligus, jadi hati-hati saat edit.

---

## 2. Command Build / Test / Lint / Typecheck

> Belum ada `package.json` di repo ini. Sebelum menjalankan command apa pun, cek dulu apakah `package.json` sudah ada:
>
> - **Kalau sudah ada** → baca `scripts` di dalamnya, itu yang jadi sumber kebenaran, bukan daftar di bawah ini.
> - **Kalau belum ada** → gunakan daftar di bawah sebagai baseline yang konsisten dengan stack di PRD/SKILL, dan buat `package.json` sesuai ini kecuali user minta lain.

```bash
# Install deps
npm install

# Build Tailwind CSS (source -> assets/css/tailwind.css)
npm run build:css
# setara: npx tailwindcss -i ./assets/css/tailwind.src.css -o ./assets/css/tailwind.css --minify

# Jalankan extension di Firefox instance sementara (hot reload content/background)
npm run dev
# setara: npx web-ext run --source-dir=./ 

# Lint — WAJIB sebelum submit, ini yang menentukan lolos/tidaknya review Mozilla AMO
npm run lint
# setara: npx web-ext lint --source-dir=./

# Build paket .xpi untuk submit ke AMO
npm run build
# setara: npx web-ext build --source-dir=./ --artifacts-dir=./dist

# Tidak ada TypeScript di stack ini (vanilla JS ES6+ sesuai SKILL.md) — TIDAK ADA typecheck command.
# Kalau ke depan project butuh typecheck, itu perubahan tech stack — diskusikan dulu, jangan diam-diam tambah TS.
```

**Urutan yang benar sebelum menganggap kerjaan selesai:** `build:css` (kalau ada perubahan style) → `lint` → manual test di `dev` → baru serahkan ke user. Jangan skip `web-ext lint` — ini proxy paling dekat untuk kelolosan review AMO (lihat PRD section 6 & Risiko).

---

## 3. Quirk Framework & Toolchain

- **Manifest V3 Firefox, bukan Chrome.** API kadang berbeda (`browser.*` namespace pakai Promise langsung, bukan callback seperti `chrome.*`). Jangan copy-paste contoh kode Chrome tanpa adaptasi.
- **Tidak boleh ada `eval()`, `new Function()`, atau inline `<script>` di HTML** — Mozilla AMO review menolak ini otomatis. Ini bukan preferensi gaya, ini hard requirement.
- **`web_accessible_resources` dan remote code dilarang** — semua JS harus dibundel di dalam paket ekstensi, tidak ada `<script src="https://...">`.
- **Tailwind di sini di-compile ke file statis** (`assets/css/tailwind.css`), tidak pakai JIT runtime di browser. Kalau menambah class Tailwind baru di HTML/JS, harus rebuild (`npm run build:css`) atau class itu tidak akan muncul di paket final.
- **`browser.identity.launchWebAuthFlow`** butuh redirect URI dalam format `https://<extension-id>.extensions.allizom.org/` (Firefox) — beda dengan Chrome. ID ekstensi baru fix setelah signing/submit pertama ke AMO, jadi untuk development lokal biasanya perlu extension ID sementara yang di-set manual di `manifest.json` (`browser_specific_settings.gecko.id`).
- **DOM WhatsApp/Telegram Web berubah tanpa notice.** Kalau selector tiba-tiba tidak match saat testing manual, itu bukan bug di kode kita — cek dulu apakah struktur DOM upstream berubah sebelum "memperbaiki" logic yang sebenarnya sudah benar.

---

## 4. Testing Setup & Fixtures

Tidak ada unit test framework di scope PRD v1.0 (lihat SKILL.md — jangan tambah test scaffolding kalau tidak diminta). Testing dilakukan manual:

- **Manual smoke test wajib** setelah perubahan di `content/*` atau `background/*`:
  1. `npm run dev` → Firefox terbuka dengan ekstensi ter-load.
  2. Buka `web.whatsapp.com` DAN `web.telegram.org` — dua-duanya, jangan cuma satu, karena logic sering di-duplikasi per platform.
  3. Test blur (hover on/off), lock (idle timer & manual lock), dan — kalau relevan — flow reset password Google serta konfirmasi password uninstall.
- **Tidak ada mock data/fixture DOM** disiapkan di repo ini karena struktur DOM WhatsApp/Telegram tidak bisa disimulasikan secara stabil — testing harus terhadap web app aslinya secara live.
- Kalau user secara eksplisit minta ditambahkan unit test (misalnya untuk modul hashing di `background.js` yang tidak bergantung DOM), itu boleh, tapi scope-nya terbatas ke pure-function (hash, salt generation) — bukan DOM observer.

---

## 5. CI Workflow

Belum ada CI dikonfigurasi di repo ini. Kalau/ketika ditambahkan, minimal harus menjalankan:

```yaml
# urutan step minimum yang harus ada di CI, dengan/tanpa tool CI spesifik apa pun
- npm install
- npm run build:css
- npm run lint      # web-ext lint — gate wajib, jangan biarkan CI hijau kalau ini gagal
- npm run build     # pastikan .xpi berhasil dibuat
```

Jangan tambahkan step CI untuk deployment otomatis ke AMO tanpa persetujuan eksplisit user — submission ke AMO store biasanya tetap manual per kebijakan review Mozilla.

---

## 6. Konvensi yang Beda dari Default Bahasa/Tooling

- **Komentar minim.** Lihat SKILL.md section 3 — komentar hanya untuk alasan non-obvious atau catatan keamanan/batasan, bukan penjelasan baris-per-baris.
- **Tidak ada file dibuat di luar struktur PRD section 7.2** tanpa alasan eksplisit — jangan menambahkan folder `utils/`, `lib/`, `helpers/` generik "just in case".
- **Semua string password/hash/salt hanya boleh disentuh di `background/background.js`.** Kalau menemukan kode yang mengakses `security.passwordHash` dari popup/options langsung, itu pelanggaran arsitektur — perbaiki jadi lewat message passing, jangan dibiarkan.
- **Tidak ada dependency baru** (npm package) ditambahkan di luar yang disebut di PRD/SKILL (Tailwind, web-ext) tanpa konfirmasi user — termasuk library hashing pihak ketiga, karena PRD eksplisit mewajibkan Web Crypto API native.
- **Bahasa commit/PR description bebas**, tapi nama variabel/fungsi tetap pakai bahasa Inggris (konsisten dengan konvensi WebExtension API yang berbahasa Inggris) — jangan campur `variabelKunci` dengan `secretKey` dalam file yang sama.

---

*Dokumen ini mengikuti PRD.md v1.0 dan SKILL.md (`cowl-extension-dev`). Kalau salah satu dari keduanya diupdate, cek ulang apakah bagian command/struktur di sini masih akurat.*
