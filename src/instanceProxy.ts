import Instance from './instance';
import Errors from './errors';

export namespace InstanceProxy {
    /**
     * @description Creates a new instance proxy.
     * @export
     * @template T
     * @param {Instance} instance THe instance to proxify.
     * @returns {(Instance & T)}
     */
    export function proxify<T = {}>(instance: Instance, useProxy: boolean = false): Instance & T {
        // Utilizing Object.defineProperty instead of proxy due to performance reasons. Need to re-evaluate if Proxy would ever be performant.
        if (useProxy) {
            return new Proxy<Instance & T>(instance as Instance & T, {
                get: (target, propName: string) => {
                    if (typeof propName !== 'string') {
                        return Reflect.get(target, propName);
                    }

                    const term = target.vocabulary.context.getTerm(propName);
                    const property = term ? target.getProperty(term.id) : target.getProperty(propName);
                    if (property) {
                        return property.value;
                    } else {
                        return Reflect.get(target, propName);
                    }
                },
                set: (target, propName, value) => {
                    if (typeof propName !== 'string') {
                        return Reflect.set(target, propName, value);
                    }

                    const term = target.vocabulary.context.getTerm(propName);
                    const property = term ? target.getProperty(term.id) : target.getProperty(propName);
                    if (!property) {
                        throw new Errors.InstancePropertyNotFoundError(target.id, propName);
                    }

                    property.value = value;
                    return true;
                }
            });
        } else {
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
}

export default InstanceProxy;