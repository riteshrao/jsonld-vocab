import Iterable from 'jsiterable';
import JsonldGraph, { Vertex } from 'jsonld-graph';
import JsonFormatOptions from 'jsonld-graph/lib/formatOptions';
import * as errors from './errors';
import * as identity from './identity';
import Instance from './instance';
import InstanceProxy from './instanceProxy';
import { ClassReference, InstanceReference, PropertyReference } from './types';
import Vocabulary from './vocabulary';




/**
 *  Options used by a Document.
 */
export interface DocumentOptions {
    blankIdNormalizer?(instance: Instance, document: Document): void;
    blankTypeNormalizer?(instance: Instance, document: Document): void;
    idChangeHandler?(instance: Instance, previousId: string, document: Document): void;
}

/**
 * @description A document based on a vocabulary.
 * @export
 * @class Document
 */
export class Document {
    private readonly _graph: JsonldGraph;
    private readonly _options: DocumentOptions;
    private readonly _instances = new Map<string, Instance & any>();

    /**
     * Creates an instance of Document.
     * @param {Vocabulary} vocabulary The vocabulary used by the document for creating and working with instances.
     * @memberof Document
     */
    constructor(public readonly vocabulary: Vocabulary, options: DocumentOptions = {}) {
        if (!vocabulary) {
            throw new ReferenceError(`Invalid vocabulary. vocabulary is '${vocabulary}'`);
        }

        this._options = options;
        this._graph = new JsonldGraph();
        this._graph.addPrefix('vocab', vocabulary.baseIri);

        for (const [uri, context] of this.vocabulary.context.definitions) {
            this._graph.addContext(uri, context);
        }

        this._graph.on('vertexIdChanged', (vertex, previousId) => {
            if (this._instances.has(previousId)) {
                const instance = this._instances.get(previousId);
                this._instances.delete(previousId);
                this._instances.set(vertex.id, instance);
            }
            if (this._options.idChangeHandler) {
                const instance: Instance = this._instances.get(vertex.id);
                this._options.idChangeHandler(instance, previousId, this);
            }
        });
    }

    /**
     * @description Gets all instances in the document.
     * @readonly
     * @type {Iterable<Instance>}
     * @memberof Document
     */
    get instances(): Iterable<Instance> {
        return new Iterable(this._instances).map(x => x[1]);
    }

    /**
     * @description Creates a new instance of a class.
     * @template T
     * @param {ClassReference} classReference The id or class instance for which the instance should be created.
     * @param {string} id The id of the instance to create.
     * @returns {(T)}
     * @memberof Document
     */
    createInstance<T = void>(classReference: ClassReference, id: string): Instance & T {
        if (!classReference) {
            throw new ReferenceError(`Invalid classReference. classReference is '${classReference}'`);
        }

        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        if (this.vocabulary.hasResource(id) || this.vocabulary.hasInstance(id)) {
            throw new errors.InvalidInstanceIdError(id, 'A class or resource with the specified id already exists.');
        }

        if (this._instances.has(id)) {
            throw new errors.DuplicateInstanceError(id);
        }

        if (this.vocabulary.hasInstance(id)) {
            throw new errors.InvalidInstanceIdError(id, 'Another instance with the id has already been defined in the vocabulary');
        }

        const classType = typeof classReference === 'string'
            ? this.vocabulary.getClass(classReference)
            : classReference;

        if (!classType) {
            throw new errors.ResourceNotFoundError(classReference as string, 'Class');
        }

        const instance = InstanceProxy.proxify<T>(new Instance(this._graph.createVertex(id), this.vocabulary, this));
        instance.setClass(classType);
        this._instances.set(instance.id, instance);
        return instance;
    }

    /**
     * @description Gets an instance.
     * @template T
     * @param {string} id The id of the instance to get.
     * @returns {(T)}
     * @memberof Document
     */
    getInstance<T = void>(id: string): T & Instance {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        if (this.vocabulary.hasResource(id) || this.vocabulary.hasInstance(id)) {
            throw new errors.InstanceNotFoundError(id);
        }

        return this._instances.get(id);
    }

    /**
     * @description Gets all instances of a specific class.
     * @template T
     * @param {ClassReference} classReference The id or class reference to get instances of.
     * @param {boolean} [descendants=false] True to include all instances that are descendants of the specified class, else false. Default is false.
     * @returns {(Iterable<T>)}
     * @memberof Document
     */
    getInstancesOf<T = void>(classReference: ClassReference, descendants: boolean = false): Iterable<Instance & T> {
        if (!classReference) {
            throw new ReferenceError(`Invalid classReference. classReference is '${classReference}`);
        }

        const classType = typeof classReference === 'string'
            ? this.vocabulary.getClass(classReference)
            : classReference;

        if (!classType) {
            throw new errors.ResourceNotFoundError(classReference as string, 'Class');
        }

        const classV = this._graph.getVertex(identity.expand(classType.id, this.vocabulary.baseIri));
        if (!descendants) {
            if (!classV) {
                return Iterable.empty();
            } else {
                return classV.instances.map(vertex => this._instances.get(vertex.id));
            }
        } else {
            // tslint:disable-next-line:no-this-assignment
            const that = this;
            return new Iterable((function* getDescendantInstances() {
                const tracker = new Set<string>();
                if (classV) {
                    // First the class instances and yield those results.
                    for (const instanceV of classV.instances) {
                        if (!tracker.has(instanceV.id)) {
                            tracker.add(instanceV.id);
                            yield that._instances.get(instanceV.id);
                        }
                    }
                }

                for (const descendantTypes of classType.descendants) {
                    const descendantV = that._graph.getVertex(
                        identity.expand(descendantTypes.id, that.vocabulary.baseIri)
                    );
                    if (descendantV) {
                        for (const instanceV of descendantV.instances) {
                            if (!tracker.has(instanceV.id)) {
                                tracker.add(instanceV.id);
                                yield that._instances.get(instanceV.id);
                            }
                        }
                    }
                }
            })());
        }
    }

    /**
     * @description Gets all instances that refer to the specified instance.
     * @param {InstanceReference} instanceReference The instance id or instance whose referrers should be retrieved.
     * @returns {Iterable<Instance>}
     * @memberof Document
     */
    getReferrersOf(instanceReference: InstanceReference, propertyReference?: PropertyReference): Iterable<Instance> {
        if (!instanceReference) {
            throw new ReferenceError(`Invalid instanceReference. instanceReference is '${instanceReference}'`);
        }

        const instanceId = typeof instanceReference === 'string' ? instanceReference : instanceReference.id;
        const instanceV = this._graph.getVertex(instanceId);
        if (!instanceV) {
            throw new errors.InstanceNotFoundError(instanceReference as string);
        }

        const propertyId = propertyReference
            ? typeof propertyReference === 'string'
                ? propertyReference
                : propertyReference.id
            : null;

        return instanceV
            .getIncoming(identity.expand(propertyId, this.vocabulary.baseIri))
            .map(x => this._instances.get(x.fromVertex.id));
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

        return this._instances.has(id);
    }

    /**
     * @description Loads input documents.
     * @param {object|object[]} input The input documents to load
     * @param {string[]} [contexts] Optional contexts to use for parsing the input.
     * @returns {Promise<void>}
     * @memberof Document
     */
    async load(inputs: object | object[], contexts?: string[]): Promise<void> {
        if (!inputs) {
            throw new ReferenceError(`Invalid inputs. inputs is ${inputs}.`);
        }

        const vertices = await this._graph.load(inputs, contexts);
        const blankTypeInstances: Instance[] = [];
        const blankIdInstances: Instance[] = [];

        for (const vertexId of vertices) {
            const vertex = this._graph.getVertex(vertexId);
            const instance = InstanceProxy.proxify(new Instance(vertex, this.vocabulary, this));
            this._instances.set(instance.id, instance);

            if (vertex.types.count() === 0 && this._options.blankTypeNormalizer) {
                blankTypeInstances.push(instance);
            } else {
                for (const typeV of vertex.types) {
                    const classType = this.vocabulary.getClass(typeV.id);
                    if (classType) {
                        instance.setClass(classType);
                    }
                }
            }

            if (vertex.isBlankNode && this._options.blankIdNormalizer) {
                blankIdInstances.push(instance);
            }
        }

        for (const instance of blankTypeInstances) {
            this._options.blankTypeNormalizer(instance, this);
        }

        for (const instance of blankIdInstances) {
            // NOTE: If a idChangeHandler is registered in document options, it has the opportunity to also update its outgoing instances ids.
            // This could cause a node that was detected as blank node to not be a blank node anymore due to a cascading id update. Before blindly
            // re-processing a node check to make sure that node still is a blank id node before calling the blank id normalizer.
            if (instance.vertex.isBlankNode) {
                const previousId = instance.id;
                this._options.blankIdNormalizer(instance, this);
                if (previousId !== instance.id) {
                    this._instances.delete(previousId);
                    this._instances.set(instance.id, instance);
                }
            }
        }
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
            this._graph.removeVertex(instanceId);
            this._instances.delete(instanceId);
        } else {
            const instance = this._graph.getVertex(instanceId);
            if (!instance) {
                return;
            }

            this._removeInstanceRecursive(instance);
            this._instances.delete(instanceId);
        }
    }

    /**
     * @description Gets a JSON representation of the document.
     * @param {JsonFormatOptions} [options] Optional JSON formatting options.
     * @memberof Document
     */
    // tslint:disable-next-line: promise-function-async
    toJson(options?: JsonFormatOptions): Promise<any> {
        return this._graph.toJson(options);
    }

    private _removeInstanceRecursive(instanceV: Vertex, tracker: Set<string> = new Set<string>()): void {
        if (tracker.has(instanceV.id)) {
            return;
        }

        tracker.add(instanceV.id);
        for (const outgoing of instanceV.getOutgoing().items()) {
            outgoing.toVertex.removeIncoming(outgoing.label, instanceV.id);
            if (outgoing.toVertex.getIncoming().count() === 0) {
                this._removeInstanceRecursive(outgoing.toVertex);
            }
        }

        this._graph.removeVertex(instanceV);
        this._instances.delete(instanceV.id);
    }
}

export default Document;
