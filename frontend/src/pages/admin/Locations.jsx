import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import toast from 'react-hot-toast';

export default function AdminLocations() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/locations', data),
    onSuccess: () => {
      toast.success('Location created');
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setShowCreate(false);
      setName('');
      setAddress('');
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/locations/${id}`, data),
    onSuccess: () => {
      toast.success('Location updated');
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setEditingId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Manage Locations</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {showCreate ? 'Cancel' : 'Add Location'}
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name) { toast.error('Name required'); return; }
            createMutation.mutate({ name, address });
          }}
          className="bg-white rounded-lg border p-4 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none" />
            </div>
          </div>
          <button type="submit" disabled={createMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            Create Location
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg border p-4">
        {isLoading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Name</th>
                <th className="pb-2">Address</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations?.map(l => (
                <tr key={l.id} className="border-b border-gray-50">
                  {editingId === l.id ? (
                    <>
                      <td className="py-2">
                        <input type="text" defaultValue={l.name} id={`loc-name-${l.id}`}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-full" />
                      </td>
                      <td className="py-2">
                        <input type="text" defaultValue={l.address || ''} id={`loc-addr-${l.id}`}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-full" />
                      </td>
                      <td className="py-2">{l.is_active ? 'Active' : 'Inactive'}</td>
                      <td className="py-2 space-x-2">
                        <button onClick={() => {
                          updateMutation.mutate({
                            id: l.id,
                            name: document.getElementById(`loc-name-${l.id}`).value,
                            address: document.getElementById(`loc-addr-${l.id}`).value,
                          });
                        }} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Save</button>
                        <button onClick={() => setEditingId(null)}
                          className="text-gray-500 hover:text-gray-700 text-xs">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 font-medium">{l.name}</td>
                      <td className="py-2 text-gray-500">{l.address || '—'}</td>
                      <td className="py-2">
                        {l.is_active ? (
                          <span className="text-green-600 text-xs">Active</span>
                        ) : (
                          <span className="text-red-600 text-xs">Inactive</span>
                        )}
                      </td>
                      <td className="py-2 space-x-2">
                        <button onClick={() => setEditingId(l.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                        <button onClick={() => updateMutation.mutate({ id: l.id, is_active: !l.is_active })}
                          className="text-red-600 hover:text-red-800 text-xs font-medium">
                          {l.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
