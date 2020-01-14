module.exports = (api) => {
    api.cache(true);

    return {
        ignore: process.env.NODE_ENV === 'test' ? [] : ['**/*.test.js'],
        overrides: [
            {
                exclude: '**/inline-script.raw.js',
                presets: [
                    ['@moxy/babel-preset/lib', { react: true }],
                ],
                plugins: [
                    ['babel-plugin-inline-import', { extensions: ['.raw.js', '.raw'] }],
                ],
            },
            {
                test: '**/inline-script.raw.js',
                presets: [
                    ['@moxy/babel-preset/end-project', {
                        targets: {
                            browsers: ['IE 11'],
                        },
                    }],
                ],
            },
        ],
    };
};
