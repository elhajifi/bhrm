// Browser helper: fetch JSON and throw a readable Error when the API fails.
export async function api(url, { method = "GET", body } = {}) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // empty body
  }
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/";
  }
  if (res.status === 403 && data?.readOnly && typeof window !== "undefined") {
    // demo account: show the "view-only" dialog (components/ReadOnly.js)
    window.dispatchEvent(new Event("bhrm:read-only"));
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.readOnly = Boolean(data?.readOnly);
    throw err;
  }
  return data;
}
