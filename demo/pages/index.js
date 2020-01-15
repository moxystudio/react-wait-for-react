import React, { useState, useCallback } from 'react';
import WaitForReact from '@moxy/react-wait-for-react';
import styles from './index.module.css';

const applyProgressBeforeInteractive = "function (elements, progress) { elements.progressBar.style = 'transform:scaleX(' + progress + ')' }";

const promise = new Promise((resolve) => setTimeout(resolve, 5000));

const Home = () => {
    const [loaded, setLoaded] = useState(false);
    const onLoad = useCallback(() => setLoaded(true), []);

    return (
        <>
            { !loaded && (
                <WaitForReact
                    applyProgressBeforeInteractive={ applyProgressBeforeInteractive }
                    promise={ promise }
                    onLoad={ onLoad }
                    progressInterval={ 200 }>
                    { ({ progress }) => (
                        <div
                            data-wait-for-react-element="progressBar"
                            className={ styles['progress-bar'] }
                            style={ { transform: `scaleX(${progress})` } } />
                    ) }
                </WaitForReact>
            ) }
            <p>The progress-bar will finish after 5 seconds.</p>
            { loaded && <div>Load completed!</div> }
        </>
    );
};

export default Home;
