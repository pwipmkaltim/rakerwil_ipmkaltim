/**
 * Logika form pendaftaran. Dipakai d/index.html dan m/index.html.
 * Kedua halaman memakai ID elemen yang sama, hanya tampilannya yang beda.
 */
(function (R) {
  var $ = R.$, $$ = R.$$;
  var cfg = null;
  var step = 1;
  var JUDUL_STEP = { 1: 'Data Pimpinan', 2: 'Pembayaran', 3: 'Selesai' };

  document.addEventListener('DOMContentLoaded', muat);

  async function muat() {
    R.show('#loading', true);
    R.show('#error-box', false);
    R.show('#form-wrap', false);
    try {
      cfg = await R.api('config');
    } catch (e) {
      $('#error-msg').textContent = e.message;
      R.show('#loading', false);
      R.show('#error-box', true);
      return;
    }
    isiKonfig();
    R.show('#loading', false);
    R.show('#form-wrap', true);
    keStep(1);
  }

  function isiKonfig() {
    $$('[data-isi]').forEach(function (el) {
      var v = cfg[el.getAttribute('data-isi')];
      if (v) el.textContent = v;
    });

    var sel = $('#f-pimpinan');
    sel.innerHTML = '<option value="">Pilih asal pimpinan</option>' + cfg.pimpinan.map(function (p) {
      var sudah = cfg.terdaftar.indexOf(p) > -1;
      return '<option value="' + R.esc(p) + '"' + (sudah ? ' disabled' : '') + '>' +
        R.esc(p) + (sudah ? ' (sudah terdaftar)' : '') + '</option>';
    }).join('');

    $('#rek-bank').textContent = cfg.bank || 'Belum diisi panitia';
    $('#rek-no').textContent = cfg.noRekening || '-';
    $('#rek-nama').textContent = cfg.atasNama || '-';
    $('#offline-batas').textContent = cfg.batasBayarOffline;
    $$('[data-maks-file]').forEach(function (el) { el.textContent = cfg.maksFileMB; });
    R.show('#nominal-warning', !cfg.swp && !cfg.swo);

    $('#nama-list').innerHTML = '';
    tambahNama();
  }

  /* ---------- Daftar nama ---------- */

  function tambahNama(fokus) {
    var list = $('#nama-list');
    if (list.children.length >= cfg.maksNama) {
      R.toast('Maksimal ' + cfg.maksNama + ' nama.', 'bad');
      return;
    }
    var row = document.createElement('div');
    row.className = 'nama-row';
    row.innerHTML =
      '<span class="nama-no"></span>' +
      '<input type="text" class="input" autocomplete="off" autocapitalize="words" placeholder="Nama lengkap sesuai surat mandat">' +
      '<button type="button" class="btn-hapus" aria-label="Hapus nama"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    list.appendChild(row);
    nomori();
    if (fokus) row.querySelector('input').focus();
  }

  function nomori() {
    var rows = $$('#nama-list .nama-row');
    rows.forEach(function (r, i) {
      r.querySelector('.nama-no').textContent = i + 1;
      r.querySelector('.btn-hapus').disabled = rows.length === 1;
    });
    $('#nama-count').textContent = rows.length + ' nama';
  }

  function ambilNama() {
    return $$('#nama-list input').map(function (i) { return R.rapikanNama(i.value); }).filter(String);
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('#btn-tambah-nama')) tambahNama(true);
    var h = e.target.closest('.btn-hapus');
    if (h) { h.parentNode.remove(); nomori(); }
    if (e.target.closest('#btn-lanjut')) lanjut();
    if (e.target.closest('#btn-kembali')) keStep(1);
    if (e.target.closest('#btn-kirim')) kirim();
    if (e.target.closest('#btn-coba-lagi')) muat();
    if (e.target.closest('#btn-salin')) salinRekening();
    if (e.target.closest('#btn-daftar-lagi')) location.reload();
  });

  // Rapikan huruf besar-kecil nama begitu kolom ditinggalkan
  document.addEventListener('focusout', function (e) {
    if (e.target.matches('#nama-list input')) e.target.value = R.rapikanNama(e.target.value);
  });

  // Enter di kolom nama = tambah baris baru
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches('#nama-list input')) {
      e.preventDefault();
      var rows = $$('#nama-list input');
      if (e.target === rows[rows.length - 1] && e.target.value.trim()) tambahNama(true);
      else {
        var i = rows.indexOf(e.target);
        if (rows[i + 1]) rows[i + 1].focus();
      }
    }
  });

  /* ---------- File ---------- */

  document.addEventListener('change', function (e) {
    if (e.target.matches('#f-mandat')) labelFile(e.target, '#mandat-label', '#mandat-err');
    if (e.target.matches('#f-bukti')) labelFile(e.target, '#bukti-label', '#bukti-err');
    if (e.target.name === 'metode') pilihMetode();
    if (e.target.matches('#f-pimpinan')) err('#pimpinan-err', '');
  });

  function labelFile(input, labelSel, errSel) {
    var f = input.files[0];
    var lbl = $(labelSel);
    var drop = input.closest('.file-drop');
    if (!f) {
      lbl.textContent = lbl.getAttribute('data-kosong');
      drop.classList.remove('terisi');
      return;
    }
    var pesan = R.cekFile(f, cfg.maksFileMB);
    err(errSel, pesan);
    if (pesan) {
      input.value = '';
      lbl.textContent = lbl.getAttribute('data-kosong');
      drop.classList.remove('terisi');
      return;
    }
    lbl.textContent = f.name + ' (' + R.ukuran(f.size) + ')';
    drop.classList.add('terisi');
  }

  /* ---------- Langkah ---------- */

  function keStep(n) {
    step = n;
    $$('[data-step]').forEach(function (s) { s.hidden = Number(s.getAttribute('data-step')) !== n; });
    $$('[data-ind]').forEach(function (el) {
      var i = Number(el.getAttribute('data-ind'));
      el.classList.toggle('active', i === n);
      el.classList.toggle('done', i < n);
    });
    var bar = $('#progress-bar');
    if (bar) bar.style.width = (n / 3 * 100) + '%';
    var lbl = $('#step-label');
    if (lbl) lbl.textContent = 'Langkah ' + n + ' dari 3 · ' + JUDUL_STEP[n];

    R.show('#btn-kembali', n === 2);
    R.show('#btn-lanjut', n === 1);
    R.show('#btn-kirim', n === 2);
    R.show('#actions', n !== 3);
    if (n === 2) hitung();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function err(sel, msg) {
    var el = $(sel);
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  function lanjut() {
    var ok = true;
    if (!$('#f-pimpinan').value) { err('#pimpinan-err', 'Pilih asal pimpinan.'); ok = false; }

    $$('#nama-list input').forEach(function (i) { i.value = R.rapikanNama(i.value); });
    var nama = ambilNama();
    var lower = nama.map(function (n) { return n.toLowerCase(); });
    var dobel = lower.filter(function (n, i) { return lower.indexOf(n) !== i; });
    if (!nama.length) { err('#nama-err', 'Isi minimal satu nama.'); ok = false; }
    else if (dobel.length) { err('#nama-err', 'Ada nama yang ditulis dua kali: ' + R.rapikanNama(dobel[0]) + '.'); ok = false; }
    else err('#nama-err', '');

    var m = $('#f-mandat').files[0];
    var pesan = m ? R.cekFile(m, cfg.maksFileMB) : 'Surat mandat wajib diunggah.';
    err('#mandat-err', pesan);
    if (pesan) ok = false;

    if (!ok) {
      var first = $$('.field-err').filter(function (e) { return !e.hidden; })[0];
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    keStep(2);
  }

  function hitung() {
    var n = ambilNama().length;
    var totalSwp = cfg.swp * n;
    var total = totalSwp + cfg.swo;
    $('#rincian').innerHTML =
      '<div class="rincian-row"><div><b>SWP</b><small>Sumbangan Wajib Perorangan</small></div>' +
        '<div class="rincian-hitung">' + R.rupiah(cfg.swp) + ' &times; ' + n + ' orang</div>' +
        '<div class="rincian-jumlah">' + R.rupiah(totalSwp) + '</div></div>' +
      '<div class="rincian-row"><div><b>SWO</b><small>Sumbangan Wajib Organisasi</small></div>' +
        '<div class="rincian-hitung">' + R.rupiah(cfg.swo) + ' &times; 1 pimpinan</div>' +
        '<div class="rincian-jumlah">' + R.rupiah(cfg.swo) + '</div></div>';
    $$('[data-total]').forEach(function (el) { el.textContent = R.rupiah(total); });
    $('#ringkas-pimpinan').textContent = $('#f-pimpinan').value;
    $('#ringkas-nama').innerHTML = ambilNama().map(function (x) { return '<li>' + R.esc(x) + '</li>'; }).join('');
    pilihMetode();
  }

  function pilihMetode() {
    var m = ($$('input[name="metode"]').filter(function (r) { return r.checked; })[0] || {}).value;
    R.show('#panel-transfer', m === 'transfer');
    R.show('#panel-offline', m === 'offline');
    $$('.metode-opsi').forEach(function (o) {
      o.classList.toggle('dipilih', o.querySelector('input').checked);
    });
    if (m) err('#metode-err', '');
  }

  function salinRekening() {
    var no = cfg.noRekening;
    if (!no) return;
    var done = function () { R.toast('Nomor rekening disalin.', 'ok'); };
    if (navigator.clipboard) navigator.clipboard.writeText(no).then(done, fallback);
    else fallback();
    function fallback() {
      var t = document.createElement('textarea');
      t.value = no; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      t.remove();
    }
  }

  async function kirim() {
    var metode = ($$('input[name="metode"]').filter(function (r) { return r.checked; })[0] || {}).value;
    var ok = true;
    if (!metode) { err('#metode-err', 'Pilih cara pembayaran.'); ok = false; }
    var bukti = $('#f-bukti').files[0];
    if (metode === 'transfer') {
      var p = bukti ? R.cekFile(bukti, cfg.maksFileMB) : 'Bukti transfer wajib diunggah.';
      err('#bukti-err', p);
      if (p) ok = false;
    }
    if (!$('#f-setuju').checked) { err('#setuju-err', 'Centang dulu untuk melanjutkan.'); ok = false; }
    else err('#setuju-err', '');
    if (!ok) return;

    var btn = $('#btn-kirim');
    var teks = btn.textContent;
    btn.disabled = true;
    $('#btn-kembali').disabled = true;
    btn.textContent = 'Mengirim...';

    try {
      var payload = {
        pimpinan: $('#f-pimpinan').value,
        nama: ambilNama(),
        metode: metode,
        suratMandat: await R.fileKePayload($('#f-mandat').files[0])
      };
      if (metode === 'transfer') payload.bukti = await R.fileKePayload(bukti);
      var hasil = await R.api('daftar', payload);
      tampilHasil(hasil);
    } catch (e) {
      R.toast(e.message, 'bad');
      err('#kirim-err', e.message);
    } finally {
      btn.disabled = false;
      $('#btn-kembali').disabled = false;
      btn.textContent = teks;
    }
  }

  function tampilHasil(h) {
    $('#hasil-id').textContent = h.id;
    $('#hasil-pimpinan').textContent = h.pimpinan;
    $('#hasil-waktu').textContent = h.waktu + ' WITA';
    $('#hasil-nama').innerHTML = h.nama.map(function (x) { return '<li>' + R.esc(x) + '</li>'; }).join('');
    $('#hasil-total').textContent = R.rupiah(h.total);
    $('#hasil-status').innerHTML = R.badgeBayar(h.statusBayar);
    $('#hasil-catatan').textContent = h.metode === 'transfer'
      ? 'Bukti transfer sudah kami terima dan akan dicek bendahara. Status berubah menjadi Lunas setelah diverifikasi.'
      : 'Siapkan pembayaran ' + R.rupiah(h.total) + ' dan bayarkan di meja registrasi. ' + cfg.batasBayarOffline;
    keStep(3);
  }
})(window.RKW);
