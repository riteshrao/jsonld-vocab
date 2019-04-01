import Instance from './instance';

export namespace InstanceProxy {
    /**
     * @description Creates a new instance proxy.
     * @export
     * @template T
     * @param {Instance} instance THe instance to proxify.
     * @returns {(T)}
     */
    export function proxify<T = {}>(instance: Instance): Instance & T {
        for (const property of instance.properties.filter(x => !!x.term)) {
            Object.defineProperty(instance, property.term, {
                get: () => {
                    return property.value;
                },
                set: (value) => {
                    property.value = value;
                }
            });
        }

        return instance as Instance & T;
    }
}

export default InstanceProxy;