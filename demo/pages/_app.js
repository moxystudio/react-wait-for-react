import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import AppPreloader from 'react-app-preloader';
import './_app.css';

const applyProgressBeforeInteractive = "function (elements, progress) { elements.progressBar.style = 'transform:scaleX(' + progress + ')' }";

const promise = new Promise((resolve) => setTimeout(resolve, 5000));

const MyApp = ({ Component, pageProps }) => {
    const [loaded, setLoaded] = useState(false);
    const onLoad = useCallback(() => setLoaded(true), []);

    return (
        <>
            { !loaded && (
                <AppPreloader
                    applyProgressBeforeInteractive={ applyProgressBeforeInteractive }
                    promise={ promise }
                    onLoad={ onLoad }
                    progressInterval={ 200 }>
                    { ({ progress }) => (
                        <div
                            data-wait-for-element-name="progressBar"
                            className="progress-bar"
                            style={ { transform: `scaleX(${progress})` } }
                            suppressHydrationWarning />
                    ) }
                </AppPreloader>
            ) }

            { loaded && <Component { ...pageProps } /> }
        </>
    );
};

MyApp.propTypes = {
    Component: PropTypes.func.isRequired,
    pageProps: PropTypes.object,
};

export default MyApp;
