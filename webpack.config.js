'use strict';

const path = require('node:path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: {
    'holub30-visualizer': './public/js/holub30-visualizer.js',
    'hbot-core': './public/js/hbot-core.js',
  },
  output: {
    path: path.resolve(__dirname, 'public', 'dist'),
    filename: '[name].bundle.js',
    clean: true,
  },
  devtool: false,
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      extractComments: false,
      terserOptions: {
        format: { comments: false },
      },
    })],
  },
  performance: {
    hints: 'warning',
    maxAssetSize: 1024 * 1024,
    maxEntrypointSize: 1024 * 1024,
  },
};
