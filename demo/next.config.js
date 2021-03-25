/* eslint-disable import/no-commonjs */

const basePath = process.env.GITHUB_ACTIONS ? '/react-wait-for-react' : '';

module.exports = {
    exportPathMap() {
        return {
            '/': { page: '/' },
        };
    },
    assetPrefix: `${basePath}/`,
    experimental: {
        basePath,
    },
};
