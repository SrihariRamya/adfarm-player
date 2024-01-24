const path = require('path');

module.exports = function override(config, env) {
  config.output.path = path.resolve(__dirname, 'build');
  config.output.filename = 'static/js/[name].js';
  config.output.chunkFilename = 'static/js/[name].js'

  return config;
};