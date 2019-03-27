import JsonldGraph from 'jsonld-graph';
import Iterable from 'jsiterable';

import { ValueType } from './context';
import Errors from './errors';
import Id from './id';
import Instance from './instance';
import InstanceProxy from './instanceProxy';
import Vocabulary from './vocabulary';
import { ClassReference, InstanceReference } from './types';
import JsonFormatOptions from 'jsonld-graph/lib/formatOptions';

export type InstanceNormalizer = (instance: Instance, vocabulary: Vocabulary) => void;

export type DocumentOptions = {
    blankIdNormalizer?: InstanceNormalizer;
    blankTypeNormalizer?: InstanceNormalizer
};

export class Document {
    private readonly _graph: JsonldGraph;

    /**
     * Creates an instance of Document.
     * @param {Vocabulary} vocabulary The vocabulary used by the document for creating and working with instances.
     * @memberof Document
     */
    constructor(
        public readonly vocabulary: Vocabulary,
        private readonly options: DocumentOptions = {}) {
        if (!vocabulary) {
            throw new ReferenceError(`Invalid vocabulary. vocabulary is '${vocabulary}'`);
        }

        this._graph = new JsonldGraph();
        this._graph.addPrefix('vocab', vocabulary.baseIri);
        for (const [uri, context] of this.vocabulary.context.definitions) {
            this._graph.addContext(uri, context);
        }
    }

    /**
     * @description Gets all instances in the document.
     * @readonly
     * @type {Iterable<Instance>}
     * @memberof Document
     */
    get instances(): Iterable<Instance> {
        return this._graph
            .getVertices(vertex => vertex.types.count() > 0)
            .map(vertex => InstanceProxy.proxify(new Instance(vertex, this.vocabulary)));
    }

    /**
     * @description Creates a new instance of a class.
     * @template T
     * @param {ClassReference} classReference The id or class instance for which the instance should be created.
     * @param {string} id The id of the instance to create.
     * @returns {(Instance & T)}
     * @memberof Document
     */
    createInstance<T = {}>(classReference: ClassReference, id: string): Instance & T {
        if (!classReference) {
            throw new ReferenceError(`Invalid classReference. classReference is '${classReference}'`);
        }

        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        if (this.vocabulary.hasResource(id)) {
            throw new Errors.InvalidInstanceIdError(id, 'A class or resource with the specified id already exists.');
        }

        if (this._graph.hasVertex(id)) {
            throw new Errors.DuplicateInstanceError(id);
        }

        if (this.vocabulary.hasInstance(id)) {
            throw new Errors.InvalidInstanceIdError(id, 'Another instance with the id has already been defined in the vocabulary');
        }

        const classType = typeof classReference === 'string' ? this.vocabulary.getClass(classReference) : classReference;
        if (!classType) {
            throw new Errors.ResourceNotFoundError(classReference as string, 'Class');
        }

        const instance = new Instance(this._graph.createVertex(id), this.vocabulary);
        instance.setClass(classType);
        return InstanceProxy.proxify<T>(instance);
    }

    /**
     * @description Gets an instance.
     * @template T
     * @param {string} id The id of the instance to get.
     * @returns {(Instance & T)}
     * @memberof Document
     */
    getInstance<T = {}>(id: string): Instance & T {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        if (this.vocabulary.hasResource(id) || this.vocabulary.hasInstance(id)) {
            throw new Errors.InstanceNotFoundError(id);
        }

        const instanceV = this._graph.getVertex(id);
        if (!instanceV || instanceV.types.count() === 0) {
            throw new Errors.InstanceNotFoundError(id);
        }

        const instance = new Instance(instanceV, this.vocabulary);
        return InstanceProxy.proxify<T>(instance);
    }

    /**
     * @description Gets all instances of a specific class.
     * @template T
     * @param {ClassReference} classReference The id or class reference to get instances of.
     * @param {boolean} [descendants=false] True to include all instances that are descendants of the specified class, else false. Default is false.
     * @returns {(Iterable<Instance & T>)}
     * @memberof Document
     */
    getInstances<T = {}>(classReference: ClassReference, descendants: boolean = false): Iterable<Instance & T> {
        if (!classReference) {
            throw new ReferenceError(`Invalid classReference. classReference is '${classReference}`);
        }

        const classType = typeof classReference === 'string' ? this.vocabulary.getClass(classReference) : classReference;
        if (!classType) {
            throw new Errors.ResourceNotFoundError(classReference as string, 'Class');
        }

        const classVertex = this._graph.getVertex(Id.expand(classType.id));
        if (!descendants) {
            return classVertex
                .instances
                .map(vertex => InstanceProxy.proxify<T>(new Instance(vertex, this.vocabulary)));
        } else {
            const _that = this;
            return new Iterable((function* getDescendantInstances() {
                const tracker = new Set<string>();
                // First the class instances and yield those results.
                if (classVertex) {
                    for (const instanceV of classVertex.instances) {
                        if (!tracker.has(instanceV.id)) {
                            tracker.add(instanceV.id);
                            yield InstanceProxy.proxify<T>(new Instance(instanceV, _that.vocabulary));
                        }
                    }
                }

                for (const descendantTypes of classType.descendants) {
                    const descendantV = _that._graph.getVertex(Id.expand(descendantTypes.id));
                    if (descendantV) {
                        for (const instanceV of descendantV.instances) {
                            if (!tracker.has(instanceV.id)) {
                                tracker.add(instanceV.id);
                                yield InstanceProxy.proxify<T>(new Instance(instanceV, _that.vocabulary));
                            }
                        }
                    }
                }
            })());
        }
    }

    /**
     * @description Checks if an instance with the specified id exists.
     * @param {string} id The id of the instance to check for.
     * @returns {boolean}
     * @memberof Document
     */
    hasInstance(id: string): boolean {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        if (this.vocabulary.hasResource(id) || this.vocabulary.hasInstance(id)) {
            return false;
        }

        return this._graph.hasVertex(id);
    }

    /**
     * @description Normalizes blank id and blank type normalizer.
     * @param {{ blankIdNormalizer?: InstanceNormalizer, blankTypeNormalizer?: InstanceNormalizer }} options
     * @memberof Document
     */
    normalize() {
        if (!this.options.blankIdNormalizer && !this.options.blankTypeNormalizer) {
            return;
        }

        for (const vertex of this._graph.getVertices(({ id }) => !this.vocabulary.hasResource(id))) {
            if (vertex.types.count() === 0 && this.options.blankTypeNormalizer) {
                this.options.blankTypeNormalizer(new Instance(vertex, this.vocabulary), this.vocabulary);
            }

            if (vertex.isBlankNode && this.options.blankIdNormalizer) {
                this.options.blankIdNormalizer(new Instance(vertex, this.vocabulary), this.vocabulary);
            }
        }
    }

    /**
     * @description Loads an input document.
     * @param {object} input The input to load.
     * @param {string[]} [contexts] Optional contexts to use for parsing the input.
     * @returns {Promise<void>}
     * @memberof Document
     */
    async load(input: object, contexts?: string[]): Promise<void> {
        if (!input) {
            throw new ReferenceError(`Invalid input. input is '${input}'`);
        }

        await this._graph.load(input, contexts);
        this.normalize();
    }

    /**
     * @description Removes an instance from the model.
     * @param {InstanceReference} instanceReference The id of the instance or instance to remove.
     * @param {boolean} recursive True to recursively delete references to other instances owned by this instance.
     * @memberof Document
     */
    removeInstance(instanceReference: InstanceReference, recursive: boolean = false): void {
        if (!instanceReference) {
            throw new ReferenceError(`Invalid instanceReference. instanceReference is '${instanceReference}'`);
        }

        if (!recursive) {
            this._graph.removeVertex(typeof instanceReference === 'string' ? instanceReference : instanceReference.id);
        } else {
            const instance = typeof instanceReference === 'string' ? this.getInstance(instanceReference) : instanceReference;
            if (!instance) {
                return;
            }

            this._removeInstanceRecursive(instance);
        }
    }

    /**
     * @description Gets a JSON representation of the document.
     * @param {JsonFormatOptions} [options] Optional JSON formatting options.
     * @memberof Document
     */
    toJson(options?: JsonFormatOptions) {
        return this._graph.toJson(options);
    }

    private _removeInstanceRecursive(instance: Instance, tracker: Set<string> = new Set<string>()): void {
        if (tracker.has(instance.id)) {
            return;
        }

        tracker.add(instance.id);
        for (const property of instance.properties.filter(x => x.valueType === ValueType.id || x.valueType === ValueType.vocab)) {
            if (property.container) {
                const neighbors: Instance[] = [...property.value];
                property.value.clear();
                for (const neighbor of neighbors) {
                    if (neighbor.referrers.count() === 0) {
                        this._removeInstanceRecursive(neighbor, tracker);
                    }
                }
            } else {
                const neighbor = property.value as Instance;
                property.value = null; // Delete the value first
                if (neighbor && neighbor.referrers.count() === 0) {
                    this._removeInstanceRecursive(neighbor, tracker);
                }
            }
        }

        this._graph.removeVertex(instance.id);
    }
}

export default Document;