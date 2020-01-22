import * as exports from './index';

it('should export <WaitForReact> by default', () => {
    expect(typeof exports.default).toBe('function');
});
