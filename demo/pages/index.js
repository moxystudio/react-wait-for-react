import React, { useState, useCallback } from 'react';
import classNames from 'classNames';
import WaitForReact from '@moxy/react-wait-for-react';
import styles from './index.module.css';

const applyProgressBeforeInteractive = "function (elements, progress) { elements.progressBar.style = 'transform:scaleX(' + progress + ')' }";

const promise = new Promise((resolve) => setTimeout(resolve, 5000));

const Home = () => {
    const [loaded, setLoaded] = useState(false);
    const onDone = useCallback((err) => setLoaded(!err), []);

    return (
        <>
            <WaitForReact
                applyProgressBeforeInteractive={ applyProgressBeforeInteractive }
                promise={ promise }
                onDone={ onDone }
                progressInterval={ 200 }>
                { ({ progress }) => (
                    <div
                        data-wait-for-react-element="progressBar"
                        className={ classNames(styles.progressBar, loaded && styles.loaded) }
                        style={ { transform: `scaleX(${progress})` } } />
                ) }
            </WaitForReact>

            <p>The progress-bar will finish after 5 seconds.</p>
            <p>You may simulate a slower network in your browser&apos;s DevTool to increase TTI (time to interactive)</p>

            { loaded && <div>Load completed!</div> }
        </>
    );
};

export default Home;
