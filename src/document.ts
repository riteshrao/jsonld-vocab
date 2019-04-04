import Iterable from 'jsiterable';
import JsonldGraph, { Vertex } from 'jsonld-graph';
import JsonFormatOptions from 'jsonld-graph/lib/formatOptions';

import Errors from './errors';
import Id from './id';
import Instance from './instance';
import InstanceProxy from './instanceProxy';
import Vocabulary from './vocabulary';
import { ClassReference, InstanceReference } from './types';

/**
 *  Normalizer function used to normalize instances in a document.
 */
export type InstanceNormalizer = (instance: Instance, vocabulary: Vocabulary) => void;

/**
 *  Options used by a Document.
 */
export type DocumentOptions = {
    blankIdNormalizer?: InstanceNormalizer;
    blankTypeNormalizer?: InstanceNormalizer
};

/**
 * @description A document based on a vocabulary.
 * @export
 * @class Document
 */
export class Document {
    private readonly graph: JsonldGraph;

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

        this.graph = new JsonldGraph();
        this.graph.addPrefix('vocab', vocabulary.baseIri);
        for (const [uri, context] of this.vocabulary.context.definitions) {
            this.graph.addContext(uri, context);
        }
    }

    /**
     * @description Gets all instances in the document.
     * @readonly
     * @type {Iterable<Instance>}
     * @memberof Document
     */
    get instances(): Iterable<Instance> {
        return this.graph
            .getVertices()
            .map(vertex => InstanceProxy.proxify(new Instance(vertex, this.vocabulary)));
    }

    /**
     * @description Creates a new instance of a class.
     * @template T
     * @param {ClassReference} classReference The id or class instance for which the instance should be created.
     * @param {string} id The id of the instance to create.
     * @returns {(T)}
     * @memberof Document
     */
    createInstance<T = any>(classReference: ClassReference, id: string): T & Instance {
        if (!classReference) {
            throw new ReferenceError(`Invalid classReference. classReference is '${classReference}'`);
        }

        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        if (this.vocabulary.hasResource(id)) {
            throw new Errors.InvalidInstanceIdError(id, 'A class or resource with the specified id already exists.');
        }

        if (this.graph.hasVertex(id)) {
            throw new Errors.DuplicateInstanceError(id);
        }

        if (this.vocabulary.hasInstance(id)) {
            throw new Errors.InvalidInstanceIdError(id, 'Another instance with the id has already been defined in the vocabulary');
        }

        const classType = typeof classReference === 'string' ? this.vocabulary.getClass(classReference) : classReference;
        if (!classType) {
            throw new Errors.ResourceNotFoundError(classReference as string, 'Class');
        }

        const instance = new Instance(this.graph.createVertex(id), this.vocabulary);
        instance.setClass(classType);
        return InstanceProxy.proxify<T>(instance);
    }

    /**
     * @description Gets an instance.
     * @template T
     * @param {string} id The id of the instance to get.
     * @returns {(T)}
     * @memberof Document
     */
    getInstance<T = any>(id: string): T & Instance {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        if (this.vocabulary.hasResource(id) || this.vocabulary.hasInstance(id)) {
            throw new Errors.InstanceNotFoundError(id);
        }

        const instanceV = this.graph.getVertex(id);
        if (!instanceV || instanceV.types.count() === 0) {
           return null;
        }

        const instance = new Instance(instanceV, this.vocabulary);
        return InstanceProxy.proxify<T>(instance);
    }

    /**
     * @description Gets all instances of a specific class.
     * @template T
     * @param {ClassReference} classReference The id or class reference to get instances of.
     * @param {boolean} [descendants=false] True to include all instances that are descendants of the specified class, else false. Default is false.
     * @returns {(Iterable<T>)}
     * @memberof Document
     */
    getInstancesOf<T = any>(classReference: ClassReference, descendants: boolean = false): Iterable<T & Instance> {
        if (!classReference) {
            throw new ReferenceError(`Invalid classReference. classReference is '${classReference}`);
        }

        const classType = typeof classReference === 'string' ? this.vocabulary.getClass(classReference) : classReference;
        if (!classType) {
            throw new Errors.ResourceNotFoundError(classReference as string, 'Class');
        }

        const classV = this.graph.getVertex(Id.expand(classType.id));
        if (!descendants) {
            return classV
                .instances
                .map(vertex => InstanceProxy.proxify<T>(new Instance(vertex, this.vocabulary)));
        } else {
            const _that = this;
            return new Iterable((function* getDescendantInstances() {
                const tracker = new Set<string>();
                if (classV) {
                    // First the class instances and yield those results.
                    for (const instanceV of classV.instances) {
                        if (!tracker.has(instanceV.id)) {
                            tracker.add(instanceV.id);
                            yield InstanceProxy.proxify<T>(new Instance(instanceV, _that.vocabulary));
                        }
                    }
                }

                for (const descendantTypes of classType.descendants) {
                    const descendantV = _that.graph.getVertex(Id.expand(descendantTypes.id));
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

        return this.graph.hasVertex(id);
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

        for (const vertex of this.graph.getVertices(({ id }) => !this.vocabulary.hasResource(id))) {
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

        await this.graph.load(input, contexts);
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

        const instanceId = typeof instanceReference === 'string' ? instanceReference : instanceReference.id;
        if (!recursive) {
            this.graph.removeVertex(instanceId);
        } else {
            const instance = this.graph.getVertex(instanceId);
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
        return this.graph.toJson(options);
    }

    private _removeInstanceRecursive(instance: Vertex, tracker: Set<string> = new Set<string>()): void {
        if (tracker.has(instance.id)) {
            return;
        }

        tracker.add(instance.id);
        for (const outgoing of instance.getOutgoing().items()) {
            outgoing.toVertex.removeIncoming(outgoing.label, instance.id);
            if (outgoing.toVertex.getIncoming().count() === 0) {
                this._removeInstanceRecursive(outgoing.toVertex);
            }
        }

        this.graph.removeVertex(instance);
    }
}

export default Document;