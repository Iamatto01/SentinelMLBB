export const API_URL = "https://sentinel-mlbb-api.muhammadsaifudinmj.workers.dev/api";

export async function loginUser(passcode: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Login failed");
  return data;
}
