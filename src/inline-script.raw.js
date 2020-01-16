(() => {
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

    const maxProgress = Number(dataset.maxProgress);
    const applyProgress = new Function(['elements', 'progress'], `(${dataset.applyProgress})(elements, progress)`);
    const progressDecay = new Function(['time'], `return (${dataset.progressDecay})(time)`);
    const progressInterval = Number(dataset.progressInterval);

    const __STATE__ = {
        progress: 0,
        intervalId: undefined,
    };

    // Push the state so that it's picked up when rehydrating
    // The array is needed to allow multiple instances of `<WaitForIt>`
    window.__WAIT_FOR_IT__ = window.__WAIT_FOR_IT__ || [];
    window.__WAIT_FOR_IT__.push(__STATE__);

    ready(() => {
        const elements = getElements();
        let time = 0;

        const fakeIncrement = () => {
            time += progressInterval;

            const progress = progressDecay(time);

            // Normalize progress having into consideration the max progress, ensuring it is between 0 and 95% of maxProgress
            const normalizedProgress = maxProgress * progress;
            const roundedProgress = Math.round(normalizedProgress * (10 ** 6)) / (10 ** 6);
            const truncatedProgress = Math.max(Math.min(roundedProgress, maxProgress * 0.95), 0);

            __STATE__.progress = truncatedProgress;
            applyProgress(elements, truncatedProgress);
        };

        __STATE__.intervalId = setInterval(fakeIncrement, progressInterval);

        fakeIncrement();
    });
})();
