import Instance from './instance';

export namespace InstanceProxy {
    /**
     * @description Creates a new instance proxy.
     * @export
     * @template T
     * @param {Instance} instance THe instance to proxify.
     * @returns {(Instance & T)}
     */
    export function proxify<T = {}>(instance: Instance): Instance & T {
        return new Proxy<Instance & T>(instance as Instance & T, {

        });
    }
}

export default InstanceProxy;