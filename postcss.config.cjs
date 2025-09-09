module.exports = {
    plugins: {
        '@tailwindcss/postcss': {},
        'postcss-preset-env': {
            stage: 3,
            features: {
                'nesting-rules': false
            }
        }
    }
};
