/* Komunikasi ke backend Google Apps Script. */
window.RKW = window.RKW || {};

(function (R) {
  /**
   * Semua permintaan dikirim sebagai POST text/plain supaya tidak kena
   * preflight CORS (Apps Script tidak melayani OPTIONS).
   */
  R.api = async function (action, data) {
    var body = Object.assign({ action: action }, data || {});
    var url = window.RKW_CONFIG && window.RKW_CONFIG.API_URL;

    if (!url) return R.mock(body); // mode demo

    var res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
      });
    } catch (e) {
      throw new Error('Tidak bisa terhubung ke server. Cek koneksi internet lalu coba lagi.');
    }
    var json;
    try {
      json = await res.json();
    } catch (e) {
      throw new Error('Balasan server tidak terbaca. Pastikan Web App sudah di-deploy dengan akses "Anyone".');
    }
    if (!json.ok) throw new Error(json.error || 'Terjadi kesalahan.');
    return json.data;
  };
})(window.RKW);
