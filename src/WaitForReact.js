import React, { PureComponent, Children, cloneElement, isValidElement } from 'react';
import PropTypes from 'prop-types';
import { throttle } from 'lodash';
import script from './inline-script.raw.js';

const pickScriptState = () =>
    typeof window !== 'undefined' && Array.isArray(window.__REACT_WAIT_FOR_REACT__) ? window.__REACT_WAIT_FOR_REACT__.shift() : undefined;

export default class WaitForReact extends PureComponent {
    static propTypes = {
        children: PropTypes.func.isRequired,
        maxProgressBeforeInteractive: PropTypes.number,
        applyProgressBeforeInteractive: PropTypes.string.isRequired,
        progressDecay: PropTypes.string,
        progressInterval: PropTypes.number,
        promise: PropTypes.object,
        onDone: PropTypes.func,
    };

    static defaultProps = {
        progressInterval: 100,
        progressDecay: /* istanbul ignore next */ 'function (time) { return Math.min(0.95, 1 - Math.exp(-1 * time / 4000)); }',
        maxProgressBeforeInteractive: 0.4,
    };

    static getDerivedStateFromProps(props, state) {
        if (state.promise === props.promise) {
            return null;
        }

        return {
            promise: props.promise,
            renderScript: false,
            progress: props.promise ? 0 : 1,
            error: undefined,
        };
    }

    time = 0;
    timeoutId;
    promise;
    progressDecayFn;

    constructor(props) {
        super(props);

        if (typeof window === 'undefined') {
            this.state = {
                promise: props.promise,
                renderScript: true,
                progress: 0,
                error: undefined,
            };
        } else {
            const scriptState = pickScriptState();
            const initialProgress = props.promise ? 0 : 1;

            clearTimeout(scriptState?.timeoutId);

            this.state = {
                promise: props.promise,
                renderScript: !!scriptState,
                progress: scriptState ? scriptState.progress : initialProgress,
                error: undefined,
            };
        }
    }

    componentDidMount() {
        this.setStateThrottled = throttle(this.setState.bind(this), this.props.progressInterval, { leading: false });
        // eslint-disable-next-line no-new-func
        this.progressDecayFn = new Function(['time'], `return (${this.props.progressDecay})(time)`);

        this.trackPromise();

        if (this.state.progress === 1) {
            this.props.onDone && this.props.onDone();
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.progressInterval !== this.props.progressInterval) {
            this.setStateThrottled.cancel();
            this.setStateThrottled = throttle(this.setState.bind(this), this.props.progressInterval, { leading: false });
        }
        if (prevProps.progressDecay !== this.props.progressDecay) {
            // eslint-disable-next-line no-new-func
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
                { returnedChildren }
                { renderScript && (
                    <script
                        dangerouslySetInnerHTML={ { __html: script } }
                        data-max-progress={ maxProgressBeforeInteractive }
                        data-apply-progress={ applyProgressBeforeInteractive }
                        data-progress-decay={ progressDecay }
                        data-progress-interval={ progressInterval } />
                ) }
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
        if (!this.props.promise) {
            this.setStateThrottled({ progress: 1 });

            return;
        }

        this.promise = this.props.promise;

        const maybe = (fn) => (...args) => this.promise === this.props.promise && fn(...args);

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
    }

    startFakeProgress = (fn) => {
        const { progressInterval } = this.props;

        this.time += progressInterval;

        fn(this.progressDecayFn(this.time));

        this.timeoutId = setTimeout(() => this.startFakeProgress(fn), progressInterval);
    };

    normalizeProgress(progress) {
        const { renderScript: resumed } = this.state;
        const { maxProgressBeforeInteractive } = this.props;

        // Normalize progress having into consideration the progress from before interactive, ensuring it is between 0 and 0.95
        const normalizedProgress = resumed ? maxProgressBeforeInteractive + ((1 - maxProgressBeforeInteractive) * progress) : progress;
        const roundedProgress = Math.round(normalizedProgress * (10 ** 6)) / (10 ** 6);
        const truncatedProgress = Math.max(Math.min(roundedProgress, 0.99), 0);

        return truncatedProgress;
    }

    suppressHydrationWarnings(children) {
        // Suppress hydration warnings on elements tagged with `data-wait-for-react-element`
        // This is needed because of spaces mismatches in style attributes
        return Children.map(children, (child) => {
            if (!isValidElement(child)) {
                return child;
            }

            return cloneElement(child, {
                children: this.suppressHydrationWarnings(child.props.children),
                suppressHydrationWarning: !!child.props['data-wait-for-react-element'],
            });
        });
    }
}
