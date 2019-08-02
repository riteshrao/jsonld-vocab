import Instance from './instance';

export namespace InstanceProxy {
    /**
     * @description Creates a new instance proxy.
     * @export
     * @template T
     * @param {Instance} instance THe instance to proxify.
     * @returns {(T)}
     */
    export function proxify<T = void>(instance: Instance): Instance & T {
        Object.defineProperties(instance, {
            '@id': {
                get: () => {
                    return instance.id;
                }
            },
            '@type': {
                get: () => {
                    return [...instance.classes.map(x => x.id)];
                }
            }
        });

        const proxy = new Proxy<Instance>(instance, {
            get: (target, propName: string) => {
                const term = target.vocabulary.context.getTerm(propName);
                if (term && target.hasProperty(term.id)) {
                    return target.getProperty(term.id).value;
                } else {
                    return Reflect.get(target, propName);
                }
            },
            set: (target, propName: string, value) => {
                const term = target.vocabulary.context.getTerm(propName);
                if (term && target.hasProperty(term.id)) {
                    target.getProperty(term.id).value = value;
                    return true;
                } else {
                    return Reflect.set(target, propName, value);
                }
            }
        });

        return proxy as Instance & T;
    }
}

export default InstanceProxy;
