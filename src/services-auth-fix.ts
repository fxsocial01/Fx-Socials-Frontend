const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const isFxApi = url.includes('fx-socials-api.onrender.com');
  const session = localStorage.getItem('fxs-session');
  if (isFxApi && session) {
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${session}`);
    init = { ...init, headers };
  }
  return originalFetch(input, init);
};
