import { JWT } from "google-auth-library";

export function isGscConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      process.env.GSC_SITE_URL
  );
}

let cachedClient: JWT | null = null;

function getClient(): JWT {
  if (cachedClient) return cachedClient;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY tanımlı değil."
    );
  }
  // Render gibi platformlarda çok satırlı private key genelde \n kaçışlı tek satır olarak girilir.
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  cachedClient = new JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"]
  });
  return cachedClient;
}

export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function queryGscSearchAnalytics(params: {
  startDate: string;
  endDate: string;
  dimensions: ("query" | "page" | "date")[];
  rowLimit?: number;
}): Promise<GscRow[]> {
  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) throw new Error("GSC_SITE_URL tanımlı değil.");

  const client = getClient();
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;

  const res = await client.request<{ rows?: GscRow[] }>({
    url: endpoint,
    method: "POST",
    data: {
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: params.dimensions,
      rowLimit: params.rowLimit ?? 25
    }
  });

  return res.data.rows ?? [];
}
