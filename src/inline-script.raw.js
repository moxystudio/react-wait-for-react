(() => {
    const getCurrentScript = () => {
        if (document.currentScript) {
            return document.currentScript;
        }

        const scripts = document.getElementsByTagName('script');

        return scripts[scripts.length - 1];
    };

    const getConfig = (script) => {
        const { dataset } = script;

        const maxProgress = Number(dataset.maxProgress);
        /* eslint-disable no-new-func */
        const applyProgress = new Function(['elements', 'progress'], `(${dataset.applyProgress})(elements, progress)`);
        const progressDecay = new Function(['time'], `return (${dataset.progressDecay})(time)`);
        /* eslint-enable no-new-func */
        const progressInterval = Number(dataset.progressInterval);

        return {
            maxProgress,
            applyProgress,
            progressDecay,
            progressInterval,
        };
    };

    const getElements = (script) => {
        const parentElement = script.parentNode;
        const elementsArray = Array.prototype.slice.call(parentElement.querySelectorAll('[data-wait-for-react-element]'));

        return elementsArray.reduce((elements, element) => {
            elements[element.getAttribute('data-wait-for-react-element')] = element;

            return elements;
        }, {});
    };

    const script = getCurrentScript();
    const config = getConfig(script);
    const elements = getElements(script);

    const __STATE__ = {
        progress: 0,
        time: 0,
        timeoutId: undefined,
    };

    // Push the state so that it's picked up when rehydrating
    // The array is needed to allow multiple instances of `<WaitForIt>`
    window.__REACT_WAIT_FOR_REACT__ = window.__REACT_WAIT_FOR_REACT__ || [];
    window.__REACT_WAIT_FOR_REACT__.push(__STATE__);

    const fakeIncrement = () => {
        __STATE__.time += config.progressInterval;

        const progress = config.progressDecay(__STATE__.time);

        // Normalize progress having into consideration the max progress, ensuring it is between 0 and 95% of maxProgress
        const normalizedProgress = config.maxProgress * progress;
        const roundedProgress = Math.round(normalizedProgress * (10 ** 6)) / (10 ** 6);
        const truncatedProgress = Math.max(Math.min(roundedProgress, config.maxProgress * 0.99), 0);

        __STATE__.progress = truncatedProgress;
        __STATE__.timeoutId = setTimeout(fakeIncrement, config.progressInterval);

        config.applyProgress(elements, truncatedProgress);
    };

    __STATE__.timeoutId = setTimeout(fakeIncrement, Math.min(60, config.progressInterval));
})();
