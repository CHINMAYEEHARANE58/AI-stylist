const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export async function fetcher<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }

  return response.json();
}

