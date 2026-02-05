import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import toast from 'react-hot-toast';

export default function TemperatureLog() {
  const queryClient = useQueryClient();
  const [unitName, setUnitName] = useState('');
  const [readingF, setReadingF] = useState('');
  const [notes, setNotes] = useState('');

  const { data: readings, isLoading } = useQuery({
    queryKey: ['temperature'],
    queryFn: () => api.get('/temperature'),
  });

  const { data: excursions } = useQuery({
    queryKey: ['temperature-excursions'],
    queryFn: () => api.get('/temperature/excursions'),
  });

  const logMutation = useMutation({
    mutationFn: (data) => api.post('/temperature', data),
    onSuccess: (data) => {
      if (data.out_of_range) {
        toast.error('OUT OF RANGE! Temperature excursion logged.', { duration: 5000 });
      } else {
        toast.success('Temperature logged');
      }
      queryClient.invalidateQueries({ queryKey: ['temperature'] });
      queryClient.invalidateQueries({ queryKey: ['temperature-excursions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setReadingF('');
      setNotes('');
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!unitName || readingF === '') { toast.error('Unit name and reading required'); return; }
    logMutation.mutate({
      unit_name: unitName,
      reading_f: Number(readingF),
      notes: notes || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Temperature Log</h1>

      {/* Active Excursions */}
      {excursions?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-bold text-red-700 mb-2">Active Excursions</h3>
          {excursions.slice(0, 5).map((e, i) => (
            <p key={i} className="text-sm text-red-600">
              {e.unit_name}: {e.reading_f}°F — {new Date(e.reading_time).toLocaleString()}
              {e.notes && <span className="text-red-400"> — {e.notes}</span>}
            </p>
          ))}
        </div>
      )}

      {/* Log New Reading */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-4 space-y-4">
        <h2 className="font-bold text-gray-700">Log Temperature Reading</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Storage Unit</label>
            <input
              type="text"
              value={unitName}
              onChange={e => setUnitName(e.target.value)}
              placeholder="e.g. Fridge 1, Freezer A"
              list="unit-names"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
            />
            <datalist id="unit-names">
              {[...new Set(readings?.map(r => r.unit_name) || [])].map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°F)</label>
            <input
              type="number"
              step="0.1"
              value={readingF}
              onChange={e => setReadingF(e.target.value)}
              placeholder="e.g. 40.5"
              className={`w-full px-3 py-2 border rounded-lg outline-none ${
                readingF !== '' && (Number(readingF) < 36 || Number(readingF) > 46)
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            <p className="text-xs text-gray-400 mt-1">Acceptable range: 36°F – 46°F</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={logMutation.isPending}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {logMutation.isPending ? 'Logging...' : 'Log Reading'}
        </button>
      </form>

      {/* Reading History */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-bold text-gray-700 mb-3">Recent Readings</h2>
        {isLoading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : readings?.length === 0 ? (
          <p className="text-gray-400 text-sm">No readings logged.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Unit</th>
                  <th className="pb-2">Temp</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {readings?.slice(0, 30).map(r => (
                  <tr key={r.id} className={`border-b border-gray-50 ${r.out_of_range ? 'bg-red-50' : ''}`}>
                    <td className="py-1.5">{r.unit_name}</td>
                    <td className="py-1.5 font-medium">{r.reading_f}°F</td>
                    <td className="py-1.5">
                      {r.out_of_range ? (
                        <span className="text-red-600 font-bold text-xs">OUT OF RANGE</span>
                      ) : (
                        <span className="text-green-600 text-xs">OK</span>
                      )}
                    </td>
                    <td className="py-1.5 text-gray-500">{new Date(r.reading_time).toLocaleString()}</td>
                    <td className="py-1.5 text-gray-500 max-w-48 truncate">{r.notes}</td>
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
