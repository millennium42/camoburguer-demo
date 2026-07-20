export async function requestJson(url, options = {}) {
  const signal = AbortSignal.timeout(10000);
  
  // Clone options and securely omit sensitive headers for logging
  const fetchOptions = { ...options, signal };
  const logHeaders = { ...(options.headers || {}) };
  if (logHeaders.Authorization) logHeaders.Authorization = '***';

  // console.log(`[HTTP] ${options.method || 'GET'} ${url}`, logHeaders);

  const response = await fetch(url, fetchOptions);
  const text = await response.text();
  
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (e) {
      // Ignored for non-JSON responses
    }
  }

  if (!response.ok) {
    const error = new Error(payload?.message || `HTTP ${response.status}`);
    error.statusCode = response.status;
    error.responsePayload = payload;
    throw error;
  }

  return payload;
}

export async function requestForm(url, bodyObject, options = {}) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(bodyObject)) {
    form.append(key, value);
  }
  
  return requestJson(url, {
    ...options,
    body: form,
    headers: {
      ...options.headers,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
}
