export interface AuditSecuriteItem {
  id: number;
  timestamp: string;
  eventType: string;
  utilisateurId: number | null;
  email: string | null;
  ipAddress: string | null;
  details: string | null;
  status: string;
}
