import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { exportCsv, exportPdf } from '../utils/export';
import toast from 'react-hot-toast';

const REPORTS = [
  { key: 'inventory', label: 'Current Inventory', endpoint: '/reports/inventory' },
  { key: 'administrations', label: 'Administrations', endpoint: '/reports/administrations' },
  { key: 'wastage', label: 'Wastage & Adjustments', endpoint: '/reports/wastage' },
  { key: 'temperature', label: 'Temperature Log', endpoint: '/reports/temperature' },
  { key: 'expiring', label: 'Expiring Soon', endpoint: '/reports/expiring' },
  { key: 'low-stock', label: 'Low Stock', endpoint: '/reports/low-stock' },
  { key: 'audit', label: 'Audit Trail', endpoint: '/reports/audit', adminOnly: true },
];

export default function Reports() {
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState('inventory');
  const [days, setDays] = useState('90');
  const [threshold, setThreshold] = useState('5');

  const report = REPORTS.find(r => r.key === selectedReport);

  let endpoint = report?.endpoint || '/reports/inventory';
  if (selectedReport === 'expiring') endpoint += `?days=${days}`;
  if (selectedReport === 'low-stock') endpoint += `?threshold=${threshold}`;

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', selectedReport, days, threshold],
    queryFn: () => api.get(endpoint),
    enabled: !!report,
  });

  const handleExportCsv = () => {
    if (!data?.length) { toast.error('No data to export'); return; }
    exportCsv(data, `${selectedReport}_report`);
    toast.success('CSV downloaded');
  };

  const handleExportPdf = () => {
    if (!data?.length) { toast.error('No data to export'); return; }
    const cols = Object.keys(data[0]).map(k => ({ key: k, header: k.replace(/_/g, ' ').toUpperCase() }));
    exportPdf(data, cols, report.label, `${selectedReport}_report`);
    toast.success('PDF downloaded');
  };

  const availableReports = REPORTS.filter(r => !r.adminOnly || user?.role === 'admin');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Reports</h1>

      {/* Report Selector */}
      <div className="flex flex-wrap gap-2">
        {availableReports.map(r => (
          <button
            key={r.key}
            onClick={() => setSelectedReport(r.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedReport === r.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        {selectedReport === 'expiring' && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Days ahead:</label>
            <input
              type="number"
              value={days}
              onChange={e => setDays(e.target.value)}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              min="1"
            />
          </div>
        )}
        {selectedReport === 'low-stock' && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Threshold:</label>
            <input
              type="number"
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              min="1"
            />
          </div>
        )}

        <div className="ml-auto flex gap-2">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Export CSV
          </button>
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Report Data */}
      <div className="bg-white rounded-lg border p-4">
        {isLoading ? (
          <p className="text-gray-400 text-center py-8">Loading report...</p>
        ) : error ? (
          <p className="text-red-500 text-center py-8">Error: {error.message}</p>
        ) : !data?.length ? (
          <p className="text-gray-400 text-center py-8">No data for this report.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  {Object.keys(data[0]).map(key => (
                    <th key={key} className="pb-2 pr-4 whitespace-nowrap">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Object.entries(row).map(([key, val], j) => (
                      <td key={j} className="py-1.5 pr-4 whitespace-nowrap">
                        {key === 'funding_source' ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            val === 'vfc' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {val}
                          </span>
                        ) : key === 'out_of_range' ? (
                          val ? <span className="text-red-600 font-bold">YES</span> : <span className="text-green-600">No</span>
                        ) : (
                          String(val ?? '')
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
