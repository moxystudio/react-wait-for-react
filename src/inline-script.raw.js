const getCurrentScript = () => {
    if (document.currentScript) {
        return document.currentScript;
    }

    const scripts = document.getElementsByTagName('script');

    return scripts[scripts.length - 1];
};

const getElements = () => {
    const elementsArray = Array.prototype.slice.call(document.querySelectorAll('[data-wait-for-element-name]'));

    return elementsArray.reduce((elements, element) => {
        elements[element.getAttribute('data-wait-for-element-name')] = element;

        return elements;
    }, {});
};

const ready = (fn) => {
    if (document.attachEvent ? document.readyState === 'complete' : document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
};

const script = getCurrentScript();

if (!script) {
    throw new Error('Could not find current script element');
}

const dataset = script.dataset;

const maxProgress = dataset.maxProgress;
const applyProgress = new Function(['elements', 'progress'], dataset.applyProgress);
const progressDecay = new Function(['time'], dataset.progressDecay);
const progressInterval = parseInt(dataset.progressInterval, 10);

window.__APP_PRELOADER__ = {
    elements: undefined,
    time: 0,
    progress: 0,
    applyProgress,
    intervalId: undefined,
};

ready(() => {
    const fakeIncrement = () => {
        window.__APP_PRELOADER__.time += progressInterval;

        const progress = progressDecay(window.__APP_PRELOADER__.time);

        // Normalize progress having into consideration the max progress and
        // round it to 6 decimal places to circumvent issues with using floats with large decimals places in styles
        const truncatedProgress = Math.max(Math.min(progress, 1), 0);
        const normalizedProgress = maxProgress * truncatedProgress;
        const roundedProgress = Math.round(normalizedProgress * (10 ** 6)) / (10 ** 6);

        window.__APP_PRELOADER__.progress = roundedProgress;
        window.__APP_PRELOADER__.applyProgress(window.__APP_PRELOADER__.elements, roundedProgress);
    };

    window.__APP_PRELOADER__.elements = getElements();
    window.__APP_PRELOADER__.intervalId = setInterval(fakeIncrement, progressInterval);

    console.log(window.__APP_PRELOADER__);

    fakeIncrement();
});
