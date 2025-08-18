const webpack = require('webpack');

const config = (env) => {
    return {
        mode: 'development',
        devtool: 'inline-cheap-module-source-map',
        watch: true,
        watchOptions: {
            ignored: ['**/public', '**/node_modules'],
            poll: 1000, // Check for changes every second
            aggregateTimeout: 300, // Delay rebuild after the first change
        },
        plugins: [
            new webpack.DefinePlugin({
                'process.env.BUILD_ENV': JSON.stringify('DEV'),
                'process.env.DEBUG': true,
                'process.env.TAILWIND_MODE': 'watch'
            }),
            new webpack.HotModuleReplacementPlugin(),
        ]
    };
};

module.exports = config;
