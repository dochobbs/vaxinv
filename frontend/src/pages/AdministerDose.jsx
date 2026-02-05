import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import toast from 'react-hot-toast';

function FundingBadge({ source }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${
      source === 'vfc' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
    }`}>
      {source}
    </span>
  );
}

export default function AdministerDose() {
  const queryClient = useQueryClient();
  const [vaccineId, setVaccineId] = useState('');
  const [fundingSource, setFundingSource] = useState('vfc');
  const [selectedLot, setSelectedLot] = useState(null);
  const [notes, setNotes] = useState('');

  const { data: vaccines } = useQuery({
    queryKey: ['vaccines'],
    queryFn: () => api.get('/vaccines'),
  });

  const { data: fefoLots, isLoading: fefoLoading } = useQuery({
    queryKey: ['fefo', vaccineId],
    queryFn: () => api.get(`/inventory/fefo/${vaccineId}`),
    enabled: !!vaccineId,
  });

  const administerMutation = useMutation({
    mutationFn: (data) => api.post('/administrations', data),
    onSuccess: (data) => {
      if (data.fefo_warning) {
        toast(data.fefo_warning, { icon: '⚠️', duration: 5000 });
      }
      toast.success('Dose administered successfully');
      queryClient.invalidateQueries({ queryKey: ['fefo'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setSelectedLot(null);
      setNotes('');
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredLots = fefoLots?.filter(l => l.funding_source === fundingSource) || [];

  const handleAdminister = () => {
    if (!selectedLot) { toast.error('Select a lot'); return; }
    administerMutation.mutate({
      inventory_id: selectedLot.id,
      funding_source: fundingSource,
      notes: notes || undefined,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Administer Dose</h1>

      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vaccine</label>
          <select
            value={vaccineId}
            onChange={e => { setVaccineId(e.target.value); setSelectedLot(null); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
          >
            <option value="">Select vaccine...</option>
            {vaccines?.map(v => (
              <option key={v.id} value={v.id}>{v.short_name} — {v.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Funding Source</label>
          <div className="flex gap-4">
            <label className={`flex-1 text-center py-2 rounded-lg border-2 cursor-pointer font-medium ${
              fundingSource === 'vfc'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-500'
            }`}>
              <input type="radio" value="vfc" checked={fundingSource === 'vfc'}
                onChange={e => { setFundingSource(e.target.value); setSelectedLot(null); }}
                className="sr-only" />
              VFC
            </label>
            <label className={`flex-1 text-center py-2 rounded-lg border-2 cursor-pointer font-medium ${
              fundingSource === 'private'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 text-gray-500'
            }`}>
              <input type="radio" value="private" checked={fundingSource === 'private'}
                onChange={e => { setFundingSource(e.target.value); setSelectedLot(null); }}
                className="sr-only" />
              Private
            </label>
          </div>
        </div>

        {vaccineId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Lots (FEFO order) — {filteredLots.length} found
            </label>
            {fefoLoading ? (
              <p className="text-gray-400 text-sm">Loading lots...</p>
            ) : filteredLots.length === 0 ? (
              <p className="text-red-500 text-sm">No available lots for this vaccine/funding source.</p>
            ) : (
              <div className="space-y-2">
                {filteredLots.map(lot => (
                  <button
                    key={lot.id}
                    onClick={() => setSelectedLot(lot)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition ${
                      selectedLot?.id === lot.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Lot {lot.lot_number}</span>
                        <FundingBadge source={lot.funding_source} />
                      </div>
                      <span className="text-lg font-bold">{lot.quantity_remaining} doses</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Exp: {lot.expiration_date}
                      {lot.opened_at && (
                        <span className="ml-3 text-amber-600">
                          Opened — discard by {new Date(lot.discard_after).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Patient ID, chart number, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
          />
        </div>

        <button
          onClick={handleAdminister}
          disabled={!selectedLot || administerMutation.isPending}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {administerMutation.isPending ? 'Recording...' : 'Record Administration'}
        </button>
      </div>
    </div>
  );
}
