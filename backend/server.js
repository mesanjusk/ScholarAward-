const express = require('express');
const http = require('http');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { setIO } = require('./services/socket');
const seedAdmin = require("./seedAdmin");

dotenv.config();

process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || String(reason);
  if (msg.includes('Connection Closed') || msg.includes('Timed Out') || msg.includes('baileys')) {
    console.warn('[unhandledRejection] Baileys internal error (ignored):', msg);
  } else {
    console.error('[unhandledRejection]', reason);
  }
});

process.on('uncaughtException', (err) => {
  const msg = err?.message || String(err);
  if (msg.includes('Connection Closed') || msg.includes('Timed Out')) {
    console.warn('[uncaughtException] Baileys socket error (ignored):', msg);
  } else {
    console.error('[uncaughtException] Fatal:', err);
    process.exit(1);
  }
});

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://bkfrontend.vercel.app',
  'https://bkawards.instify.in',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.get('/', (req, res) => res.send('Scholar Awards Event Backend running'));

app.use('/api/auth',                require('./routes/authRoutes'));
app.use('/api/dashboard',           require('./routes/dashboardRoutes'));
app.use('/api/roles',               require('./routes/crudRoutes')(require('./models/Role')));
app.use('/api/users',               require('./routes/userRoutes'));
app.use('/api/events',              require('./routes/crudRoutes')(require('./models/Event')));
app.use('/api/categories',          require('./routes/crudRoutes')(require('./models/Category'), 'anchorId backupAnchorIds preferredGuestIds'));
app.use('/api/students',            require('./routes/studentRoutes'));
app.use('/api/stage-assignments',   require('./routes/stageRoutes'));
app.use('/api/notifications',       require('./routes/crudRoutes')(require('./models/Notification')));
app.use('/api/donations',           require('./routes/crudRoutes')(require('./models/Donation'), 'donorGuestId receivedByUserId'));
app.use('/api/automation-rules',    require('./routes/crudRoutes')(require('./models/AutomationRule')));
app.use('/api/certificate-templates', require('./routes/crudRoutes')(require('./models/CertificateTemplate')));
app.use('/api/teams',               require('./routes/crudRoutes')(require('./models/Team'), 'leadUserId memberUserIds'));
app.use('/api/budget-heads',        require('./routes/crudRoutes')(require('./models/BudgetHead'), 'responsibleTeamId responsibleUserId'));
app.use('/api/vendors',             require('./routes/crudRoutes')(require('./models/Vendor'), 'budgetHeadId responsibleTeamId responsibleUserId'));
app.use('/api/expenses',            require('./routes/crudRoutes')(require('./models/Expense'), 'budgetHeadId vendorId paidByUserId approvedByUserId'));
app.use('/api/event-tasks',         require('./routes/crudRoutes')(require('./models/EventTask'), 'teamId assignedToUserId backupUserId linkedVendorId'));
app.use('/api/whatsapp',            require('./routes/whatsappRoutes'));
app.use('/api/baileys',             require('./routes/baileysRoutes'));
app.use('/api/campaigns',           require('./routes/campaignRoutes'));
app.use('/api/uploads',             require('./routes/uploadRoutes'));
app.use('/api/volunteers',          require('./routes/volunteerRoutes'));
app.use('/api/system-settings',     require('./routes/systemSettingsRoutes'));
app.use('/api/anchors',             require('./routes/anchors.routes'));
app.use('/api/agenda',              require('./routes/agendaRoutes'));


async function startServer() {
  try {
    await connectDB();
    await seedAdmin();

    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true
      }
    });

    setIO(io);

    io.on('connection', (socket) => {
      console.log('socket connected', socket.id);
      socket.on('join-role-room', (role) => socket.join(`role:${role}`));
      socket.on('disconnect', () => console.log('socket disconnected', socket.id));
    });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
      const { autoConnectIfCredentialsExist } = require('./services/baileysService');
      autoConnectIfCredentialsExist().catch((err) =>
        console.error('[baileys] Auto-connect failed on boot:', err.message)
      );
    });

  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
