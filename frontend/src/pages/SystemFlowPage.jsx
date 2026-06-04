import { Card, CardContent, Grid, List, ListItem, ListItemText } from '@mui/material';
import PageHeader from '../components/PageHeader';

const sections = {
  'Core app flow': [
    'PWA opens in planning mode before event day',
    'Role-based login loads duty-aware dashboard',
    'Student intake supports marks, subjects, certificate preview and evaluation',
    'Eligible students move into stage sequence with category-wise anchor mapping',
    'Senior team can replace guests live and anchor sees popup instantly',
    'Donation entry and WhatsApp thank-you can be triggered quickly',
    'Budget, vendor, expense and task visibility continues across the event lifecycle'
  ],
  'Live mode rule': [
    'Planning days: local/manual sync is acceptable',
    'Event day: sockets + server truth + auto refresh are primary',
    'Offline fallback should queue limited actions only',
    'Current stage, guest change and donations should always reflect server state'
  ],
  'WhatsApp addition': [
    'Merged as dedicated WhatsApp center',
    'Connections, templates, logs and quick sending live in one module',
    'Automation rules stay visible in Admin area',
    'Current implementation is safe placeholder unless real API credentials are configured'
  ]
};

export default function SystemFlowPage() {
  return (
    <>
      <PageHeader title="Master flow & features chart" subtitle="Single-screen operational summary of the project scope discussed in chat." />
      <Grid container spacing={2}>{Object.entries(sections).map(([title, items]) => <Grid key={title} size={{ xs: 12, md: 6 }}><Card><CardContent><List><ListItem><ListItemText primary={title} /></ListItem>{items.map((item, idx) => <ListItem key={idx}><ListItemText primary={item} /></ListItem>)}</List></CardContent></Card></Grid>)}</Grid>
    </>
  );
}
