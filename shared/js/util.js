/* Fungsi bantu yang dipakai semua halaman. */
window.RKW = window.RKW || {};

(function (R) {
  /** "mUHAMMAD   arif" -> "Muhammad Arif" (sama persis dengan backend) */
  R.rapikanNama = function (s) {
    return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase()
      .replace(/(^|[\s.\-(])(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); });
  };

  R.rupiah = function (n) {
    return 'Rp' + (Number(n) || 0).toLocaleString('id-ID');
  };

  R.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  R.$ = function (sel, root) { return (root || document).querySelector(sel); };
  R.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  R.show = function (el, yes) {
    if (typeof el === 'string') el = R.$(el);
    if (el) el.hidden = !yes;
  };

  R.TIPE_FILE = ['application/pdf', 'image/jpeg', 'image/png'];

  /** Cek file, kembalikan pesan error atau '' kalau aman. */
  R.cekFile = function (file, maksMB) {
    if (!file) return 'File belum dipilih.';
    if (R.TIPE_FILE.indexOf(file.type) < 0) return 'Format harus PDF, JPG, atau PNG.';
    if (file.size > maksMB * 1024 * 1024) return 'Ukuran maksimal ' + maksMB + ' MB.';
    return '';
  };

  /** File -> {name, type, data(base64)} untuk dikirim ke Apps Script */
  R.fileKePayload = function (file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () {
        resolve({ name: file.name, type: file.type, data: String(fr.result).split(',')[1] });
      };
      fr.onerror = function () { reject(new Error('Gagal membaca file.')); };
      fr.readAsDataURL(file);
    });
  };

  R.ukuran = function (b) {
    return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.ceil(b / 1024) + ' KB';
  };

  /** ID acak per perangkat, dipakai untuk membatasi 1 HP = 1 absen */
  R.deviceId = function () {
    var k = 'rkw_device';
    try {
      var v = localStorage.getItem(k);
      if (!v) {
        v = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(k, v);
      }
      return v;
    } catch (e) {
      return '';
    }
  };

  R.simpan = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  R.ambil = function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };

  var toastTimer;
  R.toast = function (msg, jenis) {
    var t = R.$('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = 'toast show ' + (jenis || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 3500);
  };

  R.badgeBayar = function (status) {
    var cls = status === 'Lunas' ? 'ok' : (status === 'Menunggu Verifikasi' ? 'warn' : 'bad');
    return '<span class="badge ' + cls + '">' + R.esc(status || '-') + '</span>';
  };

  /** Link "ganti tampilan" di bawah halaman */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-ganti-tampilan]');
    if (!a) return;
    e.preventDefault();
    var ke = a.getAttribute('data-ganti-tampilan');
    try { localStorage.setItem('rkw_tampilan', ke); } catch (err) {}
    var file = location.pathname.split('/').pop() || 'index.html';
    location.href = '../' + ke + '/' + file + location.search;
  });

  /** Tampilkan banner mode demo */
  document.addEventListener('DOMContentLoaded', function () {
    if (window.RKW_CONFIG && !window.RKW_CONFIG.API_URL) {
      var b = document.createElement('div');
      b.className = 'demo-banner';
      b.textContent = 'Mode demo: API_URL belum diisi, data hanya tersimpan di browser ini.';
      document.body.prepend(b);
    }
  });
})(window.RKW);
