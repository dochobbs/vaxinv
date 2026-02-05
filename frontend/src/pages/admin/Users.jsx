import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', username: '', pin: '', password: '', role: 'ma', location_id: '' });
  const [resetPinId, setResetPinId] = useState(null);
  const [newPin, setNewPin] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/users', data),
    onSuccess: () => {
      toast.success('User created');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      setForm({ name: '', username: '', pin: '', password: '', role: 'ma', location_id: '' });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/users/${id}`, data),
    onSuccess: () => {
      toast.success('User updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const resetPinMutation = useMutation({
    mutationFn: ({ id, pin }) => api.put(`/users/${id}/reset-pin`, { pin }),
    onSuccess: () => {
      toast.success('PIN reset');
      setResetPinId(null);
      setNewPin('');
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const data = { ...form, location_id: form.location_id ? Number(form.location_id) : undefined };
    if (!data.username) delete data.username;
    if (!data.password) delete data.password;
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Manage Users</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {showCreate ? 'Cancel' : 'Add User'}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
                placeholder="For admin login" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN (6+ digits) *</label>
              <input type="text" inputMode="numeric" value={form.pin}
                onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
                placeholder="For admin login" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none">
                <option value="ma">MA</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select value={form.location_id} onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none">
                <option value="">None</option>
                {locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={createMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            Create User
          </button>
        </form>
      )}

      {/* User List */}
      <div className="bg-white rounded-lg border p-4">
        {isLoading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Name</th>
                <th className="pb-2">Username</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Location</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users?.map(u => (
                <tr key={u.id} className="border-b border-gray-50">
                  {editingId === u.id ? (
                    <>
                      <td className="py-2">
                        <input type="text" defaultValue={u.name} id={`name-${u.id}`}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-full" />
                      </td>
                      <td className="py-2">{u.username || '—'}</td>
                      <td className="py-2">
                        <select defaultValue={u.role} id={`role-${u.id}`}
                          className="px-2 py-1 border border-gray-300 rounded text-sm">
                          <option value="ma">MA</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-2">
                        <select defaultValue={u.location_id || ''} id={`loc-${u.id}`}
                          className="px-2 py-1 border border-gray-300 rounded text-sm">
                          <option value="">None</option>
                          {locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </td>
                      <td className="py-2">{u.is_active ? 'Active' : 'Inactive'}</td>
                      <td className="py-2 space-x-2">
                        <button onClick={() => {
                          updateMutation.mutate({
                            id: u.id,
                            name: document.getElementById(`name-${u.id}`).value,
                            role: document.getElementById(`role-${u.id}`).value,
                            location_id: document.getElementById(`loc-${u.id}`).value || null,
                          });
                        }} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Save</button>
                        <button onClick={() => setEditingId(null)}
                          className="text-gray-500 hover:text-gray-700 text-xs">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 font-medium">{u.name}</td>
                      <td className="py-2 text-gray-500">{u.username || '—'}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700'
                            : u.role === 'manager' ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>{u.role}</span>
                      </td>
                      <td className="py-2 text-gray-500">
                        {locations?.find(l => l.id === u.location_id)?.name || '—'}
                      </td>
                      <td className="py-2">
                        {u.is_active ? (
                          <span className="text-green-600 text-xs">Active</span>
                        ) : (
                          <span className="text-red-600 text-xs">Inactive</span>
                        )}
                      </td>
                      <td className="py-2 space-x-2">
                        <button onClick={() => setEditingId(u.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                        <button onClick={() => setResetPinId(resetPinId === u.id ? null : u.id)}
                          className="text-amber-600 hover:text-amber-800 text-xs font-medium">Reset PIN</button>
                        <button onClick={() => updateMutation.mutate({ id: u.id, is_active: !u.is_active })}
                          className="text-red-600 hover:text-red-800 text-xs font-medium">
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Reset PIN inline */}
        {resetPinId && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
            <span className="text-sm text-amber-700">New PIN for {users?.find(u => u.id === resetPinId)?.name}:</span>
            <input
              type="text"
              inputMode="numeric"
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="6+ digits"
              className="px-2 py-1 border border-amber-300 rounded text-sm w-32"
            />
            <button
              onClick={() => resetPinMutation.mutate({ id: resetPinId, pin: newPin })}
              disabled={newPin.length < 6}
              className="px-3 py-1 bg-amber-500 text-white rounded text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
