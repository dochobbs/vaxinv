import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ADJUSTMENT_TYPES = [
  { value: 'waste', label: 'Waste', desc: 'Doses wasted (broken, contaminated, etc.)' },
  { value: 'transfer_out', label: 'Transfer Out', desc: 'Send to another location' },
  { value: 'expired', label: 'Expired', desc: 'Mark lot as expired' },
  { value: 'correction', label: 'Correction', desc: 'Correct count (sets new qty)' },
  { value: 'borrowing', label: 'Borrowing', desc: 'Cross-fund borrow (VFC ↔ Private)' },
  { value: 'returned', label: 'Returned', desc: 'Return to distributor' },
  { value: 'recall', label: 'Recall', desc: 'Quarantine a lot (admin only)' },
];

export default function Adjustments() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [adjustType, setAdjustType] = useState('waste');
  const [inventoryId, setInventoryId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [relatedLocationId, setRelatedLocationId] = useState('');
  const [recallLot, setRecallLot] = useState('');

  const { data: inventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory'),
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations'),
  });

  const { data: adjustmentHistory } = useQuery({
    queryKey: ['adjustments'],
    queryFn: () => api.get('/adjustments'),
  });

  const adjustMutation = useMutation({
    mutationFn: (data) => api.post('/adjustments', data),
    onSuccess: () => {
      toast.success('Adjustment recorded');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setInventoryId(''); setQuantity(''); setReason(''); setRelatedLocationId('');
    },
    onError: (err) => toast.error(err.message),
  });

  const recallMutation = useMutation({
    mutationFn: (data) => api.post('/adjustments/recall', data),
    onSuccess: (data) => {
      toast.success(`Recalled: ${data.quarantined_count} lots quarantined`);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setRecallLot(''); setReason('');
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkExpireMutation = useMutation({
    mutationFn: () => api.post('/adjustments/bulk-expire'),
    onSuccess: (data) => {
      toast.success(`${data.expired_count} lots expired`);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (adjustType === 'recall') {
      if (!recallLot) { toast.error('Lot number required'); return; }
      recallMutation.mutate({ lot_number: recallLot, reason });
      return;
    }
    if (!inventoryId || quantity === '') { toast.error('Select lot and enter quantity'); return; }
    adjustMutation.mutate({
      inventory_id: Number(inventoryId),
      adjustment_type: adjustType,
      quantity: Number(quantity),
      reason,
      related_location_id: relatedLocationId ? Number(relatedLocationId) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Adjustments</h1>
        <button
          onClick={() => bulkExpireMutation.mutate()}
          disabled={bulkExpireMutation.isPending}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
        >
          Bulk Expire
        </button>
      </div>

      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Adjustment Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ADJUSTMENT_TYPES.filter(t => t.value !== 'recall' || ['admin', 'manager'].includes(user?.role))
              .map(t => (
                <button
                  key={t.value}
                  onClick={() => setAdjustType(t.value)}
                  className={`p-2 rounded-lg border-2 text-sm font-medium transition ${
                    adjustType === t.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  title={t.desc}
                >
                  {t.label}
                </button>
              ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {adjustType === 'recall' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lot Number to Recall</label>
              <input
                type="text"
                value={recallLot}
                onChange={e => setRecallLot(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
                placeholder="Enter lot number..."
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inventory Lot</label>
                <select
                  value={inventoryId}
                  onChange={e => setInventoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
                >
                  <option value="">Select lot...</option>
                  {inventory?.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.short_name} — Lot {inv.lot_number} ({inv.funding_source.toUpperCase()}) — {inv.quantity_remaining} remaining
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {adjustType === 'correction' ? 'New Quantity' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    min={adjustType === 'correction' ? '0' : '1'}
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
                  />
                </div>

                {adjustType === 'transfer_out' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                    <select
                      value={relatedLocationId}
                      onChange={e => setRelatedLocationId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
                    >
                      <option value="">Select location...</option>
                      {locations?.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Reason for adjustment..."
            />
          </div>

          <button
            type="submit"
            disabled={adjustMutation.isPending || recallMutation.isPending}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Record Adjustment
          </button>
        </form>
      </div>

      {/* Recent Adjustments */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-bold text-gray-700 mb-3">Recent Adjustments</h2>
        {adjustmentHistory?.length === 0 ? (
          <p className="text-gray-400 text-sm">No adjustments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Vaccine</th>
                  <th className="pb-2">Lot</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">By</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {adjustmentHistory?.slice(0, 20).map(a => (
                  <tr key={a.id} className="border-b border-gray-50">
                    <td className="py-1.5">
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-xs font-medium">{a.adjustment_type}</span>
                    </td>
                    <td className="py-1.5">{a.vaccine_name}</td>
                    <td className="py-1.5">{a.lot_number}</td>
                    <td className="py-1.5">{a.quantity}</td>
                    <td className="py-1.5">{a.adjusted_by_name}</td>
                    <td className="py-1.5 text-gray-500">{new Date(a.adjusted_at).toLocaleString()}</td>
                    <td className="py-1.5 text-gray-500 max-w-48 truncate">{a.reason}</td>
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
