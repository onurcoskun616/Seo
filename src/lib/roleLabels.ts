// Client bileşenlerinden güvenle import edilebilecek, sunucuya özgü hiçbir
// şey içermeyen basit bir etiket sözlüğü (src/lib/auth.ts sunucu tarafı
// kodu içerdiği için client component'lerden import edilmemeli).
export const ROLE_LABELS_CLIENT: Record<string, string> = {
  admin: "Yönetici",
  editor: "Editör",
  reviewer: "İnceleyen / Onaylayan"
};
