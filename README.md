# Cowl — Secure Messaging Privacy Extension for Firefox

Cowl adalah ekstensi Firefox yang memberikan lapisan privasi tambahan untuk WhatsApp Web dan Telegram Web. Fiturnya:

**Blur Engine** — otomatis mengaburkan pesan, nama kontak, foto profil, dan media agar tidak terbaca sekilas (shoulder surfing protection). Efek blur hilang saat di-hover (atau selalu aktif, sesuai pengaturan). Intensitas, kecepatan animasi, dan elemen yang di-blur bisa diatur per aplikasi, dan setiap perubahan langsung berlaku tanpa reload.

Fitur lain:

- **Blur darurat** — tekan `Esc` dua kali cepat di halaman WhatsApp/Telegram (atau tombol di popup) meng-blur seluruh halaman seketika, apa pun setting-nya. Tekan lagi untuk membuka. Hanya berlaku di tab aktif.
- **Blur saat idle** — halaman ditutup blur setelah tidak ada aktivitas (default 1 menit); gerak mouse atau ketik langsung membukanya.
- **Reveal** — On hover, On click (klik baris/pesan untuk membuka, klik lagi untuk menutup), atau Never.
- **Preset & backup** — preset Light / Normal / Paranoid, serta ekspor/impor setting ke file JSON (data impor divalidasi ulang di background).

Semua data disimpan lokal di `browser.storage.local`. Tidak ada server eksternal.

## Tech Stack

| Layer         | Teknologi                                              |
| ------------- | ------------------------------------------------------ |
| Manifest      | Manifest V3 (WebExtensions API)                        |
| UI            | HTML5 + vanilla JavaScript (ES6+) + Tailwind CSS v3    |
| Storage       | `browser.storage.local`                              |
| Messaging     | `browser.runtime.sendMessage` / `onMessage`        |
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

# 5. Build paket untuk distribusi (lihat "Build & Distribusi" di bawah)
npm run build
```

## Build & Distribusi

### Hasil build

`npm run build` menghasilkan satu file di folder **`dist/`** (dibuat otomatis kalau belum ada):

```
dist/cowl_-_secure_messaging_privacy-<versi>.zip
```

Nama file diambil dari `name` dan `version` di `manifest.json`, jadi versi 1.2.0 menjadi `dist/cowl_-_secure_messaging_privacy-1.2.0.zip`. File versi lama di `dist/` tidak ikut terhapus.

File itu adalah paket ekstensi yang belum ditandatangani. `.xpi` pada dasarnya zip yang sama, tetapi Firefox biasa (Release/Beta) hanya mau memasang `.xpi` yang sudah **ditandatangani Mozilla**. Jadi mengganti nama `.zip` menjadi `.xpi` saja tidak cukup.

### Cara mendapatkan `.xpi` yang bisa dipasang

1. Naikkan `version` di `manifest.json`, `package.json` dan `package-lock.json`. Setiap upload ke AMO harus memakai versi yang belum pernah dipakai.
2. Jalankan `npm run build:css`, `npm run lint`, lalu `npm run build`.
3. Pilih salah satu:
   - **Lewat web:** buka [addons.mozilla.org/developers](https://addons.mozilla.org/developers/), pilih **Submit a New Add-on** (atau **Upload New Version** untuk update), unggah file zip dari `dist/`, lalu pilih distribusi **On your own** (tidak tampil di galeri AMO). Setelah lolos pemeriksaan otomatis, unduh `.xpi` yang sudah ditandatangani dari halaman versi tersebut.
   - **Lewat terminal:** buat API key di [Developer Hub](https://addons.mozilla.org/developers/addon/api/key/), lalu jalankan:
     ```bash
     npx web-ext sign --source-dir=./ --artifacts-dir=./dist --channel=unlisted \
       --api-key=<JWT issuer> --api-secret=<JWT secret>
     ```
     Hasilnya `.xpi` bertanda tangan di `dist/`. Jangan simpan API key/secret di repo.
4. Pasang `.xpi` dengan menyeretnya ke jendela Firefox, atau lewat `about:addons` > ikon gerigi > **Install Add-on From File**.

Untuk listing publik di galeri AMO, pilih **On this site** saat submit. Prosesnya sama, tetapi melewati review yang lebih ketat.

### Uji coba tanpa tanda tangan

Buka `about:debugging#/runtime/this-firefox`, klik **Load Temporary Add-on**, lalu pilih `manifest.json` dari folder proyek. Ekstensi aktif sampai Firefox ditutup. Setelah mengubah kode, klik **Reload** di halaman yang sama, lalu reload tab WhatsApp/Telegram.

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
│       └── injected-blur.css     # Engine blur: semua selector ada di sini (di-inject ke halaman)
├── background/
│   └── background.js             # Penyimpanan setting blur & message hub
├── content/
│   └── blur.js                   # Mengatur state blur di <html> (selector ada di injected-blur.css)
├── popup/
│   ├── popup.html                # Quick control popup
│   ├── popup.js
│   └── popup.css
└── options/
    ├── options.html              # Halaman pengaturan blur
    ├── options.js
    └── options.css
```

## Catatan Penting

- Selector DOM WhatsApp/Telegram bisa berubah kapan saja karena situs mengganti markup. Kalau ada elemen yang tidak ter-blur, perbaiki selector-nya di `assets/css/injected-blur.css`.
- Extension ini khusus Firefox (Manifest V3, `browser.*` API). Tidak kompatibel dengan Chrome/Edge tanpa adaptasi.
