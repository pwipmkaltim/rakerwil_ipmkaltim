/**
 * Logika halaman absen (dibuka dari scan QR statis).
 * Dipakai d/absen.html dan m/absen.html.
 */
(function (R) {
  var $ = R.$, $$ = R.$$;
  var cfg = null;
  var dipilih = null;
  var KEY = 'rkw_absen';

  document.addEventListener('DOMContentLoaded', muat);

  function view(nama) {
    ['#loading', '#error-box', '#v-tutup', '#v-sudah', '#v-form', '#v-hasil'].forEach(function (v) {
      R.show(v, v === nama);
    });
  }

  async function muat() {
    view('#loading');
    try {
      cfg = await R.api('config');
    } catch (e) {
      $('#error-msg').textContent = e.message;
      view('#error-box');
      return;
    }
    $$('[data-isi]').forEach(function (el) {
      var v = cfg[el.getAttribute('data-isi')];
      if (v) el.textContent = v;
    });

    var sudah = R.ambil(KEY);
    if (sudah) {
      $('#sudah-nama').textContent = sudah.nama;
      $('#sudah-pimpinan').textContent = sudah.pimpinan;
      $('#sudah-waktu').textContent = sudah.waktu + ' WITA';
      view('#v-sudah');
      return;
    }
    if (!cfg.absenBuka) { view('#v-tutup'); return; }

    $('#a-pimpinan').innerHTML = '<option value="">Pilih asal pimpinan</option>' +
      cfg.terdaftar.map(function (p) { return '<option>' + R.esc(p) + '</option>'; }).join('');
    R.show('#a-nama-wrap', false);
    view('#v-form');
  }

  document.addEventListener('change', function (e) {
    if (e.target.matches('#a-pimpinan')) muatNama(e.target.value);
    if (e.target.name === 'peserta') {
      dipilih = e.target.value;
      $$('.peserta-opsi').forEach(function (o) { o.classList.toggle('dipilih', o.querySelector('input').checked); });
      $('#btn-hadir').disabled = false;
    }
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('#btn-hadir')) hadir();
    if (e.target.closest('#btn-coba-lagi') || e.target.closest('#btn-cek-lagi')) muat();
  });

  async function muatNama(pimpinan) {
    dipilih = null;
    $('#btn-hadir').disabled = true;
    tulisErr('');
    if (!pimpinan) { R.show('#a-nama-wrap', false); return; }
    R.show('#a-nama-wrap', true);
    $('#a-nama-list').innerHTML = '<p class="muted">Memuat nama...</p>';
    try {
      var list = await R.api('absenNama', { pimpinan: pimpinan });
      if (!list.length) {
        $('#a-nama-list').innerHTML = '<p class="muted">Belum ada nama terdaftar.</p>';
        return;
      }
      $('#a-nama-list').innerHTML = list.map(function (p) {
        return '<label class="peserta-opsi' + (p.hadir ? ' hadir' : '') + '">' +
          '<input type="radio" name="peserta" value="' + R.esc(p.id) + '"' + (p.hadir ? ' disabled' : '') + '>' +
          '<span class="peserta-nama">' + R.esc(p.nama) + '</span>' +
          (p.hadir ? '<span class="badge ok">Sudah hadir</span>' : '<span class="radio-dot"></span>') +
          '</label>';
      }).join('');
    } catch (e) {
      $('#a-nama-list').innerHTML = '';
      tulisErr(e.message);
      if (/ditutup/i.test(e.message)) view('#v-tutup');
    }
  }

  function tulisErr(m) {
    var el = $('#absen-err');
    el.textContent = m;
    el.hidden = !m;
  }

  async function hadir() {
    if (!dipilih) return;
    var btn = $('#btn-hadir');
    var teks = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Mencatat...';
    tulisErr('');
    try {
      var h = await R.api('absen', { idPeserta: dipilih, deviceId: R.deviceId() });
      R.simpan(KEY, { nama: h.nama, pimpinan: h.pimpinan, waktu: h.waktu });
      $('#hasil-nama').textContent = h.nama;
      $('#hasil-pimpinan').textContent = h.pimpinan;
      $('#hasil-waktu').textContent = h.waktu + ' WITA';
      $('#hasil-bayar').innerHTML = infoBayar(h.statusBayar, h.totalBayar);
      view('#v-hasil');
    } catch (e) {
      tulisErr(e.message);
      btn.disabled = false;
      if (/ditutup/i.test(e.message)) view('#v-tutup');
      else muatNama($('#a-pimpinan').value);
    } finally {
      btn.textContent = teks;
    }
  }

  function infoBayar(status, total) {
    if (status === 'Lunas') {
      return '<div class="info ok"><b>SWP &amp; SWO sudah lunas.</b> Tidak ada pembayaran lagi.</div>';
    }
    if (status === 'Menunggu Verifikasi') {
      return '<div class="info warn"><b>Bukti transfer masih dicek bendahara.</b> Kalau perlu, konfirmasi di meja registrasi.</div>';
    }
    return '<div class="info bad"><b>SWP &amp; SWO pimpinanmu belum dibayar.</b> Totalnya ' +
      R.rupiah(total) + ', silakan selesaikan di meja registrasi.</div>';
  }
})(window.RKW);
