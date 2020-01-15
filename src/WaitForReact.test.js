/* eslint-disable react/jsx-no-bind, react/prop-types */

import React from 'react';
import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import PProgress from 'p-progress';
import WaitForReact from './WaitForReact';

const defaultChildren = jest.fn(({ progress }) => (
    <div style={ { transform: `scaleX(${progress})` } } />
));

const Tree = (props = {}) => (
    <WaitForReact { ...props }>
        { props.children || defaultChildren }
    </WaitForReact>
);

beforeAll(() => {
    jest.spyOn(Math, 'random').mockImplementation(() => 0.5);
});

beforeEach(() => {
    jest.clearAllMocks();
});

it('should call children function correctly', async () => {
    render(<Tree maxProgressBeforeInteractive={ 0.2 } />);

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(defaultChildren).toHaveBeenCalledTimes(2);
    expect(defaultChildren).toHaveBeenCalledWith({ progress: 0, error: undefined });
    expect(defaultChildren).toHaveBeenCalledWith({ progress: 0.2, error: undefined });
});

it('should render correctly', async () => {
    const { container } = render(<Tree maxProgressBeforeInteractive={ 0.2 } />);

    const div = container.querySelector('div');

    expect(div).toBeDefined();
    expect(div.style.transform).toBe('scaleX(0)');

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(div.style.transform).toBe('scaleX(0.2)');
});

it('should set progress to 1 and call onDone immediately when there is no promise', async () => {
    const onDone = jest.fn(() => {});

    render(<Tree onDone={ onDone } />);

    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(defaultChildren).toHaveBeenCalledWith({ progress: 1, error: undefined });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith();
});

it('should set progress to 1 and call onDone when promise fulfills', async () => {
    const promise = new Promise((resolve) => setTimeout(resolve, 150));
    const onDone = jest.fn(() => {});

    render(<Tree promise={ promise } onDone={ onDone } />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(defaultChildren).not.toHaveBeenCalledWith({ progress: 1, error: undefined });
    expect(onDone).toHaveBeenCalledTimes(0);

    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(defaultChildren).toHaveBeenCalledWith({ progress: 1, error: undefined });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith();
});

it('should call onDone with the error when promise rejects', async () => {
    const error = new Error('foo');
    const promise = new Promise((resolve, reject) => setTimeout(() => reject(error), 150));
    const onDone = jest.fn(() => {});

    render(<Tree promise={ promise } onDone={ onDone } />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onDone).toHaveBeenCalledTimes(0);

    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith(error);
    expect(defaultChildren).toHaveBeenCalled();

    const called = defaultChildren.mock.calls.some((call) => call[0].error === error);

    expect(called).toBe(true);
});

it('should report "fake" progress when promise does not have onProgress', async () => {
    render((
        <Tree
            maxProgressBeforeInteractive={ 0.2 }
            promise={ new Promise((resolve) => setTimeout(resolve, 1000)) } />
    ));

    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(defaultChildren).toHaveBeenCalled();

    const called = defaultChildren.mock.calls.some((call) => call[0].progress > 0.2 && call[0].progress < 1);

    expect(called).toBe(true);
});

it('should report promise progress when promise does have onProgress', async () => {
    const promise = new PProgress((resolve, reject, progress) => {
        setTimeout(() => progress(0.5), 100);
        setTimeout(() => progress(0.8), 300);
        setTimeout(resolve, 500);
    });

    render((
        <Tree
            maxProgressBeforeInteractive={ 0.2 }
            promise={ promise } />
    ));

    await new Promise((resolve) => setTimeout(resolve, 450));

    expect(defaultChildren).toHaveBeenCalledWith({ progress: 0.6, error: undefined });
    expect(defaultChildren).toHaveBeenCalledWith({ progress: 0.84, error: undefined });
});

it('should ignore progress report if promise fulfills', async () => {
    const promise = Promise.resolve();

    promise.onProgress = (fn) => {
        setTimeout(() => fn(0.5), 100);
        setTimeout(() => fn(0.6), 300);
    };

    render((
        <Tree
            maxProgressBeforeInteractive={ 0.2 }
            promise={ promise } />
    ));

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(defaultChildren).not.toHaveBeenCalledWith({ progress: 0.6, error: undefined });
    expect(defaultChildren.mock.calls[defaultChildren.mock.calls.length - 1][0]).toEqual({ progress: 1, error: undefined });
});

it('should truncate progress between 0 and 0.99', async () => {
    const promise = new Promise(() => {});

    promise.onProgress = (fn) => {
        setTimeout(() => fn(-0.5), 100);
        setTimeout(() => fn(1.5), 250);
        setTimeout(() => fn(1), 400);
    };

    render((
        <Tree
            maxProgressBeforeInteractive={ 0.2 }
            promise={ promise } />
    ));

    await new Promise((resolve) => setTimeout(resolve, 550));

    const calledLowerThanZero = defaultChildren.mock.calls.some((call) => call[0].progress < 0);
    const calledHigherThanOrEqualToOne = defaultChildren.mock.calls.some((call) => call[0].progress >= 1);

    expect(calledLowerThanZero).toBe(false);
    expect(calledHigherThanOrEqualToOne).toBe(false);
    expect(defaultChildren).toHaveBeenCalledWith({ progress: 0.95, error: undefined });
});

describe('props change', () => {
    it('should allow changing progressInterval', async () => {
        const promise = new Promise(() => {});
        const { rerender } = render((
            <Tree
                maxProgressBeforeInteractive={ 0.2 }
                progressInterval={ 50 }
                promise={ promise } />
        ));

        rerender((
            <Tree
                maxProgressBeforeInteractive={ 0.2 }
                progressInterval={ 700 }
                promise={ promise } />
        ));

        await new Promise((resolve) => setTimeout(resolve, 600));

        expect(defaultChildren).toHaveBeenCalled();

        const called = defaultChildren.mock.calls.some((call) => call[0].progress > 0.2 && call[0].progress < 1);

        expect(called).toBe(false);
    });

    it('should allow changing progressDecay', async () => {
        const promise = new Promise(() => {});
        const { rerender } = render((
            <Tree
                maxProgressBeforeInteractive={ 0.2 }
                promise={ promise } />
        ));

        await new Promise((resolve) => setTimeout(resolve, 50));

        rerender((
            <Tree
                maxProgressBeforeInteractive={ 0.2 }
                progressDecay={ () => 0.9 }
                promise={ promise } />
        ));

        await new Promise((resolve) => setTimeout(resolve, 200));

        expect(defaultChildren).toHaveBeenCalled();

        const called = defaultChildren.mock.calls.some((call) => call[0].progress > 0.9 && call[0].progress < 1);

        expect(called).toBe(true);
    });

    it('should allow changing promise', async () => {
        const { rerender } = render(<Tree promise={ new Promise(() => {}) } />);

        await new Promise((resolve) => setTimeout(resolve, 250));

        rerender(<Tree promise={ Promise.resolve() } />);

        await new Promise((resolve) => setTimeout(resolve, 250));

        expect(defaultChildren).toHaveBeenCalled();
        expect(defaultChildren.mock.calls.length).toBeGreaterThanOrEqual(3);
        expect(defaultChildren.mock.calls[defaultChildren.mock.calls.length - 1][0]).toEqual({ progress: 1, error: undefined });
    });
});

describe('SSR', () => {
    let windowSpy;

    beforeEach(() => {
        windowSpy = jest.spyOn(global, 'window', 'get');
    });

    afterEach(() => {
        windowSpy.mockRestore();
        delete window.__WAIT_FOR_IT__;
    });

    it('should render inline script in SSR with the correct data attributes', () => {
        windowSpy.mockImplementation(() => undefined);

        const html = renderToString((
            <Tree
                maxProgressBeforeInteractive={ 0.2 }
                applyProgressBeforeInteractive={ () => 1 }
                progressDecay={ () => 2 }
                progressInterval={ 1000 } />
        ));

        expect(html).toContain('<script');
        expect(html).toContain(' data-max-progress="0.2"');
        expect(html).toContain(' data-apply-progress="(() =&gt; 1)(elements, progress)"');
        expect(html).toContain(' data-progress-decay="return (() =&gt; 2)(time)"');
        expect(html).toContain(' data-progress-interval="1000"');
    });

    it('should not render inline script if before interactive related props are "disabled"', () => {
        windowSpy.mockImplementation(() => undefined);

        let html;

        html = renderToString(<Tree />);

        expect(html).not.toContain('<script');

        html = renderToString(<Tree maxProgressBeforeInteractive={ 0 } />);

        expect(html).not.toContain('<script');
    });

    it('should not render inline script when mounted', async () => {
        const { container } = render(<Tree applyProgressBeforeInteractive={ () => {} } />);

        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(container.querySelector('script')).toBe(null);
    });

    it('should resume progress correctly', () => {
        window.__WAIT_FOR_IT__ = {
            progress: 0.22,
        };

        render(<Tree />);

        expect(defaultChildren.mock.calls.length).toBeGreaterThanOrEqual(1);
        expect(defaultChildren.mock.calls[0][0]).toEqual({ progress: 0.22, error: undefined });
    });
});
