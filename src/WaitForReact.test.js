import React from 'react';
import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import PProgress from 'p-progress';
import WaitForReact from './WaitForReact';

const defaultApplyProgressBeforeInteractive = `function (elements, progress) {
    elements.progressBar.style.transform = 'scaleX(' + progress + ')';
}`;
const defaultChildren = ({ progress }) => (
    <div data-wait-for-react-element="bar" style={ { transform: `scaleX(${progress})` } } />
);

const didReportProgress = (children) => children.mock.calls.some((call) => call[0].progress > 0 && call[0].progress < 1);

const WaitForReactWithDefaults = (props = {}) => (
    <WaitForReact
        applyProgressBeforeInteractive={ defaultApplyProgressBeforeInteractive }
        { ...props }>
        { props.children || defaultChildren }
    </WaitForReact>
);

beforeAll(() => {
    jest.spyOn(Math, 'random').mockImplementation(() => 0.5);
});

beforeEach(() => {
    jest.clearAllMocks();
});

it('should call children function correctly when there\'s no promise', async () => {
    const children = jest.fn(defaultChildren);

    render((
        <WaitForReactWithDefaults>
            { children }
        </WaitForReactWithDefaults>
    ));

    expect(children).toHaveBeenCalledTimes(1);
    expect(children).toHaveBeenCalledWith({ progress: 1, error: undefined });

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(children).toHaveBeenCalledTimes(1);
});

it('should call children function correctly on fulfilled promise', async () => {
    const children = jest.fn(defaultChildren);
    const promise = Promise.resolve();

    render((
        <WaitForReactWithDefaults promise={ promise }>
            { children }
        </WaitForReactWithDefaults>
    ));

    expect(children).toHaveBeenCalledTimes(1);
    expect(children).toHaveBeenCalledWith({ progress: 0, error: undefined });

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(children).toHaveBeenCalledTimes(2);
    expect(children).toHaveBeenCalledWith({ progress: 0, error: undefined });
    expect(children).toHaveBeenCalledWith({ progress: 1, error: undefined });
});

it('should call children function correctly on rejected promise', async () => {
    const error = new Error('foo');
    const children = jest.fn(defaultChildren);
    const promise = Promise.reject(error);

    render((
        <WaitForReactWithDefaults promise={ promise }>
            { children }
        </WaitForReactWithDefaults>
    ));

    expect(children).toHaveBeenCalledTimes(1);
    expect(children).toHaveBeenCalledWith({ progress: 0, error: undefined });

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(children).toHaveBeenCalledTimes(2);
    expect(children).toHaveBeenCalledWith({ progress: 0, error: undefined });
    expect(children).toHaveBeenCalledWith({ progress: 0, error });
});

it('should render correctly', async () => {
    const { container } = render(<WaitForReactWithDefaults />);

    const div = container.querySelector('div');

    expect(div).toBeInstanceOf(HTMLElement);
    expect(div.style.transform).toBe('scaleX(1)');
});

it('should call onDone immediately when there is no promise', async () => {
    const onDone = jest.fn(() => {});

    render(<WaitForReactWithDefaults onDone={ onDone } />);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(onDone).toHaveBeenCalledTimes(1);
});

it('should call onDone when promise fulfills', async () => {
    const promise = new Promise((resolve) => setTimeout(resolve, 150));
    const onDone = jest.fn(() => {});

    render((
        <WaitForReactWithDefaults
            promise={ promise }
            onDone={ onDone } />
    ));

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(onDone).toHaveBeenCalledTimes(0);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith();
});

it('should call onDone with the error when promise rejects', async () => {
    const error = new Error('foo');
    const promise = new Promise((resolve, reject) => setTimeout(() => reject(error), 150));
    const onDone = jest.fn(() => {});

    render((
        <WaitForReactWithDefaults
            promise={ promise }
            onDone={ onDone } />
    ));

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(onDone).toHaveBeenCalledTimes(0);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith(error);
});

it('should report "fake" progress when promise does not have onProgress', async () => {
    const children = jest.fn(defaultChildren);
    const promise = new Promise((resolve) => setTimeout(resolve, 1000));

    render((
        <WaitForReactWithDefaults promise={ promise }>
            { children }
        </WaitForReactWithDefaults>
    ));

    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(didReportProgress(children)).toBe(true);
});

it('should report promise progress when promise does have onProgress', async () => {
    const children = jest.fn(defaultChildren);
    const promise = new PProgress((resolve, reject, progress) => {
        setTimeout(() => progress(0.5), 100);
        setTimeout(() => progress(0.8), 300);
        setTimeout(resolve, 500);
    });

    render((
        <WaitForReactWithDefaults promise={ promise }>
            { children }
        </WaitForReactWithDefaults>
    ));

    await new Promise((resolve) => setTimeout(resolve, 450));

    expect(children).toHaveBeenCalledWith({ progress: 0.5, error: undefined });
    expect(children).toHaveBeenCalledWith({ progress: 0.8, error: undefined });
});

it('should ignore progress report if promise fulfills', async () => {
    const children = jest.fn(defaultChildren);
    const promise = Promise.resolve();

    promise.onProgress = (fn) => {
        setTimeout(() => fn(0.5), 100);
        setTimeout(() => fn(0.6), 300);
    };

    render((
        <WaitForReactWithDefaults promise={ promise }>
            { children }
        </WaitForReactWithDefaults>
    ));

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(children).toHaveBeenCalledTimes(2);
    expect(children).toHaveBeenCalledWith({ progress: 0, error: undefined });
    expect(children).toHaveBeenCalledWith({ progress: 1, error: undefined });
});

it('should truncate progress between 0 and 0.99', async () => {
    const children = jest.fn(defaultChildren);
    const promise = new Promise(() => {});

    promise.onProgress = (fn) => {
        setTimeout(() => fn(-0.5), 100);
        setTimeout(() => fn(1.5), 250);
        setTimeout(() => fn(1), 400);
    };

    render((
        <WaitForReactWithDefaults promise={ promise }>
            { children }
        </WaitForReactWithDefaults>
    ));

    await new Promise((resolve) => setTimeout(resolve, 550));

    const calledLowerThanZero = children.mock.calls.some((call) => call[0].progress < 0);
    const calledHigherThanOrEqualToOne = children.mock.calls.some((call) => call[0].progress >= 1);

    expect(calledLowerThanZero).toBe(false);
    expect(calledHigherThanOrEqualToOne).toBe(false);
    expect(children).toHaveBeenCalledWith({ progress: 0.99, error: undefined });
});

describe('props change', () => {
    it('should allow changing progressInterval', async () => {
        const children = jest.fn(defaultChildren);
        const promise = new Promise(() => {});

        const { rerender } = render((
            <WaitForReactWithDefaults promise={ promise }>
                { children }
            </WaitForReactWithDefaults>
        ));

        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(didReportProgress(children)).toBe(true);

        rerender((
            <WaitForReactWithDefaults
                progressInterval={ 700 }
                promise={ promise }>
                { children }
            </WaitForReactWithDefaults>
        ));

        children.mockReset();

        await new Promise((resolve) => setTimeout(resolve, 600));

        expect(didReportProgress(children)).toBe(false);

        await new Promise((resolve) => setTimeout(resolve, 750));

        expect(didReportProgress(children)).toBe(true);
    });

    it('should allow changing progressDecay', async () => {
        const children = jest.fn(defaultChildren);
        const promise = new Promise(() => {});

        const { rerender } = render((
            <WaitForReactWithDefaults
                progressDecay="() => 0.2"
                promise={ promise }>
                { children }
            </WaitForReactWithDefaults>
        ));

        children.mockReset();

        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(children).toHaveBeenCalledTimes(1);
        expect(children).toHaveBeenCalledWith({ progress: 0.2, error: undefined });

        rerender((
            <WaitForReactWithDefaults
                progressDecay="() => 0.9"
                promise={ promise }>
                { children }
            </WaitForReactWithDefaults>
        ));

        await new Promise((resolve) => setTimeout(resolve, 250));

        expect(children).toHaveBeenCalledWith({ progress: 0.9, error: undefined });
    });

    it('should allow changing promise', async () => {
        const children = jest.fn(defaultChildren);

        const { rerender } = render((
            <WaitForReactWithDefaults promise={ Promise.resolve() }>
                { children }
            </WaitForReactWithDefaults>
        ));

        await new Promise((resolve) => setTimeout(resolve, 150));

        rerender((
            <WaitForReactWithDefaults promise={ Promise.resolve() }>
                { children }
            </WaitForReactWithDefaults>
        ));

        await new Promise((resolve) => setTimeout(resolve, 150));

        rerender((
            <WaitForReactWithDefaults>
                { children }
            </WaitForReactWithDefaults>
        ));

        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(children).toHaveBeenCalledTimes(5);
        expect(children).toHaveBeenNthCalledWith(1, { progress: 0, error: undefined });
        expect(children).toHaveBeenNthCalledWith(2, { progress: 1, error: undefined });
        expect(children).toHaveBeenNthCalledWith(3, { progress: 0, error: undefined });
        expect(children).toHaveBeenNthCalledWith(4, { progress: 1, error: undefined });
        expect(children).toHaveBeenNthCalledWith(5, { progress: 1, error: undefined });
    });
});

describe('SSR', () => {
    let windowSpy;

    beforeEach(() => {
        windowSpy = jest.spyOn(global, 'window', 'get');
    });

    afterEach(() => {
        windowSpy.mockRestore();
        delete window.__REACT_WAIT_FOR_REACT__;
    });

    it('should render inline script in SSR with the correct data attributes', () => {
        windowSpy.mockImplementation(() => undefined);

        const html = renderToString((
            <WaitForReactWithDefaults
                maxProgressBeforeInteractive={ 0.2 }
                applyProgressBeforeInteractive="() => 1"
                progressDecay="() => 2"
                progressInterval={ 1000 } />
        ));

        expect(html).toContain('<script');
        expect(html).toContain(' data-max-progress="0.2"');
        expect(html).toContain(' data-apply-progress="() =&gt; 1"');
        expect(html).toContain(' data-progress-decay="() =&gt; 2"');
        expect(html).toContain(' data-progress-interval="1000"');
    });

    it('should render inline script only when resuming', async () => {
        window.__REACT_WAIT_FOR_REACT__ = [{
            progress: 0.22,
            intervalId: undefined,
        }];

        const { container, rerender } = render(<WaitForReactWithDefaults />);

        expect(container.querySelector('script')).toBeInstanceOf(HTMLElement);

        rerender(<WaitForReactWithDefaults promise={ Promise.resolve() } />);

        expect(container.querySelector('script')).toBe(null);
    });

    it('should resume progress correctly', () => {
        window.__REACT_WAIT_FOR_REACT__ = [{
            progress: 0.22,
            intervalId: undefined,
        }];

        const children = jest.fn(defaultChildren);

        render((
            <WaitForReactWithDefaults>
                { children }
            </WaitForReactWithDefaults>
        ));

        expect(children).toHaveBeenCalledTimes(1);
        expect(children).toHaveBeenCalledWith({ progress: 0.22, error: undefined });
    });

    it('should normalize progress only when resuming', async () => {
        window.__REACT_WAIT_FOR_REACT__ = [{
            progress: 0.2,
            intervalId: undefined,
        }];

        const children = jest.fn(defaultChildren);
        let promise = new PProgress((resolve, reject, progress) => {
            setTimeout(() => progress(0.1), 100);
        });

        render((
            <WaitForReactWithDefaults
                promise={ promise }
                maxProgressBeforeInteractive={ 0.5 }>
                { children }
            </WaitForReactWithDefaults>
        ));

        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(children).toHaveBeenCalledTimes(2);
        expect(children).toHaveBeenNthCalledWith(1, { progress: 0.2, error: undefined });
        expect(children).toHaveBeenNthCalledWith(2, { progress: 0.55, error: undefined });

        children.mockReset();

        promise = new PProgress((resolve, reject, progress) => {
            setTimeout(() => progress(0.1), 100);
        });

        render((
            <WaitForReactWithDefaults
                promise={ promise }
                maxProgressBeforeInteractive={ 0.5 }>
                { children }
            </WaitForReactWithDefaults>
        ));

        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(children).toHaveBeenCalledTimes(2);
        expect(children).toHaveBeenNthCalledWith(1, { progress: 0, error: undefined });
        expect(children).toHaveBeenNthCalledWith(2, { progress: 0.1, error: undefined });
    });
});
