import React from 'react';
import classNames from 'classnames';
import WaitForReact from '@moxy/react-wait-for-react';
import styles from './index.module.css';

const applyProgressBeforeInteractive = `function (elements, progress) {
    elements.progressBar.style = 'transform:scaleX(' + progress + ')';
}`;

const promise = new Promise((resolve) => setTimeout(resolve, 5000));

const Home = () => (
    <main>
        <WaitForReact
            applyProgressBeforeInteractive={ applyProgressBeforeInteractive }
            promise={ promise }
            progressInterval={ 200 }>
            { ({ progress }) => (
                <div className={ classNames(styles.splashScreen, { [styles.loaded]: progress >= 1 }) }>
                    <div
                        data-wait-for-react-element="progressBar"
                        className={ styles.progressBar }
                        style={ { transform: `scaleX(${progress})` } } />

                    <div className={ styles.content }>Welcome</div>
                </div>
            ) }
        </WaitForReact>

        <p>The progress-bar finished after 5 seconds, as we passed a fake promise that fulfilled after that duration.</p>
        <p>You may simulate a slower network in your browser&apos;s DevTool to increase TTI (time to interactive).</p>
    </main>
);

export default Home;
