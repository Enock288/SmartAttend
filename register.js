document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const message = document.getElementById('registerMessage');
  const button = form?.querySelector('button[type="submit"]');
  const API_URL = window.SMARTATTEND_API_URL || 'http://localhost:3001';
  form?.addEventListener('submit', async event => {
    event.preventDefault(); message.textContent = '';
    const password = document.getElementById('registerPassword').value;
    if (password.length < 8) { message.textContent = 'Your password must contain at least 8 characters.'; return; }
    if (password !== document.getElementById('confirmPassword').value) { message.textContent = 'Your passwords do not match.'; return; }
    if (!document.getElementById('agreeTerms').checked) { message.textContent = 'Please confirm that your information is correct.'; return; }
    button.disabled = true;
    const payload = { username: document.getElementById('fullName').value.trim(), email: document.getElementById('registerEmail').value.trim().toLowerCase(), password, role: 'student' };
    try { const response = await fetch(`${API_URL}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Registration failed.'); localStorage.setItem('smartAttendUser', JSON.stringify(data.user)); message.textContent = 'Account created. Redirecting to login…'; setTimeout(() => { window.location.href = 'login.html'; }, 700); }
    catch (error) { message.textContent = error instanceof TypeError ? 'The backend is unavailable. Start the Java server and try again.' : error.message; button.disabled = false; }
  });
});
