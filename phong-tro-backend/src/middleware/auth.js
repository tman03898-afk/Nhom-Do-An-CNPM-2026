const jwt = require('jsonwebtoken');

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7).trim();
}

function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, message: 'missing access token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  const role = String(req.auth?.role || '').toUpperCase();
  if (!req.auth || role !== 'ADMIN') {
    return res.status(403).json({ ok: false, message: 'admin permission required' });
  }
  return next();
}

function requireTenant(req, res, next) {
  const role = String(req.auth?.role || '').toUpperCase();
  if (!req.auth || role !== 'TENANT') {
    return res.status(403).json({ ok: false, message: 'tenant permission required' });
  }
  return next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireTenant,
};
