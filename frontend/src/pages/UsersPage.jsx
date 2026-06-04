import { useEffect, useState } from 'react';
import api from '../api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ name: '', username: '', password: '', roleId: '' });

  const load = async () => {
    const [u, r] = await Promise.all([api.get('/users'), api.get('/roles')]);
    setUsers(u.data);
    setRoles(r.data);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/users', form);
    setForm({ name: '', username: '', password: '', roleId: '' });
    load();
  };

  return (
    <div>
      <h2>Users</h2>
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
          <option value="">Select role</option>
          {roles.map((role) => <option key={role._id} value={role._id}>{role.name}</option>)}
        </select>
        <button type="submit">Add</button>
      </form>
      <table className="table">
        <thead><tr><th>Name</th><th>Username</th><th>Role</th></tr></thead>
        <tbody>{users.map((u) => <tr key={u._id}><td>{u.name}</td><td>{u.username}</td><td>{u.roleId?.name}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
