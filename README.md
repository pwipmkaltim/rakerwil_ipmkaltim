# Pendaftaran & Absensi Rakerwil PW IPM Kalimantan Timur

Website statis (GitHub Pages) untuk pendaftaran peserta Rapat Kerja Wilayah per pimpinan dan absensi saat hari H. Datanya disimpan di Google Sheets lewat Google Apps Script.

## Halaman

| Alamat | Untuk | Isi |
|---|---|---|
| `index.html` | Pimpinan | Form pendaftaran: asal pimpinan, nama peserta, surat mandat, lalu pembayaran SWP/SWO |
| `absen.html` | Peserta di hari H | Dibuka dari scan QR. Pilih asal pimpinan, pilih nama, tekan Saya Hadir |
| `admin.html` | Panitia meja registrasi | Login password. Buka/tutup absensi, lihat status hadir dan bayar, tandai lunas, absen manual |
| `cetak-qr.html` | Panitia | QR statis menuju `absen.html`, siap dicetak A4 |

Ketiga halaman pertama otomatis mengarahkan ke tampilan HP (`m/`) atau desktop (`d/`). Di bawah setiap halaman ada link untuk pindah tampilan secara manual.

## Struktur folder

```
index.html, absen.html, admin.html   pintu masuk, deteksi perangkat
cetak-qr.html                        halaman cetak QR absensi
d/                                   tampilan desktop (HTML + css/desktop.css)
m/                                   tampilan mobile  (HTML + css/mobile.css)
shared/css/base.css                  warna dan komponen bersama
shared/js/config.js                  URL backend
shared/js/util.js                    fungsi bantu (rapikan nama, rupiah, dll)
shared/js/api.js                     pemanggil backend
shared/js/mock.js                    backend tiruan untuk mode demo
shared/js/daftar.js                  logika form pendaftaran
shared/js/absen.js                   logika absensi
shared/js/admin.js                   logika meja registrasi
backend/Code.gs                      kode Google Apps Script
```

Halaman `d/` dan `m/` memakai ID elemen yang sama, jadi logika JS cukup ditulis sekali di `shared/js/`.

## Yang perlu diganti nanti

| Mau ganti apa | File | Bagian |
|---|---|---|
| Nominal SWP & SWO | `backend/Code.gs` (di editor Apps Script) | `CONFIG.SWP`, `CONFIG.SWO` |
| Bank, nomor rekening, atas nama | `backend/Code.gs` | `CONFIG.BANK`, `CONFIG.NO_REKENING`, `CONFIG.ATAS_NAMA` |
| Daftar asal pimpinan | `backend/Code.gs` | `CONFIG.PIMPINAN` |
| Kalimat batas bayar di tempat | `backend/Code.gs` | `CONFIG.BATAS_BAYAR_OFFLINE` |
| Password admin | Apps Script > Project Settings > Script Properties | `ADMIN_PASSWORD` |
| URL backend | `shared/js/config.js` | `API_URL` |
| Warna hijau | `shared/css/base.css` | `--g1` dan `--g2` di `:root` |

Setelah mengubah `Code.gs` di editor Apps Script, lakukan **Deploy > Manage deployments > Edit > Version: New version > Deploy**. Kalau tidak, perubahan tidak terbaca website.

Catatan: salinan `backend/Code.gs` di repo ini bersifat publik. Jangan tulis password di file itu.

## Setup backend

1. Buat Google Sheets baru (misal "Database Rakerwil").
2. Buka **Extensions > Apps Script**. Hapus isi `Code.gs` bawaan, tempel isi `backend/Code.gs` dari repo ini.
3. Isi bagian `CONFIG` (nominal, rekening). Boleh dikosongkan dulu.
4. **Project Settings** (ikon roda gigi):
   - Time zone: `(GMT+08:00) Makassar`
   - Script Properties > Add: `ADMIN_PASSWORD` = password pilihanmu
5. Kembali ke editor, pilih fungsi `setup` lalu **Run**. Izinkan akses Sheets dan Drive. Sheet `Pendaftaran`, `Peserta`, dan folder Drive untuk berkas akan dibuat otomatis.
6. **Deploy > New deployment > Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Salin URL yang berakhiran `/exec`, tempel ke `API_URL` di `shared/js/config.js`, commit, push.

Selama `API_URL` kosong, website berjalan dalam **mode demo**: data hanya disimpan di browser yang sedang dipakai, password admin `admin`. Mode ini cuma untuk melihat tampilan.

## Data di Google Sheets

- **Pendaftaran**: satu baris per pimpinan. Kolom `Status Bayar` berisi `Belum Bayar`, `Menunggu Verifikasi`, atau `Lunas`. Boleh diubah langsung dari Sheets, asal tulisannya persis sama.
- **Peserta**: satu baris per nama, berisi status hadir, waktu hadir, dan cara absen (Scan QR atau Manual).

Surat mandat dan bukti transfer masuk ke folder Drive "Berkas Rakerwil PW IPM Kaltim". Link-nya bisa dibuka siapa saja yang memegang link (bisa dimatikan lewat `CONFIG.BERKAS_BISA_DIBUKA_DENGAN_LINK`).

## Aturan yang berlaku

- Satu pimpinan hanya bisa mendaftar sekali. Pimpinan yang sudah terdaftar muncul abu-abu di dropdown. Kalau ada perubahan, hapus barisnya di kedua sheet lalu daftar ulang, atau edit langsung di Sheets.
- Nama otomatis dirapikan: `mUHAMMAD   arif` jadi `Muhammad Arif`.
- Total = SWP × jumlah nama + SWO. Tetap berlaku walau yang datang hanya satu orang.
- Halaman pendaftaran selalu terbuka. Halaman absensi hanya bisa dipakai setelah dibuka dari `admin.html`.

## Soal QR statis

QR statis cuma berisi link, jadi tidak bisa membedakan orang yang benar-benar di lokasi dengan orang yang menerima foto QR dari grup. Deteksi IP juga tidak membantu karena peserta memakai wifi atau jaringan seluler yang sama. Pengaman yang dipasang:

1. Absensi hanya aktif saat dibuka panitia. Buka ketika registrasi dimulai, tutup setelah selesai.
2. Satu HP hanya bisa mengabsenkan satu nama.
3. Nama yang sudah hadir tidak bisa diabsen ulang.
4. Panitia bisa membatalkan kehadiran yang janggal dan mengabsenkan manual dari meja registrasi.

## Menjalankan di komputer sendiri

```bash
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000`.
