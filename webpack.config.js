const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  entry: './src/public/main.tsx',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'built/src/public'),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{
          loader: 'ts-loader',
          options: {
            onlyCompileBundledFiles: true
          }
        }],
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin([
      { from: '*.html', context: 'src/public' },
      { from: '*.ttf', context: 'src', to: '..' },
    ])
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
}
