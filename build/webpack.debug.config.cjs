const webpack = require('webpack');

const config = (env) => {
  return {
      mode: 'production',
      devtool: false,
      performance: {
          maxEntrypointSize: 2500000,
          maxAssetSize: 2500000
      },
      plugins: [
          // new BundleAnalyzerPlugin(),
          new webpack.DefinePlugin({
              'process.env.BUILD_ENV': JSON.stringify('PRO'),
              'process.env.DEBUG': true
          })
      ]
  }
};

module.exports = (env) => config(env);
