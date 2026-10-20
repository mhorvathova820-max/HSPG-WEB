'use strict';

const path = require('node:path');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');

module.exports = {
  entry: {
    'holub30-visualizer': './public/js/holub30-visualizer.js',
    'hbot-core': './public/js/hbot-core.js',
    'admin-core': './public/js/admin-core.js',
    'holub30-style': './public/css/holub30-style.css',
    'admin-cockpit-style': './public/css/admin-cockpit.css',
  },
  output: {
    path: path.resolve(__dirname, 'public', 'dist'),
    filename: '[name].bundle.js',
    clean: true,
  },
  devtool: false,
  module: {
    rules: [{
      test: /\.css$/i,
      use: [MiniCssExtractPlugin.loader, 'css-loader'],
    }],
  },
  plugins: [
    new RemoveEmptyScriptsPlugin(),
    new MiniCssExtractPlugin({ filename: '[name].css' }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          format: { comments: false },
        },
      }),
      new CssMinimizerPlugin(),
    ],
  },
  performance: {
    hints: 'warning',
    maxAssetSize: 1024 * 1024,
    maxEntrypointSize: 1024 * 1024,
  },
};
