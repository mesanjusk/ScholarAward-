import { useEffect, useState } from 'react';
import api from '../api';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ eventName: '', venue: '', organizerName: '' });

  const load = async () => {
    const { data } = await api.get('/events');
    setEvents(data);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/events', form);
    setForm({ eventName: '', venue: '', organizerName: '' });
    load();
  };

  return (
    <div>
      <h2>Events</h2>
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Event name" value={form.eventName} onChange={(e) => setForm({ ...form, eventName: e.target.value })} />
        <input placeholder="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
        <input placeholder="Organizer" value={form.organizerName} onChange={(e) => setForm({ ...form, organizerName: e.target.value })} />
        <button type="submit">Add</button>
      </form>
      <table className="table">
        <thead><tr><th>Event</th><th>Venue</th><th>Organizer</th></tr></thead>
        <tbody>{events.map((e) => <tr key={e._id}><td>{e.eventName}</td><td>{e.venue}</td><td>{e.organizerName}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
