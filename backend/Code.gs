/**
 * Backend Rakerwil PW IPM Kalimantan Timur
 * Google Apps Script yang terikat (bound) ke Google Sheets.
 *
 * Cara pasang ada di README.md bagian "Setup Backend".
 *
 * PENTING: password admin TIDAK ditulis di file ini.
 * Atur lewat Project Settings > Script Properties > ADMIN_PASSWORD.
 */

/* =====================================================================
 * PENGATURAN ACARA — UBAH BAGIAN INI SAJA
 * ===================================================================== */
const CONFIG = {
  NAMA_ACARA: 'Rapat Kerja Wilayah',
  PENYELENGGARA: 'Pimpinan Wilayah Ikatan Pelajar Muhammadiyah Kalimantan Timur',

  // Nominal dalam rupiah, tulis angka saja tanpa titik. Contoh: 50000
  SWP: 0, // Sumbangan Wajib Perorangan (dikali jumlah nama)
  SWO: 0, // Sumbangan Wajib Organisasi (sekali per pimpinan)

  // Rekening tujuan transfer
  BANK: '',
  NO_REKENING: '',
  ATAS_NAMA: '',

  // Kalimat yang muncul kalau peserta pilih bayar di tempat
  BATAS_BAYAR_OFFLINE: 'Paling lambat saat registrasi ulang di hari pelaksanaan.',

  // Daftar asal pimpinan (muncul di dropdown form)
  PIMPINAN: [
    'Pimpinan Daerah IPM Kota Samarinda',
    'Pimpinan Daerah IPM Kota Balikpapan',
    'Pimpinan Daerah IPM Kota Bontang',
    'Pimpinan Daerah IPM Kabupaten Penajam Paser Utara',
    'Pimpinan Daerah IPM Kabupaten Paser',
    'Pimpinan Daerah IPM Kabupaten Berau',
    'Pimpinan Daerah IPM Kabupaten Kutai Kartanegara',
    'Pimpinan Daerah IPM Kabupaten Kutai Timur'
  ],

  MAKS_NAMA: 30,     // batas jumlah nama per pendaftaran
  MAKS_FILE_MB: 5,   // batas ukuran file upload

  // ID folder Google Drive untuk simpan berkas. Kosongkan = dibuat otomatis.
  FOLDER_ID: '',

  // true = surat mandat & bukti transfer bisa dibuka siapa pun yang punya link
  // (biar panitia meja registrasi bisa lihat tanpa minta akses).
  BERKAS_BISA_DIBUKA_DENGAN_LINK: true,

  ZONA_WAKTU: 'Asia/Makassar' // WITA
};
/* ===================================================================== */

const SHEET_DAFTAR = 'Pendaftaran';
const SHEET_PESERTA = 'Peserta';
const HEAD_DAFTAR = [
  'ID Pendaftaran', 'Waktu Daftar', 'Asal Pimpinan', 'Jumlah Peserta',
  'SWP per Orang', 'Total SWP', 'SWO', 'Total Bayar', 'Metode Bayar',
  'Status Bayar', 'Surat Mandat', 'Bukti Transfer', 'Waktu Lunas'
];
const HEAD_PESERTA = [
  'ID Peserta', 'ID Pendaftaran', 'Nama', 'Asal Pimpinan',
  'Status Hadir', 'Waktu Hadir', 'Cara Absen', 'ID Perangkat'
];
const STATUS_BAYAR = ['Belum Bayar', 'Menunggu Verifikasi', 'Lunas'];

const ACTIONS = {
  config: config_,
  daftar: daftar_,
  absenNama: absenNama_,
  absen: absen_,
  login: function () { return true; },
  adminData: adminData_,
  setAbsen: setAbsen_,
  setBayar: setBayar_,
  absenManual: absenManual_
};
const ADMIN_ACTIONS = ['login', 'adminData', 'setAbsen', 'setBayar', 'absenManual'];

/* ---------- Entry point ---------- */

function doGet(e) {
  return handle_(Object.assign({ action: 'config' }, (e && e.parameter) || {}));
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return out_({ ok: false, error: 'Format permintaan tidak valid.' });
  }
  return handle_(body);
}

function handle_(p) {
  try {
    const fn = ACTIONS[p.action];
    if (!fn) throw new Error('Aksi tidak dikenal.');
    if (ADMIN_ACTIONS.indexOf(p.action) > -1) cekAdmin_(p.password);
    return out_({ ok: true, data: fn(p) });
  } catch (err) {
    return out_({ ok: false, error: err.message });
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Jalankan sekali dari editor untuk membuat sheet, folder, dan memberi izin. */
function setup() {
  sheet_(SHEET_DAFTAR, HEAD_DAFTAR);
  sheet_(SHEET_PESERTA, HEAD_PESERTA);
  const f = folder_();
  Logger.log('Siap. Folder berkas: ' + f.getUrl());
}

/* ---------- Publik ---------- */

function config_() {
  const terdaftar = rows_(SHEET_DAFTAR, HEAD_DAFTAR).map(function (r) { return r[2]; });
  return {
    namaAcara: CONFIG.NAMA_ACARA,
    penyelenggara: CONFIG.PENYELENGGARA,
    swp: Number(CONFIG.SWP) || 0,
    swo: Number(CONFIG.SWO) || 0,
    bank: CONFIG.BANK,
    noRekening: CONFIG.NO_REKENING,
    atasNama: CONFIG.ATAS_NAMA,
    batasBayarOffline: CONFIG.BATAS_BAYAR_OFFLINE,
    pimpinan: CONFIG.PIMPINAN,
    terdaftar: terdaftar,
    maksNama: CONFIG.MAKS_NAMA,
    maksFileMB: CONFIG.MAKS_FILE_MB,
    absenBuka: absenBuka_()
  };
}

function daftar_(p) {
  const pimpinan = String(p.pimpinan || '').trim();
  if (CONFIG.PIMPINAN.indexOf(pimpinan) < 0) throw new Error('Asal pimpinan tidak valid.');

  const nama = (p.nama || []).map(rapikanNama_).filter(String);
  if (!nama.length) throw new Error('Isi minimal satu nama peserta.');
  if (nama.length > CONFIG.MAKS_NAMA) throw new Error('Maksimal ' + CONFIG.MAKS_NAMA + ' nama.');
  const unik = {};
  nama.forEach(function (n) {
    const k = n.toLowerCase();
    if (unik[k]) throw new Error('Nama "' + n + '" ditulis lebih dari sekali.');
    unik[k] = true;
  });

  const metode = p.metode === 'transfer' ? 'transfer' : (p.metode === 'offline' ? 'offline' : '');
  if (!metode) throw new Error('Pilih metode pembayaran.');
  if (!p.suratMandat) throw new Error('Surat mandat wajib diunggah.');
  if (metode === 'transfer' && !p.bukti) throw new Error('Bukti transfer wajib diunggah.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = sheet_(SHEET_DAFTAR, HEAD_DAFTAR);
    const data = sh.getDataRange().getValues();
    const sudah = data.slice(1).some(function (r) { return r[2] === pimpinan; });
    if (sudah) throw new Error(pimpinan + ' sudah terdaftar. Hubungi panitia kalau ada perubahan data.');

    const id = 'RKW-' + ('00' + data.length).slice(-3);
    const folder = folder_();
    const urlMandat = simpanFile_(folder, p.suratMandat, id + ' - Surat Mandat - ' + pimpinan);
    const urlBukti = metode === 'transfer'
      ? simpanFile_(folder, p.bukti, id + ' - Bukti Transfer - ' + pimpinan) : '';

    const swp = Number(CONFIG.SWP) || 0;
    const swo = Number(CONFIG.SWO) || 0;
    const totalSwp = swp * nama.length;
    const total = totalSwp + swo;
    const status = metode === 'transfer' ? 'Menunggu Verifikasi' : 'Belum Bayar';
    const now = new Date();

    sh.appendRow([
      id, now, pimpinan, nama.length, swp, totalSwp, swo, total,
      metode === 'transfer' ? 'Transfer' : 'Bayar di Tempat',
      status, urlMandat, urlBukti, ''
    ]);

    const shp = sheet_(SHEET_PESERTA, HEAD_PESERTA);
    const rows = nama.map(function (n, i) {
      return [id + '-' + (i + 1), id, n, pimpinan, 'Belum Hadir', '', '', ''];
    });
    shp.getRange(shp.getLastRow() + 1, 1, rows.length, HEAD_PESERTA.length).setValues(rows);

    return {
      id: id, pimpinan: pimpinan, nama: nama, swp: swp, swo: swo,
      totalSwp: totalSwp, total: total, metode: metode, statusBayar: status,
      waktu: fmt_(now)
    };
  } finally {
    lock.releaseLock();
  }
}

function absenNama_(p) {
  cekAbsenBuka_();
  const pimpinan = String(p.pimpinan || '');
  return rows_(SHEET_PESERTA, HEAD_PESERTA)
    .filter(function (r) { return r[3] === pimpinan; })
    .map(function (r) { return { id: r[0], nama: r[2], hadir: r[4] === 'Hadir' }; });
}

function absen_(p) {
  cekAbsenBuka_();
  const id = String(p.idPeserta || '');
  const deviceId = String(p.deviceId || '');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = sheet_(SHEET_PESERTA, HEAD_PESERTA);
    const data = sh.getDataRange().getValues();
    let idx = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) idx = i;
      if (deviceId && data[i][7] === deviceId && data[i][4] === 'Hadir' && data[i][0] !== id) {
        throw new Error('HP ini sudah dipakai absen atas nama ' + data[i][2] +
          '. Satu HP untuk satu peserta, silakan ke meja registrasi.');
      }
    }
    if (idx < 0) throw new Error('Data peserta tidak ditemukan.');
    const r = data[idx];
    if (r[4] === 'Hadir') throw new Error(r[2] + ' sudah tercatat hadir pukul ' + fmtJam_(r[5]) + '.');

    const now = new Date();
    sh.getRange(idx + 1, 5, 1, 4).setValues([['Hadir', now, 'Scan QR', deviceId]]);

    const d = rows_(SHEET_DAFTAR, HEAD_DAFTAR).filter(function (x) { return x[0] === r[1]; })[0] || [];
    return {
      nama: r[2], pimpinan: r[3], waktu: fmt_(now),
      statusBayar: d[9] || '', totalBayar: Number(d[7]) || 0
    };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Admin ---------- */

function adminData_() {
  const peserta = rows_(SHEET_PESERTA, HEAD_PESERTA);
  const list = rows_(SHEET_DAFTAR, HEAD_DAFTAR).map(function (r) {
    return {
      id: r[0], waktu: fmt_(r[1]), pimpinan: r[2], jumlah: Number(r[3]) || 0,
      swp: Number(r[4]) || 0, totalSwp: Number(r[5]) || 0, swo: Number(r[6]) || 0,
      total: Number(r[7]) || 0, metode: r[8], statusBayar: r[9],
      suratMandat: r[10], bukti: r[11], waktuLunas: fmt_(r[12]),
      peserta: peserta.filter(function (x) { return x[1] === r[0]; }).map(function (x) {
        return { id: x[0], nama: x[2], hadir: x[4] === 'Hadir', waktuHadir: fmt_(x[5]), cara: x[6] };
      })
    };
  });
  return { absenBuka: absenBuka_(), pendaftaran: list, diperbarui: fmt_(new Date()) };
}

function setAbsen_(p) {
  PropertiesService.getScriptProperties().setProperty('ABSEN_BUKA', p.buka ? 'true' : 'false');
  return { absenBuka: absenBuka_() };
}

function setBayar_(p) {
  if (STATUS_BAYAR.indexOf(p.status) < 0) throw new Error('Status bayar tidak valid.');
  const sh = sheet_(SHEET_DAFTAR, HEAD_DAFTAR);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === p.id) {
      sh.getRange(i + 1, 10).setValue(p.status);
      sh.getRange(i + 1, 13).setValue(p.status === 'Lunas' ? new Date() : '');
      return true;
    }
  }
  throw new Error('Pendaftaran tidak ditemukan.');
}

function absenManual_(p) {
  const sh = sheet_(SHEET_PESERTA, HEAD_PESERTA);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === p.idPeserta) {
      const v = p.hadir
        ? ['Hadir', new Date(), 'Manual (Meja Registrasi)', '']
        : ['Belum Hadir', '', '', ''];
      sh.getRange(i + 1, 5, 1, 4).setValues([v]);
      return true;
    }
  }
  throw new Error('Peserta tidak ditemukan.');
}

/* ---------- Helper ---------- */

function cekAdmin_(pw) {
  const asli = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!asli) throw new Error('Password admin belum diatur di Script Properties.');
  if (String(pw || '') !== asli) throw new Error('Password salah.');
}

function absenBuka_() {
  return PropertiesService.getScriptProperties().getProperty('ABSEN_BUKA') === 'true';
}

function cekAbsenBuka_() {
  if (!absenBuka_()) throw new Error('Absensi sedang ditutup.');
}

function sheet_(nama, head) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(nama);
  if (!sh) {
    sh = ss.insertSheet(nama);
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function rows_(nama, head) {
  const sh = sheet_(nama, head);
  const v = sh.getDataRange().getValues();
  return v.slice(1).filter(function (r) { return r[0] !== ''; });
}

function folder_() {
  if (CONFIG.FOLDER_ID) return DriveApp.getFolderById(CONFIG.FOLDER_ID);
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* folder terhapus, buat baru */ }
  }
  const f = DriveApp.createFolder('Berkas Rakerwil PW IPM Kaltim');
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}

function simpanFile_(folder, f, nama) {
  const tipe = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png' };
  if (!f || !tipe[f.type]) throw new Error('Format file harus PDF, JPG, atau PNG.');
  const bytes = Utilities.base64Decode(f.data);
  if (bytes.length > CONFIG.MAKS_FILE_MB * 1024 * 1024) {
    throw new Error('Ukuran file maksimal ' + CONFIG.MAKS_FILE_MB + ' MB.');
  }
  const file = folder.createFile(Utilities.newBlob(bytes, f.type, nama + tipe[f.type]));
  if (CONFIG.BERKAS_BISA_DIBUKA_DENGAN_LINK) {
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) { /* akun organisasi bisa melarang berbagi publik */ }
  }
  return file.getUrl();
}

/** "mUHAMMAD   arif" -> "Muhammad Arif" */
function rapikanNama_(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase()
    .replace(/(^|[\s.\-(])(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); });
}

function fmt_(d) {
  if (!(d instanceof Date)) return d ? String(d) : '';
  return Utilities.formatDate(d, CONFIG.ZONA_WAKTU, 'dd/MM/yyyy HH:mm');
}

function fmtJam_(d) {
  if (!(d instanceof Date)) return '-';
  return Utilities.formatDate(d, CONFIG.ZONA_WAKTU, 'HH:mm') + ' WITA';
}
