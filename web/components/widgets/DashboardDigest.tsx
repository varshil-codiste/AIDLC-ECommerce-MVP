interface DashboardMetrics {
  ordersToday: number;
  revenueTodayCents: number;
  lowStockAlerts: number;
  newCustomersToday: number;
}

interface DashboardDigestData {
  metrics: DashboardMetrics;
}

interface Props {
  data: Record<string, unknown>;
}

function formatRevenue(cents: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(cents / 100);
}

interface KpiTileProps {
  label: string;
  value: string;
  testId: string;
}

function KpiTile({ label, value, testId }: KpiTileProps) {
  return (
    <div data-testid={testId} className="rounded border border-gray-200 p-3 text-center">
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

export function DashboardDigest({ data }: Props) {
  const d = data as unknown as DashboardDigestData;
  const m = d.metrics ?? { ordersToday: 0, revenueTodayCents: 0, lowStockAlerts: 0, newCustomersToday: 0 };

  return (
    <div
      data-testid="dashboard-digest-root"
      aria-live="polite"
      className="space-y-2"
    >
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Today&apos;s Overview</div>
      <div className="grid grid-cols-2 gap-2">
        <KpiTile
          testId="dashboard-digest-orders"
          label="Orders Today"
          value={String(m.ordersToday)}
        />
        <KpiTile
          testId="dashboard-digest-revenue"
          label="Revenue Today"
          value={formatRevenue(m.revenueTodayCents)}
        />
        <KpiTile
          testId="dashboard-digest-low-stock"
          label="Low Stock Alerts"
          value={String(m.lowStockAlerts)}
        />
        <KpiTile
          testId="dashboard-digest-new-customers"
          label="New Customers (24h)"
          value={String(m.newCustomersToday)}
        />
      </div>
    </div>
  );
}
