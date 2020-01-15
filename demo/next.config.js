module.exports = {
    experimental: {
        css: true,
    },
    exportPathMap() {
        return {
            '/': { page: '/' },
        };
    },
    assetPrefix: process.env.GITHUB_ACTIONS ? '/react-wait-for-react/' : '',
    webpack: (config) => {
        config.resolve.symlinks = false;

        return config;
    },
};
