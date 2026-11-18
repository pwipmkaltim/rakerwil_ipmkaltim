/**
 * Backend tiruan untuk MODE DEMO (API_URL kosong).
 * Logikanya meniru backend/Code.gs, datanya disimpan di localStorage.
 * Tidak dipakai sama sekali setelah API_URL diisi.
 */
window.RKW = window.RKW || {};

(function (R) {
  var DEMO = {
    namaAcara: 'Rapat Kerja Wilayah',
    penyelenggara: 'Pimpinan Wilayah Ikatan Pelajar Muhammadiyah Kalimantan Timur',
    swp: 50000,
    swo: 150000,
    bank: 'Bank Contoh',
    noRekening: '1234567890',
    atasNama: 'Bendahara PW IPM Kaltim',
    batasBayarOffline: 'Paling lambat saat registrasi ulang di hari pelaksanaan.',
    pimpinan: [
      'PD IPM Samarinda',
      'PD IPM Balikpapan',
      'PD IPM Bontang',
      'PD IPM Penajam Paser Utara',
      'PD IPM Paser',
      'PD IPM Berau',
      'PD IPM Kutai Kartanegara',
      'PD IPM Kutai Timur'
    ],
    maksNama: 30,
    maksFileMB: 5,
    password: 'admin'
  };
  var KEY = 'rkw_demo_db';

  function db() {
    return R.ambil(KEY) || { daftar: [], peserta: [], absenBuka: false };
  }
  function save(d) { R.simpan(KEY, d); }
  function now() {
    var d = new Date();
    var p = function (n) { return ('0' + n).slice(-2); };
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function wait() { return new Promise(function (r) { setTimeout(r, 450); }); }

  var A = {
    config: function () {
      var d = db();
      var c = Object.assign({}, DEMO);
      delete c.password;
      c.terdaftar = d.daftar.map(function (x) { return x.pimpinan; });
      c.absenBuka = d.absenBuka;
      return c;
    },
    daftar: function (p) {
      var d = db();
      if (DEMO.pimpinan.indexOf(p.pimpinan) < 0) throw new Error('Asal pimpinan tidak valid.');
      var nama = (p.nama || []).map(R.rapikanNama).filter(String);
      if (!nama.length) throw new Error('Isi minimal satu nama peserta.');
      if (d.daftar.some(function (x) { return x.pimpinan === p.pimpinan; })) {
        throw new Error(p.pimpinan + ' sudah terdaftar. Hubungi panitia kalau ada perubahan data.');
      }
      var maks = d.daftar.reduce(function (m, x) { var n = parseInt(x.id.replace(/\D/g, ''), 10); return n > m ? n : m; }, 0);
      var id = 'RKW-' + ('00' + (maks + 1)).slice(-3);
      var totalSwp = DEMO.swp * nama.length;
      var r = {
        id: id, waktu: now(), pimpinan: p.pimpinan, jumlah: nama.length, swp: DEMO.swp,
        totalSwp: totalSwp, swo: DEMO.swo, total: totalSwp + DEMO.swo,
        metode: p.metode === 'transfer' ? 'Transfer' : 'Bayar di Tempat',
        statusBayar: p.metode === 'transfer' ? 'Menunggu Verifikasi' : 'Belum Bayar',
        suratMandat: '#demo-surat-mandat', bukti: p.metode === 'transfer' ? '#demo-bukti' : '', waktuLunas: ''
      };
      d.daftar.push(r);
      nama.forEach(function (n, i) {
        d.peserta.push({ id: id + '-' + (i + 1), idDaftar: id, nama: n, pimpinan: p.pimpinan, hadir: false, waktuHadir: '', cara: '', device: '' });
      });
      save(d);
      return {
        id: id, pimpinan: p.pimpinan, nama: nama, swp: DEMO.swp, swo: DEMO.swo,
        totalSwp: totalSwp, total: r.total, metode: p.metode, statusBayar: r.statusBayar, waktu: r.waktu
      };
    },
    absenNama: function (p) {
      var d = db();
      if (!d.absenBuka) throw new Error('Absensi sedang ditutup.');
      return d.peserta.filter(function (x) { return x.pimpinan === p.pimpinan; })
        .map(function (x) { return { id: x.id, nama: x.nama, hadir: x.hadir }; });
    },
    absen: function (p) {
      var d = db();
      if (!d.absenBuka) throw new Error('Absensi sedang ditutup.');
      var lain = d.peserta.filter(function (x) { return p.deviceId && x.device === p.deviceId && x.hadir && x.id !== p.idPeserta; })[0];
      if (lain) throw new Error('HP ini sudah dipakai absen atas nama ' + lain.nama + '. Satu HP untuk satu peserta, silakan ke meja registrasi.');
      var x = d.peserta.filter(function (y) { return y.id === p.idPeserta; })[0];
      if (!x) throw new Error('Data peserta tidak ditemukan.');
      if (x.hadir) throw new Error(x.nama + ' sudah tercatat hadir pukul ' + x.waktuHadir.slice(-5) + ' WITA.');
      x.hadir = true; x.waktuHadir = now(); x.cara = 'Scan QR'; x.device = p.deviceId;
      save(d);
      var r = d.daftar.filter(function (y) { return y.id === x.idDaftar; })[0] || {};
      return { nama: x.nama, pimpinan: x.pimpinan, waktu: x.waktuHadir, statusBayar: r.statusBayar, totalBayar: r.total };
    },
    login: function () { return true; },
    adminData: function () {
      var d = db();
      return {
        absenBuka: d.absenBuka,
        diperbarui: now(),
        pendaftaran: d.daftar.map(function (r) {
          return Object.assign({}, r, {
            peserta: d.peserta.filter(function (x) { return x.idDaftar === r.id; })
              .map(function (x) { return { id: x.id, nama: x.nama, hadir: x.hadir, waktuHadir: x.waktuHadir, cara: x.cara }; })
          });
        })
      };
    },
    setAbsen: function (p) { var d = db(); d.absenBuka = !!p.buka; save(d); return { absenBuka: d.absenBuka }; },
    setBayar: function (p) {
      var d = db();
      var r = d.daftar.filter(function (x) { return x.id === p.id; })[0];
      if (!r) throw new Error('Pendaftaran tidak ditemukan.');
      r.statusBayar = p.status; r.waktuLunas = p.status === 'Lunas' ? now() : '';
      save(d); return true;
    },
    absenManual: function (p) {
      var d = db();
      var x = d.peserta.filter(function (y) { return y.id === p.idPeserta; })[0];
      if (!x) throw new Error('Peserta tidak ditemukan.');
      x.hadir = !!p.hadir; x.waktuHadir = p.hadir ? now() : ''; x.cara = p.hadir ? 'Manual (Meja Registrasi)' : ''; x.device = '';
      save(d); return true;
    }
  };
  var ADMIN = ['login', 'adminData', 'setAbsen', 'setBayar', 'absenManual'];

  R.mock = async function (body) {
    await wait();
    var fn = A[body.action];
    if (!fn) throw new Error('Aksi tidak dikenal.');
    if (ADMIN.indexOf(body.action) > -1 && body.password !== DEMO.password) throw new Error('Password salah.');
    return fn(body);
  };
})(window.RKW);
