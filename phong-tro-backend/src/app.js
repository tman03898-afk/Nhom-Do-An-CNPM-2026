const path = require('path');
const express = require('express');
const cors = require('cors');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const explicitCorsOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedDevOrigin(origin) {
  if (!origin) {
    return true;
  }

  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch (error) {
    return false;
  }
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || explicitCorsOrigins.includes(origin) || isAllowedDevOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.json({ message: 'API Quan ly Phong Tro dang chay!' });
});

const zaloRoutes = require('./routes/zalo');
const roomRoutes = require('./routes/rooms');
const authRoutes = require('./routes/auth');
const { router: tenantRoutes } = require('./routes/tenants');
const { router: tenantProfileRoutes } = require('./routes/tenantProfile');
const contractRoutes = require('./routes/contracts');
const invoiceRoutes = require('./routes/invoices');
const paymentRoutes = require('./routes/payments');
const incidentRoutes = require('./routes/incidents');
const notificationRoutes = require('./routes/notifications');
const serviceRoutes = require('./routes/services');
const assetRoutes = require('./routes/assets');
const analyticsRoutes = require('./routes/analytics');
const debugRoutes = require('./routes/debug');
const { router: adminRemovalLogRouter } = require('./routes/adminRemovalLog');

app.use('/api', zaloRoutes);
app.use('/api', authRoutes);
app.use('/api', tenantRoutes);
app.use('/api', tenantProfileRoutes);
app.use('/api', contractRoutes);
app.use('/api', invoiceRoutes);
app.use('/api', paymentRoutes);
app.use('/api', incidentRoutes);
app.use('/api', notificationRoutes);
app.use('/api', serviceRoutes);
app.use('/api', require('./routes/tenantServiceSubscriptions'));
app.use('/api', require('./routes/tenantFeeSubscriptions'));
app.use('/api', assetRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', adminRemovalLogRouter);
app.use('/api/rooms', roomRoutes);
app.use('/api/room-holds', require('./routes/roomHolds'));
app.use('/api', debugRoutes);

app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      ok: false,
      message: 'Dữ liệu tải lên quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB.',
    });
  }
  return next(err);
});

module.exports = app;
