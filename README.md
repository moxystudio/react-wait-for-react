# react-wait-for-react

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][build-status-image]][build-status-url] [![Coverage Status][codecov-image]][codecov-url] [![Dependency status][david-dm-image]][david-dm-url] [![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url]

[npm-url]:https://npmjs.org/package/@moxy/react-wait-for-react
[downloads-image]:https://img.shields.io/npm/dm/@moxy/react-wait-for-react.svg
[npm-image]:https://img.shields.io/npm/v/@moxy/react-wait-for-react.svg
[build-status-url]:https://github.com/moxystudio/next-with-moxy/actions
[build-status-image]:https://img.shields.io/github/workflow/status/moxystudio/next-with-moxy/Node%20CI/master
[codecov-url]:https://codecov.io/gh/moxystudio/react-wait-for-react
[codecov-image]:https://img.shields.io/codecov/c/github/moxystudio/react-wait-for-react/master.svg
[david-dm-url]:https://david-dm.org/moxystudio/react-wait-for-react
[david-dm-image]:https://img.shields.io/david/moxystudio/react-wait-for-react.svg
[david-dm-dev-url]:https://david-dm.org/moxystudio/react-wait-for-react?type=dev
[david-dm-dev-image]:https://img.shields.io/david/dev/moxystudio/react-wait-for-react.svg

Easily render a loader while your React app is loading, optionally waiting for a promise as well.

## Installation

```sh
$ npm install @moxy/react-wait-for-react
```

This library is written in modern JavaScript and is published in both CommonJS and ES module transpiled variants. If you target older browsers please make sure to transpile accordingly.

## Motivation

Certain apps or pages have impactful experiences. These experiences can make the total bundle size larger as they pack possibly large dependencies and media assets, such as 3D objects and audio files.

It's then often normal to preload all the required files for an uninterrupted experience. `@moxy/wait-for-react` is a library that makes it easy to display a loader before your static or server-side rendered app becomes interactive, and optionally until all the required files are loaded (via a promise).

<img src="https://developers.google.com/web/fundamentals/performance/images/perf-metrics-load-timeline.png" alt="Performance metrics timeline" width="700" />

⚠️ You should still render the app or page contents "below" the loader, to keep your website SEO friendly.

## Demo

You may see a simple demo of `react-wait-for-react` in [https://moxystudio.github.io/react-wait-for-react](https://moxystudio.github.io/react-wait-for-react/).

## Usage

Using `<WaitForReact>` to render a progress bar while your page assets are being loaded:

```js
import React from 'react';
import classNames from 'classnames';
import WaitForReact from '@moxy/react-wait-for-react';
import styles from './MyPage.module.css';

const preloadAssets = async () => {
    // Preload files, like a mp3, 3d objects, etc..
};

const MyPage = () => {
    const promise = useMemo(() => preloadAssets(), []);
    const applyProgressBeforeInteractive = useCallback((elements, progress) =>
        elements.progressBar.style.transform = `scaleX(${progress})`);

    return (
        <main>
            <WaitForReact
                applyProgressBeforeInteractive={ applyProgressBeforeInteractive }
                promise={ promise }>
                { ({ progress }) => (
                    <div
                        data-wait-for-react-element="progressBar"
                        className={ classNames(styles.progressBar, progress > 1 && styles.done) }
                        style={ { transform: `scaleX(${progress})` } } />
                ) }
            </WaitForReact>
            <div>My Awesome Page</div>
        </main>
    );
};

export default MyPage;
```

## API

This package exports a single component called `<WaitForReact>`, with the following props:

### maxProgressBeforeInteractive

Type: `number`   
Default: `0.4`

The maximum value the progress can take before the app becomes interactive. Takes a value between 0 and 1 (exclusive).

### applyProgressBeforeInteractive

Type: `string` (*required*)

A function in it's string form to update elements whenever `progress` changes.

`<WaitForReact>` will call `applyProgressBeforeInteractive` **only** before your app becomes interactive. When your app becomes interactive, React takes over and your `children` render prop will then be called as usual. To make this possible, `applyProgressBeforeInteractive` will be added in an inline script included as part SSR or static export.

⚠️ The reason for this prop to be a string instead of a function has to do with compilation. Because server-side compilation usually differ from client-side compilation, the actual function in it's string form would be different and React would complain with a mismatch warning when rehydrating. Having that said, you should be careful in how you write this function so that it's compatible with all your target environments.

The `applyProgressBeforeInteractive` function signature is `(elements, progress) => {}`, where `elements` are DOM nodes that were tagged with `data-wait-for-react-element` attributes. Here's an example where we tag two different elements:

```js
const applyProgressBeforeInteractive = (elements, progress) => {
    // elements.foo
    // elements.bar
};

const MyPage = () => (
    <WaitForReact
        applyProgressBeforeInteractive={ applyProgressBeforeInteractive }
        promise={ promise }>
        { ({ progress }) => (
            <div className={ classNames(styles.progressBarWrapper, progress > 1 && styles.done) }>
                <div
                    data-wait-for-react-element="foo"
                    className={ styles.progressBarHorizontal }
                    style={ { transform: `scaleX(${progress})` } } />
                <div
                    data-wait-for-react-element="bar"
                    className={ styles.progressBarVertical }
                    style={ { transform: `scaleY(${progress})` } } />
            </div>
        ) }
    </WaitForReact>
);
```

### progressDecay

Type: `string`   
Default: `function (time) { return 1 - Math.exp(-1 * time / 4000); }`

A function in it's string form to calculate the progress value based on the elapsed time. Typically, the algorithm has a decay pattern, where increments are smaller and smaller as time passes by.

`<WaitForReact>` will call `progressDecay` to simulate a "fake progress" until your app becomes interactive. To make this possible, `progressDecay` will be added in an inline script included as part SSR or static export. Similarly, `<WaitForReact>` will call `progressDecay` to simulate a "fake progress" if a standard promise is passed as the `promise` prop.

⚠️ The reason for this prop to be a string instead of a function has to do with compilation. Because server-side compilation usually differ from client-side compilation, the actual function in it's string form would be different and React would complain with a mismatch warning when rehydrating. Having that said, you should be careful in how you write this function so that it's compatible with all your target environments.

The `progressDecay` function signature is `(time) => <progress>`, where `time` is the elapsed time in milliseconds. It must return the `progress` value in the form of a number between 0 and 1 (exclusive).

### progressInterval

Type: `number`   
Default: 100

The interval, in ms, to report progress. The value of `progressInterval` will effectively throttle all the internal behavior of `<WaitForReact>`, including the frequency in which the `children` render prop will be called.

ℹ️ If you are using CSS transitions, the transition durations should be equal or smaller than `progressInterval`. This circumvents an issue in Chrome, Safari and other WebKit/Blink based browsers where updating a CSS property in the middle of a transition will cause the animation to "restart".

### promise

Type: `Promise` or `PPromise`

A promise to wait for, after the app becomes interactive.

When a standard `Promise` is given, `<WaitForReact>` will initiate a "fake progress" until the promise settles. However, you may pass a [`PPromise`](https://github.com/sindresorhus/p-progress). In this case, the progress reported by the promise will be used instead of the "fake progress".

### children

Type: `Function`

A [render prop](https://reactjs.org/docs/render-props.html) function that renders children based on the `progress` or `error` (if any).

The `children` function signature is `({ progress, error }) => <node>`, where `progress` the current progress percentage and `error` is the promise rejection value in case a `promise` was passed and it was rejected.

ℹ️ The `progress` value is guaranteed to always between 0 and 0.95.

### onDone

Type: `Function`

A function called when the waiting process is done, that is, when your app becomes interactive or when the promise settles, if one was passed.

The `onDone` function signature is `(err) => {}`, where `error` is the error of the rejected promise, if any.

## Tests

```sh
$ npm test
$ npm test -- --watch # during development
```

## License

Released under the [MIT License](https://www.opensource.org/licenses/mit-license.php).
