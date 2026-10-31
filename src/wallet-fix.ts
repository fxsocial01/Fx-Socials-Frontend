const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const isWallet = url.includes('fx-socials-api.onrender.com/api/me/wallet');

  if (!isWallet) return originalFetch(input, init);

  const response = await originalFetch(input, init);
  const raw = await response.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}

  const balance = data?.wallet?.balance ?? data?.balance ?? data?.user?.balance ?? data?.user?.wallet?.balance;
  if (response.ok && balance !== undefined && balance !== null) {
    return new Response(JSON.stringify({ ...data, wallet: { ...(data.wallet || {}), balance: Number(balance) || 0 } }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Fallback to the canonical /api/me endpoint if the wallet endpoint fails or changes shape.
  try {
    const base = url.split('/api/me/wallet')[0];
    const fallback = await originalFetch(`${base}/api/me`, {
      method: 'POST',
      headers: init.headers || { 'Content-Type': 'application/json' },
      body: init.body
    });
    const fallbackData = await fallback.json().catch(() => ({}));
    if (fallback.ok) {
      const fallbackBalance = fallbackData?.wallet?.balance ?? fallbackData?.balance ?? fallbackData?.user?.balance ?? 0;
      return new Response(JSON.stringify({ wallet: { balance: Number(fallbackBalance) || 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch {}

  return new Response(raw || JSON.stringify({ error: 'Could not load wallet balance' }), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
};
