module.exports = {
    experimental: {
        css: true,
    },
    webpack: (config) => {
        config.resolve.symlinks = false;

        return config;
    },
};
