/**
 * Halaman meja registrasi (admin). Dipakai d/admin.html dan m/admin.html.
 * Password disimpan di sessionStorage, hilang saat tab ditutup.
 */
(function (R) {
  var $ = R.$, $$ = R.$$;
  var pw = '';
  var data = null;
  var timer = null;
  var sibuk = false;
  var KEY = 'rkw_admin_pw';

  document.addEventListener('DOMContentLoaded', function () {
    try { pw = sessionStorage.getItem(KEY) || ''; } catch (e) {}
    if (pw) masuk(true); else R.show('#login-view', true);
  });

  function api(action, d) {
    return R.api(action, Object.assign({ password: pw }, d || {}));
  }

  async function masuk(otomatis) {
    if (!otomatis) pw = $('#f-password').value;
    if (!pw) return;
    var btn = $('#btn-login');
    btn.disabled = true;
    $('#login-err').hidden = true;
    try {
      await api('login');
      try { sessionStorage.setItem(KEY, pw); } catch (e) {}
      R.show('#login-view', false);
      R.show('#dash-view', true);
      await refresh();
      clearInterval(timer);
      timer = setInterval(function () { if (!sibuk && !document.hidden) refresh(true); }, 20000);
    } catch (e) {
      try { sessionStorage.removeItem(KEY); } catch (er) {}
      R.show('#login-view', true);
      R.show('#dash-view', false);
      $('#login-err').textContent = e.message;
      $('#login-err').hidden = false;
    } finally {
      btn.disabled = false;
    }
  }

  async function refresh(diam) {
    var btn = $('#btn-refresh');
    if (btn) btn.classList.add('berputar');
    try {
      data = await api('adminData');
      render();
    } catch (e) {
      if (!diam) R.toast(e.message, 'bad');
      if (/password/i.test(e.message)) keluar();
    } finally {
      if (btn) btn.classList.remove('berputar');
    }
  }

  function keluar() {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    clearInterval(timer);
    pw = '';
    $('#f-password').value = '';
    R.show('#dash-view', false);
    R.show('#login-view', true);
  }

  /* ---------- Render ---------- */

  function render() {
    var list = data.pendaftaran;
    var peserta = [].concat.apply([], list.map(function (r) { return r.peserta; }));
    var hadir = peserta.filter(function (p) { return p.hadir; }).length;
    var lunas = list.filter(function (r) { return r.statusBayar === 'Lunas'; }).length;
    var cek = list.filter(function (r) { return r.statusBayar === 'Menunggu Verifikasi'; }).length;

    $('#stat-pimpinan').textContent = list.length;
    $('#stat-peserta').textContent = peserta.length;
    $('#stat-hadir').textContent = hadir + ' / ' + peserta.length;
    $('#stat-lunas').textContent = lunas + ' / ' + list.length;
    $('#stat-cek').textContent = cek;
    $('#last-update').textContent = 'Diperbarui ' + data.diperbarui.slice(-5) + ' WITA';

    var tg = $('#toggle-absen');
    tg.checked = data.absenBuka;
    $('#absen-status').textContent = data.absenBuka ? 'Absensi DIBUKA' : 'Absensi DITUTUP';
    $('#absen-status').className = 'absen-status ' + (data.absenBuka ? 'buka' : 'tutup');

    var q = $('#q').value.trim().toLowerCase();
    var filter = $('#filter').value;
    var html = list.map(function (r) {
      var cocokPimpinan = !q || r.pimpinan.toLowerCase().indexOf(q) > -1 || r.id.toLowerCase().indexOf(q) > -1;
      var orang = r.peserta.filter(function (p) {
        if (filter === 'belum-hadir' && p.hadir) return false;
        if (filter === 'hadir' && !p.hadir) return false;
        return cocokPimpinan || p.nama.toLowerCase().indexOf(q) > -1;
      });
      if (filter === 'belum-lunas' && r.statusBayar === 'Lunas') return '';
      if (filter === 'cek' && r.statusBayar !== 'Menunggu Verifikasi') return '';
      if ((filter === 'belum-hadir' || filter === 'hadir' || q) && !orang.length) return '';
      return kartu(r, orang);
    }).join('');

    $('#list').innerHTML = html || '<div class="kosong">' +
      (list.length ? 'Tidak ada data yang cocok.' : 'Belum ada pendaftar.') + '</div>';
  }

  function kartu(r, orang) {
    var h = r.peserta.filter(function (p) { return p.hadir; }).length;
    var tombolBayar = r.statusBayar === 'Lunas'
      ? '<button class="btn btn-ghost btn-sm" data-act="batal-lunas" data-id="' + R.esc(r.id) + '" data-bukti="' + (r.bukti ? 1 : 0) + '">Batalkan lunas</button>'
      : '<button class="btn btn-primary btn-sm" data-act="lunas" data-id="' + R.esc(r.id) + '">Tandai lunas</button>';
    var berkas = '<a class="link" href="' + R.esc(r.suratMandat) + '" target="_blank" rel="noopener">Surat mandat</a>' +
      (r.bukti ? '<a class="link" href="' + R.esc(r.bukti) + '" target="_blank" rel="noopener">Bukti transfer</a>' : '');

    return '<article class="kartu">' +
      '<header class="kartu-head">' +
        '<div><div class="kartu-id">' + R.esc(r.id) + ' · ' + R.esc(r.waktu) + '</div>' +
        '<h3>' + R.esc(r.pimpinan) + '</h3></div>' +
        '<div class="kartu-hadir">' + h + '/' + r.peserta.length + ' hadir</div>' +
      '</header>' +
      '<div class="kartu-bayar">' +
        '<div class="bayar-info">' + R.badgeBayar(r.statusBayar) +
          '<span class="bayar-total">' + R.rupiah(r.total) + '</span>' +
          '<span class="muted">' + R.esc(r.metode) + ' · SWP ' + R.rupiah(r.swp) + ' &times; ' + r.jumlah + ' + SWO ' + R.rupiah(r.swo) + '</span>' +
        '</div>' +
        '<div class="bayar-aksi">' + berkas + tombolBayar + '</div>' +
      '</div>' +
      '<ul class="peserta">' + orang.map(function (p) {
        return '<li class="' + (p.hadir ? 'hadir' : '') + '">' +
          '<span class="dot"></span>' +
          '<span class="p-nama">' + R.esc(p.nama) + '</span>' +
          '<span class="p-ket">' + (p.hadir ? R.esc(p.waktuHadir.slice(-5)) + ' · ' + R.esc(p.cara) : 'Belum hadir') + '</span>' +
          (p.hadir
            ? '<button class="btn btn-ghost btn-sm" data-act="batal-hadir" data-id="' + R.esc(p.id) + '" data-nama="' + R.esc(p.nama) + '">Batal</button>'
            : '<button class="btn btn-outline btn-sm" data-act="hadir" data-id="' + R.esc(p.id) + '">Absenkan</button>') +
          '</li>';
      }).join('') + '</ul>' +
    '</article>';
  }

  /* ---------- Aksi ---------- */

  document.addEventListener('click', async function (e) {
    if (e.target.closest('#btn-login')) { e.preventDefault(); masuk(); return; }
    if (e.target.closest('#btn-logout')) { keluar(); return; }
    if (e.target.closest('#btn-refresh')) { refresh(); return; }

    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act');
    var id = b.getAttribute('data-id');
    var aksi;

    if (act === 'lunas') {
      if (!confirm('Tandai ' + id + ' sebagai LUNAS?')) return;
      aksi = api('setBayar', { id: id, status: 'Lunas' });
    } else if (act === 'batal-lunas') {
      if (!confirm('Batalkan status lunas ' + id + '?')) return;
      aksi = api('setBayar', { id: id, status: b.getAttribute('data-bukti') === '1' ? 'Menunggu Verifikasi' : 'Belum Bayar' });
    } else if (act === 'hadir') {
      aksi = api('absenManual', { idPeserta: id, hadir: true });
    } else if (act === 'batal-hadir') {
      if (!confirm('Batalkan kehadiran ' + b.getAttribute('data-nama') + '?')) return;
      aksi = api('absenManual', { idPeserta: id, hadir: false });
    }
    if (!aksi) return;

    sibuk = true;
    b.disabled = true;
    b.textContent = '...';
    try {
      await aksi;
      await refresh();
    } catch (err) {
      R.toast(err.message, 'bad');
      b.disabled = false;
    } finally {
      sibuk = false;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches('#f-password')) { e.preventDefault(); masuk(); }
  });

  document.addEventListener('input', function (e) {
    if (e.target.matches('#q') && data) render();
  });

  document.addEventListener('change', async function (e) {
    if (e.target.matches('#filter') && data) render();
    if (e.target.matches('#toggle-absen')) {
      var buka = e.target.checked;
      if (!confirm(buka ? 'Buka absensi sekarang? Peserta bisa absen lewat scan QR.' : 'Tutup absensi? Scan QR tidak bisa dipakai lagi.')) {
        e.target.checked = !buka;
        return;
      }
      e.target.disabled = true;
      try {
        await api('setAbsen', { buka: buka });
        await refresh();
        R.toast(buka ? 'Absensi dibuka.' : 'Absensi ditutup.', 'ok');
      } catch (err) {
        e.target.checked = !buka;
        R.toast(err.message, 'bad');
      } finally {
        e.target.disabled = false;
      }
    }
  });
})(window.RKW);
