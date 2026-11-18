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

  // Format file yang diterima (harus sama dengan TIPE_MANDAT / TIPE_BUKTI di Code.gs)
  R.TIPE_MANDAT = { tipe: ['application/pdf'], pesan: 'Surat mandat harus berformat PDF.' };
  R.TIPE_BUKTI = {
    tipe: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    pesan: 'Format harus PDF, JPG, PNG, WEBP, atau HEIC.'
  };

  /** Tipe file; kalau browser tidak mengenali (sering terjadi pada HEIC), tebak dari ekstensi */
  R.tipeFile = function (file) {
    if (file.type) return file.type;
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    return { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      webp: 'image/webp', heic: 'image/heic', heif: 'image/heif' }[ext] || '';
  };

  /** Cek file, kembalikan pesan error atau '' kalau aman. */
  R.cekFile = function (file, maksMB, aturan) {
    if (!file) return 'File belum dipilih.';
    if (aturan.tipe.indexOf(R.tipeFile(file)) < 0) return aturan.pesan;
    if (file.size > maksMB * 1024 * 1024) return 'Ukuran maksimal ' + maksMB + ' MB.';
    return '';
  };

  /** File -> {name, type, data(base64)} untuk dikirim ke Apps Script */
  R.fileKePayload = function (file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () {
        resolve({ name: file.name, type: R.tipeFile(file), data: String(fr.result).split(',')[1] });
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

  var IKON = {
    tanya: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg>',
    bahaya: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/></svg>',
    qr: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg>'
  };

  /**
   * Pop-up pengganti confirm() bawaan browser.
   * R.konfirmasi({ judul, pesan, ok, batal, bahaya, ikon, isi }) -> Promise<boolean>
   * isi = HTML tambahan (opsional), batal: false = tanpa tombol batal
   */
  R.konfirmasi = function (o) {
    o = o || {};
    return new Promise(function (resolve) {
      var latar = document.createElement('div');
      latar.className = 'modal-latar';
      latar.innerHTML =
        '<div class="modal" role="dialog" aria-modal="true">' +
          '<div class="modal-ikon' + (o.bahaya ? ' bahaya' : '') + '">' + IKON[o.ikon || (o.bahaya ? 'bahaya' : 'tanya')] + '</div>' +
          '<h3>' + R.esc(o.judul || 'Yakin?') + '</h3>' +
          (o.pesan ? '<p class="modal-pesan">' + R.esc(o.pesan) + '</p>' : '') +
          (o.isi ? '<div class="modal-isi">' + o.isi + '</div>' : '') +
          '<div class="modal-aksi">' +
            (o.batal === false ? '' : '<button class="btn btn-ghost" data-jawab="0">' + R.esc(o.batal || 'Batal') + '</button>') +
            '<button class="btn ' + (o.bahaya ? 'btn-bahaya' : 'btn-primary') + '" data-jawab="1">' + R.esc(o.ok || 'Ya, lanjutkan') + '</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(latar);
      requestAnimationFrame(function () { latar.classList.add('tampil'); });
      latar.querySelector('[data-jawab="1"]').focus();

      function tutup(hasil) {
        document.removeEventListener('keydown', tombol);
        latar.classList.remove('tampil');
        setTimeout(function () { latar.remove(); }, 220);
        resolve(hasil);
      }
      function tombol(e) { if (e.key === 'Escape') tutup(false); }
      document.addEventListener('keydown', tombol);
      latar.addEventListener('click', function (e) {
        if (e.target === latar) return tutup(false);
        var b = e.target.closest('[data-jawab]');
        if (b) tutup(b.getAttribute('data-jawab') === '1');
      });
      if (o.saatTampil) o.saatTampil(latar);
    });
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
