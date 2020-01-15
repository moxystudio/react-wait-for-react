const getCurrentScript = () => {
    if (document.currentScript) {
        return document.currentScript;
    }

    const scripts = document.getElementsByTagName('script');

    return scripts[scripts.length - 1];
};

const getElements = () => {
    const elementsArray = Array.prototype.slice.call(document.querySelectorAll('[data-wait-for-react-element]'));

    return elementsArray.reduce((elements, element) => {
        elements[element.getAttribute('data-wait-for-react-element')] = element;

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

window.__WAIT_FOR_IT__ = {
    elements: undefined,
    time: 0,
    progress: 0,
    applyProgress,
    intervalId: undefined,
};

ready(() => {
    const fakeIncrement = () => {
        window.__WAIT_FOR_IT__.time += progressInterval;

        const progress = progressDecay(window.__WAIT_FOR_IT__.time);

        // Normalize progress having into consideration the max progress, ensuring it is between 0 and 95% of maxProgress
        const normalizedProgress = maxProgress * progress;
        const roundedProgress = Math.round(normalizedProgress * (10 ** 6)) / (10 ** 6);
        const truncatedProgress = Math.max(Math.min(roundedProgress, maxProgress * 0.95, 0));

        window.__WAIT_FOR_IT__.progress = truncatedProgress;
        window.__WAIT_FOR_IT__.applyProgress(window.__WAIT_FOR_IT__.elements, normalizedProgress);
    };

    window.__WAIT_FOR_IT__.elements = getElements();
    window.__WAIT_FOR_IT__.intervalId = setInterval(fakeIncrement, progressInterval);

    fakeIncrement();
});
