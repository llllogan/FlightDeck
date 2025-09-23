const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUserId(req, res, next) {
  const userId = req.header('user_id');

  if (!userId) {
    return res.status(400).json({ error: 'Missing user_id header' });
  }

  if (!UUID_V4_REGEX.test(userId)) {
    return res.status(400).json({ error: 'Invalid user_id header format' });
  }

  req.userId = userId;
  return next();
}

module.exports = {
  requireUserId,
};
