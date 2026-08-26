/**
 * หน้าเว็บ "ตั้งรหัสผ่านใหม่" ที่เปิดจากลิงก์ในอีเมล
 *
 * *** ทำไมเป็นหน้าเว็บ ไม่ใช่หน้าจอในแอป ***
 * ลิงก์ในอีเมลถูกเปิดจากแอปอีเมล ซึ่งเปิดได้แต่ลิงก์ http เท่านั้น
 * ถ้าทำเป็น deep link แบบ saveeats:// อีเมลหลายเจ้าจะกดไม่ได้เลย
 *
 * หน้านี้จึงเป็นหน้าเว็บธรรมดาที่ backend เสิร์ฟเอง เปิดได้ทุกเครื่อง
 * เมื่อตั้งรหัสเสร็จ ผู้ใช้ก็กลับไปเข้าสู่ระบบในแอปด้วยรหัสใหม่
 *
 * หน้านี้เรียก POST /api/auth/reset-password ตัวเดียวกับที่แอปใช้
 * จึงไม่มี logic ซ้ำซ้อน และกฎความปลอดภัยทั้งหมดอยู่ที่ service ที่เดียว
 */

/** แปลงข้อความให้ปลอดภัยก่อนวางลงใน HTML (กัน XSS) */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderResetPasswordPage(token: string): string {
  const safeToken = escapeHtml(token);

  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ตั้งรหัสผ่านใหม่ - SaveEats</title>
<style>
  :root { --green:#16A34A; --green-dark:#15803D; --border:#E5E7EB; --muted:#6B7280; }
  * { box-sizing:border-box; }
  body {
    margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:#F7FAF7; padding:24px;
    font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Noto Sans Thai',sans-serif;
    color:#1F2937;
  }
  .card { width:100%; max-width:420px; background:#fff; border-radius:20px; padding:32px 28px;
          box-shadow:0 8px 30px rgba(0,0,0,.07); }
  h1 { margin:0 0 4px; font-size:26px; color:var(--green); }
  .tagline { margin:0 0 28px; color:var(--muted); font-size:14px; }
  h2 { font-size:19px; margin:0 0 20px; }
  label { display:block; font-size:14px; font-weight:600; margin:16px 0 6px; }
  input { width:100%; height:48px; padding:0 14px; border:1px solid var(--border);
          border-radius:12px; font-size:16px; outline:none; }
  input:focus { border-color:var(--green); }
  button { width:100%; height:50px; margin-top:24px; border:0; border-radius:999px;
           background:var(--green); color:#fff; font-size:16px; font-weight:700; cursor:pointer; }
  button:disabled { background:#9CA3AF; cursor:not-allowed; }
  .hint { font-size:13px; color:var(--muted); margin-top:8px; }
  .msg { margin-top:20px; padding:14px 16px; border-radius:12px; font-size:14px; display:none; }
  .msg.error { display:block; background:#FEF2F2; color:#B91C1C; }
  .msg.success { display:block; background:#F0FDF4; color:#15803D; }
</style>
</head>
<body>
  <div class="card">
    <h1>SaveEats</h1>
    <p class="tagline">อิ่มอร่อย ไม่ทิ้งกัน</p>

    <h2>ตั้งรหัสผ่านใหม่</h2>

    <form id="form">
      <label for="pw">รหัสผ่านใหม่</label>
      <input id="pw" type="password" autocomplete="new-password" required minlength="6">
      <p class="hint">อย่างน้อย 6 ตัวอักษร</p>

      <label for="pw2">ยืนยันรหัสผ่านใหม่</label>
      <input id="pw2" type="password" autocomplete="new-password" required minlength="6">

      <button id="submit" type="submit">บันทึกรหัสผ่านใหม่</button>
    </form>

    <div id="msg" class="msg"></div>
  </div>

<script>
  var TOKEN = "${safeToken}";
  var form = document.getElementById('form');
  var msg = document.getElementById('msg');
  var btn = document.getElementById('submit');

  function show(text, kind) {
    msg.textContent = text;
    msg.className = 'msg ' + kind;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = document.getElementById('pw').value;
    var pw2 = document.getElementById('pw2').value;

    if (pw !== pw2) { show('รหัสผ่านทั้งสองช่องไม่ตรงกัน', 'error'); return; }
    if (pw.length < 6) { show('รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร', 'error'); return; }

    btn.disabled = true;
    btn.textContent = 'กำลังบันทึก...';

    fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN, newPassword: pw })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) {
          form.style.display = 'none';
          show('ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กลับไปเข้าสู่ระบบในแอป SaveEats ด้วยรหัสใหม่ได้เลย', 'success');
        } else {
          show(data.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
          btn.disabled = false;
          btn.textContent = 'บันทึกรหัสผ่านใหม่';
        }
      })
      .catch(function () {
        show('ติดต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่', 'error');
        btn.disabled = false;
        btn.textContent = 'บันทึกรหัสผ่านใหม่';
      });
  });
</script>
</body>
</html>`;
}

export default renderResetPasswordPage;
