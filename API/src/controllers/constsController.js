const ENVIRONMENT_CODES = ['prd', 'ci', 'qa', 'tst', 'dev', 'local'];

function getEnvironments(_req, res) {
  return res.json({ environments: ENVIRONMENT_CODES });
}

module.exports = {
  getEnvironments,
};
