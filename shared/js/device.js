/**
 * Dipakai oleh index.html, absen.html, admin.html di root.
 * Mengarahkan ke tampilan mobile (m/) atau desktop (d/).
 * Pilihan manual pengguna disimpan di localStorage 'rkw_tampilan'.
 */
(function () {
  var page = document.currentScript.getAttribute('data-page') || 'index.html';
  var pref = null;
  try { pref = localStorage.getItem('rkw_tampilan'); } catch (e) {}

  function isMobile() {
    var ua = navigator.userAgent || '';
    if (/Android|iPhone|iPod|Windows Phone|Mobile|Opera Mini|IEMobile/i.test(ua)) return true;
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return coarse && Math.min(screen.width, screen.height) < 768;
  }

  var folder = pref === 'm' || pref === 'd' ? pref : (isMobile() ? 'm' : 'd');
  location.replace(folder + '/' + page + location.search + location.hash);
})();
