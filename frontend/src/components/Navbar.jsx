import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const baseLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/students', label: 'Students' },
  { to: '/categories', label: 'Categories' },
  { to: '/stage', label: 'Stage' },
  { to: '/budget', label: 'Budget' },
  { to: '/responsibilities', label: 'Responsibilities' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/system-flow', label: 'System Flow' }
];

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <div className="nav">
      <div className="nav-title">Scholar Awards PWA</div>
      <div className="nav-links">
        {baseLinks.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
        {user?.roleId?.code === 'SUPER_ADMIN' ? <Link to="/admin">Admin</Link> : null}
        <span>{user?.name} · {user?.roleId?.name}</span>
        <button onClick={logout}>Logout</button>
      </div>
    </div>
  );
}
