import { useEffect, useState } from 'react';
import api from '../api';

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ name: '', code: '' });

  const loadRoles = async () => {
    const { data } = await api.get('/roles');
    setRoles(data);
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/roles', form);
    setForm({ name: '', code: '' });
    loadRoles();
  };

  return (
    <div>
      <h2>Roles</h2>
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Role name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <button type="submit">Add</button>
      </form>
      <table className="table">
        <thead><tr><th>Name</th><th>Code</th></tr></thead>
        <tbody>{roles.map((r) => <tr key={r._id}><td>{r.name}</td><td>{r.code}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
