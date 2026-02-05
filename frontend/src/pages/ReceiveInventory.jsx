import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import BarcodeInput from '../components/BarcodeInput';
import toast from 'react-hot-toast';

export default function ReceiveInventory() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    vaccine_id: '', lot_number: '', expiration_date: '',
    ndc: '', funding_source: 'vfc', quantity: 1, notes: '',
  });
  const [matchedVaccine, setMatchedVaccine] = useState(null);

  const { data: vaccines } = useQuery({
    queryKey: ['vaccines'],
    queryFn: () => api.get('/vaccines'),
  });

  const receiveMutation = useMutation({
    mutationFn: (data) => api.post('/inventory/receive', data),
    onSuccess: (data) => {
      toast.success(`Received ${form.quantity} doses of ${matchedVaccine?.short_name || 'vaccine'}`);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setForm({ vaccine_id: '', lot_number: '', expiration_date: '', ndc: '', funding_source: 'vfc', quantity: 1, notes: '' });
      setMatchedVaccine(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleScan = async (ndc) => {
    try {
      const matches = await api.get(`/vaccines/match-ndc/${encodeURIComponent(ndc)}`);
      if (matches.length > 0) {
        const v = matches[0];
        setMatchedVaccine(v);
        setForm(f => ({ ...f, vaccine_id: v.id, ndc }));
        toast.success(`Matched: ${v.short_name} (${v.manufacturer})`);
      }
    } catch {
      toast.error('No vaccine match for this barcode. Select manually.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.vaccine_id || !form.lot_number || !form.expiration_date || !form.quantity) {
      toast.error('Fill all required fields');
      return;
    }
    receiveMutation.mutate({
      ...form,
      vaccine_id: Number(form.vaccine_id),
      quantity: Number(form.quantity),
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Receive Inventory</h1>

      {/* Barcode Scanner */}
      <div className="bg-white rounded-lg border p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Scan Barcode / NDC</label>
        <BarcodeInput onScan={handleScan} />
        {matchedVaccine && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            Matched: <strong>{matchedVaccine.name}</strong> ({matchedVaccine.manufacturer})
          </div>
        )}
      </div>

      {/* Manual Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vaccine *</label>
          <select
            value={form.vaccine_id}
            onChange={e => {
              const v = vaccines?.find(v => v.id === Number(e.target.value));
              setForm(f => ({ ...f, vaccine_id: e.target.value }));
              setMatchedVaccine(v || null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
          >
            <option value="">Select vaccine...</option>
            {vaccines?.map(v => (
              <option key={v.id} value={v.id}>{v.short_name} — {v.name} ({v.manufacturer})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lot Number *</label>
            <input
              type="text"
              value={form.lot_number}
              onChange={e => setForm(f => ({ ...f, lot_number: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date *</label>
            <input
              type="date"
              value={form.expiration_date}
              onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Funding Source *</label>
            <div className="flex gap-4 mt-1">
              <label className={`flex-1 text-center py-2 rounded-lg border-2 cursor-pointer font-medium ${
                form.funding_source === 'vfc'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-500'
              }`}>
                <input type="radio" value="vfc" checked={form.funding_source === 'vfc'}
                  onChange={e => setForm(f => ({ ...f, funding_source: e.target.value }))}
                  className="sr-only" />
                VFC
              </label>
              <label className={`flex-1 text-center py-2 rounded-lg border-2 cursor-pointer font-medium ${
                form.funding_source === 'private'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 text-gray-500'
              }`}>
                <input type="radio" value="private" checked={form.funding_source === 'private'}
                  onChange={e => setForm(f => ({ ...f, funding_source: e.target.value }))}
                  className="sr-only" />
                Private
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (doses) *</label>
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input
            type="text"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={receiveMutation.isPending}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {receiveMutation.isPending ? 'Receiving...' : 'Receive Inventory'}
        </button>
      </form>
    </div>
  );
}
