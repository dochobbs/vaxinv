import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import toast from 'react-hot-toast';

export default function AdminVaccines() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '', short_name: '', manufacturer: '', cpt_code: '', cvx_code: '',
    ndc_pattern: '', doses_per_vial: 1, beyond_use_days: '',
    min_age_months: '', max_age_months: '',
  });

  const { data: vaccines, isLoading } = useQuery({
    queryKey: ['vaccines'],
    queryFn: () => api.get('/vaccines'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/vaccines', data),
    onSuccess: () => {
      toast.success('Vaccine created');
      queryClient.invalidateQueries({ queryKey: ['vaccines'] });
      setShowCreate(false);
      setForm({ name: '', short_name: '', manufacturer: '', cpt_code: '', cvx_code: '',
        ndc_pattern: '', doses_per_vial: 1, beyond_use_days: '', min_age_months: '', max_age_months: '' });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/vaccines/${id}`, data),
    onSuccess: () => {
      toast.success('Vaccine updated');
      queryClient.invalidateQueries({ queryKey: ['vaccines'] });
      setEditingId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const data = { ...form };
    data.doses_per_vial = Number(data.doses_per_vial) || 1;
    if (data.beyond_use_days !== '') data.beyond_use_days = Number(data.beyond_use_days);
    else delete data.beyond_use_days;
    if (data.min_age_months !== '') data.min_age_months = Number(data.min_age_months);
    else delete data.min_age_months;
    if (data.max_age_months !== '') data.max_age_months = Number(data.max_age_months);
    else delete data.max_age_months;
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Manage Vaccines</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {showCreate ? 'Cancel' : 'Add Vaccine'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Short Name *</label>
              <input type="text" value={form.short_name} onChange={e => setForm(f => ({ ...f, short_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
              <input type="text" value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NDC Pattern (regex)</label>
              <input type="text" value={form.ndc_pattern} onChange={e => setForm(f => ({ ...f, ndc_pattern: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPT Code</label>
              <input type="text" value={form.cpt_code} onChange={e => setForm(f => ({ ...f, cpt_code: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CVX Code</label>
              <input type="text" value={form.cvx_code} onChange={e => setForm(f => ({ ...f, cvx_code: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doses per Vial</label>
              <input type="number" min="1" value={form.doses_per_vial}
                onChange={e => setForm(f => ({ ...f, doses_per_vial: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beyond-Use Days</label>
              <input type="number" min="0" value={form.beyond_use_days}
                onChange={e => setForm(f => ({ ...f, beyond_use_days: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
                placeholder="Blank = no limit" />
            </div>
          </div>
          <button type="submit" disabled={createMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            Create Vaccine
          </button>
        </form>
      )}

      {/* Vaccine List */}
      <div className="bg-white rounded-lg border p-4 overflow-x-auto">
        {isLoading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Short Name</th>
                <th className="pb-2">Full Name</th>
                <th className="pb-2">Manufacturer</th>
                <th className="pb-2">CVX</th>
                <th className="pb-2">Doses/Vial</th>
                <th className="pb-2">BUD</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vaccines?.map(v => (
                <tr key={v.id} className="border-b border-gray-50">
                  <td className="py-1.5 font-medium">{v.short_name}</td>
                  <td className="py-1.5">{v.name}</td>
                  <td className="py-1.5 text-gray-500">{v.manufacturer}</td>
                  <td className="py-1.5 text-gray-500">{v.cvx_code}</td>
                  <td className="py-1.5">{v.doses_per_vial}</td>
                  <td className="py-1.5 text-gray-500">{v.beyond_use_days ?? '—'}</td>
                  <td className="py-1.5">
                    <button
                      onClick={() => {
                        setEditingId(v.id);
                        setForm({
                          name: v.name, short_name: v.short_name, manufacturer: v.manufacturer || '',
                          cpt_code: v.cpt_code || '', cvx_code: v.cvx_code || '',
                          ndc_pattern: v.ndc_pattern || '', doses_per_vial: v.doses_per_vial,
                          beyond_use_days: v.beyond_use_days ?? '',
                          min_age_months: v.min_age_months ?? '', max_age_months: v.max_age_months ?? '',
                        });
                        setShowCreate(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal (reuses create form) */}
      {editingId && showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold mb-4">Edit Vaccine</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Short Name</label>
                <input type="text" value={form.short_name} onChange={e => setForm(f => ({ ...f, short_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <input type="text" value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doses/Vial</label>
                <input type="number" min="1" value={form.doses_per_vial}
                  onChange={e => setForm(f => ({ ...f, doses_per_vial: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beyond-Use Days</label>
                <input type="number" min="0" value={form.beyond_use_days}
                  onChange={e => setForm(f => ({ ...f, beyond_use_days: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NDC Pattern</label>
                <input type="text" value={form.ndc_pattern} onChange={e => setForm(f => ({ ...f, ndc_pattern: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  const data = { ...form };
                  data.doses_per_vial = Number(data.doses_per_vial) || 1;
                  if (data.beyond_use_days !== '') data.beyond_use_days = Number(data.beyond_use_days);
                  else data.beyond_use_days = null;
                  updateMutation.mutate({ id: editingId, ...data });
                  setShowCreate(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => { setShowCreate(false); setEditingId(null); }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
