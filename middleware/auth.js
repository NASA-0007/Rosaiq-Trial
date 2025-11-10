/**
 * Authentication Middleware
 */

const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  
  // Check if it's an API request
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
  }
  
  // Redirect to login page
  res.redirect('/login.html');
};

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.userId && req.session.role === 'admin') {
    return next();
  }
  
  if (req.path.startsWith('/api/')) {
    return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
  }
  
  res.status(403).send('Admin access required');
};

const optionalAuth = (req, res, next) => {
  // Just passes through, but req.session.userId will be available if logged in
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth
};
