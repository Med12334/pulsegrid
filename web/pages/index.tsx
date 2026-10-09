import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';

const MapWithNoSSR = dynamic(() => import('../components/Map'), {
  ssr: false,
});

interface Incident {
  id: string;
  title: string;
  raw_description: string;
  priority: string;
  status: string;
  ai_severity_score: number | string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export default function Home() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);

  const [form, setForm] = useState({
    title: '',
    raw_description: '',
    priority: 'HIGH',
    latitude: 36.8065,
    longitude: 10.1815,
  });

  const fetchIncidents = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/incidents');
      if (res.data?.incidents) {
        setIncidents(res.data.incidents);
      }
    } catch (err) {
      console.error('Failed to fetch incidents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('http://localhost:3000/api/incidents', {
        ...form,
        latitude: parseFloat(String(form.latitude)),
        longitude: parseFloat(String(form.longitude)),
      });
      setShowModal(false);
      setForm({
        title: '',
        raw_description: '',
        priority: 'HIGH',
        latitude: 36.8065,
        longitude: 10.1815,
      });
      await fetchIncidents();
    } catch (err) {
      console.error('Failed to dispatch incident', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#090d16', minHeight: '100vh', color: '#f3f4f6', fontFamily: 'sans-serif', padding: '16px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #1f2937', paddingBottom: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>●</span> PulseGrid Command Center
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>
            Real-time Distributed Emergency Response Network
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >
            + Dispatch Incident
          </button>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>
            Active Incidents: {incidents.length}
          </div>
        </div>
      </header>

      {/* Map Section */}
      <div style={{ height: '360px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1f2937', marginBottom: '16px' }}>
        <MapWithNoSSR incidents={incidents} />
      </div>

      {/* Incident Feed */}
      <div>
        <h2 style={{ fontSize: '0.9rem', color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Live Incident Feed
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {incidents.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.title}</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: item.status === 'DISPATCHED' ? '#065f46' : '#7f1d1d',
                    color: item.status === 'DISPATCHED' ? '#34d399' : '#f87171',
                    fontWeight: 700,
                  }}
                >
                  {item.status}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>{item.raw_description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#6b7280', marginTop: '4px' }}>
                <span>Severity: {item.ai_severity_score ?? '0.0'}</span>
                <span>{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Dialog */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
          <form
            onSubmit={handleCreate}
            style={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Trigger New Incident</h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>Title</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Chemical Storage Leak"
                style={{ width: '100%', padding: '8px', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>Description</label>
              <textarea
                required
                rows={3}
                value={form.raw_description}
                onChange={(e) => setForm({ ...form, raw_description: e.target.value })}
                placeholder="Detailed situation report..."
                style={{ width: '100%', padding: '8px', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ padding: '8px 12px', backgroundColor: '#374151', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                {submitting ? 'Submitting...' : 'Dispatch'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
