import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

function FundingBadge({ source }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${
      source === 'vfc' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
    }`}>
      {source}
    </span>
  );
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard'),
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error.message}</div>;

  const { inventory_summary, expiring_soon, low_stock, recent_activity, vial_alerts, temperature_excursions } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {/* Alerts */}
      {temperature_excursions?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-bold text-red-700 mb-2">Temperature Excursions (Last 24h)</h3>
          {temperature_excursions.map((t, i) => (
            <p key={i} className="text-sm text-red-600">
              {t.unit_name}: {t.reading_f}°F at {new Date(t.reading_time).toLocaleString()}
            </p>
          ))}
        </div>
      )}

      {vial_alerts?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-bold text-amber-700 mb-2">Open Vials</h3>
          {vial_alerts.map((v, i) => (
            <p key={i} className="text-sm text-amber-600">
              {v.short_name} (Lot {v.lot_number}) — discard by {new Date(v.discard_after).toLocaleString()}
              {' '}({v.quantity_remaining} doses left)
            </p>
          ))}
        </div>
      )}

      {/* Inventory Summary */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-bold text-gray-700 mb-3">Current Stock</h2>
        {inventory_summary?.length === 0 ? (
          <p className="text-gray-400 text-sm">No inventory on hand.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {inventory_summary?.map((item, i) => (
              <div key={i} className={`rounded-lg p-3 ${
                item.funding_source === 'vfc' ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'
              }`}>
                <div className="font-medium text-gray-800">{item.short_name}</div>
                <div className="text-2xl font-bold">{item.total_doses}</div>
                <FundingBadge source={item.funding_source} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expiring Soon and Low Stock side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-bold text-gray-700 mb-3">Expiring Soon (90 days)</h2>
          {expiring_soon?.length === 0 ? (
            <p className="text-gray-400 text-sm">No lots expiring soon.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-1">Vaccine</th>
                  <th className="pb-1">Lot</th>
                  <th className="pb-1">Expires</th>
                  <th className="pb-1">Qty</th>
                </tr>
              </thead>
              <tbody>
                {expiring_soon?.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1">{item.short_name}</td>
                    <td className="py-1">{item.lot_number}</td>
                    <td className="py-1 text-orange-600">{item.expiration_date}</td>
                    <td className="py-1">{item.quantity_remaining}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-bold text-gray-700 mb-3">Low Stock (&lt; 5 doses)</h2>
          {low_stock?.length === 0 ? (
            <p className="text-gray-400 text-sm">All stock levels adequate.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-1">Vaccine</th>
                  <th className="pb-1">Lot</th>
                  <th className="pb-1">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {low_stock?.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1">{item.short_name}</td>
                    <td className="py-1">{item.lot_number}</td>
                    <td className="py-1 text-red-600 font-bold">{item.quantity_remaining}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-bold text-gray-700 mb-3">Recent Activity</h2>
        {recent_activity?.length === 0 ? (
          <p className="text-gray-400 text-sm">No recent activity.</p>
        ) : (
          <div className="space-y-2">
            {recent_activity?.slice(0, 10).map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-sm border-b border-gray-50 pb-1">
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-mono">{a.action}</span>
                <span className="text-gray-700">{a.user_name}</span>
                <span className="text-gray-400">{a.entity_type} #{a.entity_id}</span>
                <span className="text-gray-400 ml-auto text-xs">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
