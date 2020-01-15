import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { throttle } from 'lodash';
import changeProps from 'react-change-props';
import script from './inline-script.raw.js';

export default class WaitForReact extends Component {
    state;

    time = 0;
    timeoutId;
    promise;
    progressDecayFn;

    constructor(props) {
        super(props);

        const renderScript = this.props.maxProgressBeforeInteractive > 0 && !!this.props.applyProgressBeforeInteractive;
        const progress = typeof window !== 'undefined' && window.__WAIT_FOR_IT__ ? window.__WAIT_FOR_IT__.progress : 0;

        this.state = {
            renderScript,
            progress,
            error: undefined,
        };
    }

    componentDidMount() {
        if (window.__WAIT_FOR_IT__) {
            clearTimeout(window.__WAIT_FOR_IT__.intervalId);
            delete window.__WAIT_FOR_IT__;
        }

        this.setStateThrottled = throttle(this.setState.bind(this), this.props.progressInterval, { leading: false });
        this.progressDecayFn = new Function(['time'], `return (${this.props.progressDecay})(time)`);

        this.trackPromise();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.progressInterval !== this.props.progressInterval) {
            this.setStateThrottled = throttle(this.setState.bind(this), this.props.progressInterval, { leading: false });
        }
        if (prevProps.progressDecay !== this.props.progressDecay) {
            this.progressDecayFn = new Function(['time'], `return (${this.props.progressDecay})(time)`);
        }

        if (prevProps.promise !== this.props.promise) {
            this.untrackPromise();
            this.trackPromise();
        } else if (!prevState.error && this.state.error) {
            this.props.onDone && this.props.onDone(this.state.error);
        } else if (prevState.progress !== 1 && this.state.progress === 1) {
            this.props.onDone && this.props.onDone();
        }
    }

    componentWillUnmount() {
        this.untrackPromise();
    }

    render() {
        const { renderScript, progress, error } = this.state;
        const { progressDecay, progressInterval, applyProgressBeforeInteractive, maxProgressBeforeInteractive, children } = this.props;

        const returnedChildren = this.suppressHydrationWarnings(children({ progress, error }));

        return (
            <>
                { renderScript && (
                    <script
                        dangerouslySetInnerHTML={ { __html: script } }
                        data-max-progress={ maxProgressBeforeInteractive }
                        data-apply-progress={ `(${applyProgressBeforeInteractive})(elements, progress)` }
                        data-progress-decay={ `return (${progressDecay})(time)` }
                        data-progress-interval={ progressInterval } />
                ) }
                { returnedChildren }
            </>
        );
    }

    untrackPromise() {
        this.setStateThrottled.cancel();
        clearTimeout(this.timeoutId);

        this.time = 0;
        this.timeoutId = undefined;
        this.promise = undefined;
    }

    trackPromise() {
        this.promise = this.props.promise;

        const maybe = (fn) => (...args) => this.promise === this.props.promise && fn(...args);

        this.setStateThrottled({
            progress: this.props.maxProgressBeforeInteractive,
            error: undefined,
            renderScript: false,
        }, maybe(() => {
            if (!this.promise) {
                this.setStateThrottled({ progress: 1 });

                return;
            }

            if (!this.promise.onProgress) {
                this.startFakeProgress(maybe((progress) => {
                    this.setStateThrottled({ progress: this.normalizeProgress(progress) });
                }));
            } else {
                if (this.promise.progress != null) {
                    this.setStateThrottled({ progress: this.normalizeProgress(this.promise.progress) });
                }

                this.promise.onProgress(maybe((progress) => {
                    this.setStateThrottled({ progress: this.normalizeProgress(progress) });
                }));
            }

            this.promise
                .then(maybe(() => {
                    this.untrackPromise();
                    this.setStateThrottled({ progress: 1 });
                }))
                .catch(maybe((err) => {
                    this.untrackPromise();
                    this.setStateThrottled({ error: err });
                }));
        }));
    }

    startFakeProgress = (fn) => {
        const { progressInterval } = this.props;

        this.time += progressInterval;

        fn(this.progressDecayFn(this.time));

        this.timeoutId = setTimeout(() => this.startFakeProgress(fn), progressInterval);
    };

    normalizeProgress(progress) {
        const { maxProgressBeforeInteractive } = this.props;

        // Normalize progress having into consideration the progress from before interactive, ensuring it is between 0 and 0.95
        const normalizedProgress = maxProgressBeforeInteractive + ((1 - maxProgressBeforeInteractive) * progress);
        const roundedProgress = Math.round(normalizedProgress * (10 ** 6)) / (10 ** 6);
        const truncatedProgress = Math.max(Math.min(roundedProgress, 0.95), 0);

        return truncatedProgress;
    }

    suppressHydrationWarnings(children) {
        return changeProps(children, (child) =>
            child.props['data-wait-for-react-element'] != null ? { suppressHydrationWarning: true } : {},
        );
    }
}

WaitForReact.propTypes = {
    children: PropTypes.func.isRequired,
    maxProgressBeforeInteractive: PropTypes.number,
    applyProgressBeforeInteractive: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
    progressDecay: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
    progressInterval: PropTypes.number,
    promise: PropTypes.object,
    onDone: PropTypes.func,
};

WaitForReact.defaultProps = {
    progressInterval: 100,
    progressDecay: /* istanbul ignore next */ (time) => 1 - Math.exp(-1 * time / 4000),
    maxProgressBeforeInteractive: 0.4,
};
