import Iterable from 'jsiterable';
import { Vertex } from 'jsonld-graph';
import JsonFormatOptions from 'jsonld-graph/lib/formatOptions';
import Class from './class';
import * as errors from './errors';
import * as identity from './identity';
import InstanceProperty from './instanceProperty';
import Property from './property';
import * as types from './types';

/**
 * @description Represents an vocabulary class instance.
 * @export
 * @class Instance
 */
export class Instance {
    private readonly _instanceProvider: types.InstanceProvider;
    private readonly _classes = new Map<string, Class>();
    private readonly _properties = new Map<string, InstanceProperty>();

    /**
     * Creates an instance of Instance.
     * @param {Vertex} vertex The vertex backing the instance.
     * @param {Vocabulary} vocabulary The vocabulary instance.
     * @memberof Instance
     */
    constructor(
        public readonly vertex: Vertex,
        public readonly vocabulary: types.Vocabulary,
        instanceProvider: types.InstanceProvider
    ) {
        if (!vertex) {
            throw new ReferenceError(`Invalid vertex. vertex is ${vertex}`);
        }

        if (!vocabulary) {
            throw new ReferenceError(`Invalid vocabulary. vocabulary is ${vocabulary}`);
        }

        if (!instanceProvider) {
            throw new ReferenceError(`Invalid instanceProvider. instanceProvider is ${instanceProvider}`);
        }

        this._instanceProvider = instanceProvider;
    }

    /**
     * @description Gets the id of the instance.
     * @returns {string}
     * @memberof Instance
     */
    get id(): string {
        return identity.compact(this.vertex.id, this.vocabulary.baseIri);
    }

    /**
     * @description Sets the id of the instance.
     * @memberof Instance
     */
    set id(value: string) {
        if (!value) {
            throw new ReferenceError(`Invalid id. id is '${value}'`);
        }

        const expandedId = identity.expand(value, this.vocabulary.baseIri);
        if (this.vertex.id === expandedId) {
            return;
        }

        if (this.vocabulary.hasInstance(expandedId)) {
            throw new errors.DuplicateInstanceError(value);
        }

        this.vertex.id = expandedId;
    }

    /**
     * @description Gets the classes that the instance is a type of.
     * @readonly
     * @type {Iterable<Class>}
     * @memberof Instance
     */
    get classes(): Iterable<Class> {
        return new Iterable(this._classes).map(x => x[1]);
    }

    /**
     * @description Gets all properties in the instance.
     * @readonly
     * @type {Iterable<InstanceProperty>}
     * @memberof Instance
     */
    get properties(): Iterable<InstanceProperty> {
        return new Iterable(this._properties).map(x => x[1]);
    }

    /**
     * @description Gets the metadata of the instance.
     * @readonly
     * @type {*}
     * @memberof Instance
     */
    get metadata(): any {
        return this.vertex.metadata;
    }

    /**
     * @description Get all instances that reference this instance.
     * @readonly
     * @type {Iterable<Instance>}
     * @memberof Instance
     */
    get referrers(): Iterable<{ property: Property; instance: Instance }> {
        return this.vertex.getIncoming().map(incoming => {
            return {
                property: this.vocabulary.getProperty(incoming.label),
                instance: this._instanceProvider.getInstance(incoming.fromVertex.id)
            };
        });
    }

    /**
     * @description Gets the type of the instance.
     * @readonly
     * @type {string}
     * @memberof Instance
     */
    get typeId(): string {
        return [...this._classes.keys()]
            .map(x => identity.compact(x, this.vocabulary.baseIri))
            .join(',');
    }

    /**
     * @description Gets a property of the instance.
     * @param {string} id The id of the property to get.
     * @returns {InstanceProperty}
     * @memberof Instance
     */
    getProperty(id: string): InstanceProperty {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        return this._properties.get(identity.expand(id, this.vocabulary.baseIri, true));
    }

    /**
     * @description Gets referrers of this instance with the specified property.
     * @param {(string | Property)} propertyReference The reference property.
     * @returns {Instance}
     * @memberof Instance
     */
    getReferrers<T extends Instance = Instance>(propertyReference: string | Property): Iterable<T> {
        if (!propertyReference) {
            throw new ReferenceError(`Invalid property. property is '${propertyReference}'`);
        }

        const property =
            typeof propertyReference === 'string' ? this.vocabulary.getProperty(propertyReference) : propertyReference;
        if (!property) {
            throw new errors.ResourceNotFoundError(propertyReference as string, 'Property');
        }

        return this.vertex
            .getIncoming(identity.expand(property.id, this.vocabulary.baseIri))
            .map(({ fromVertex }) => this._instanceProvider.getInstance(fromVertex.id));
    }

    /**
     * @description Checks of a property exists on the instance.
     * @param {string} id The id of the property to check.
     * @returns
     * @memberof Instance
     */
    hasProperty(id: string) {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        return this._properties.has(identity.expand(id, this.vocabulary.baseIri));
    }

    /**
     * @description Checks if the instance is the type of a class.
     * @param {(string | Class)} classReference The class id or class reference to check.
     * @returns {boolean} True if the instance is an instance of the specified class, else false.
     * @memberof Instance
     */
    isInstanceOf<T extends Instance = Instance>(classReference: string | Class): this is T {
        if (!classReference) {
            throw new ReferenceError(`Invalid classType. classType is '${classReference}'`);
        }

        const classId =
            typeof classReference === 'string'
                ? identity.expand(classReference, this.vocabulary.baseIri)
                : identity.expand(classReference.id, this.vocabulary.baseIri);

        return this._classes.has(classId) || this.classes.map(x => x.isDescendantOf(classId)).some(x => x);
    }

    /**
     * @description Removes a class from the instance.
     * @param {(string | Class)} classReference The class id or class reference to remove.
     * @returns {this}
     * @memberof Instance
     */
    removeClass(classReference: string | Class): this {
        if (!classReference) {
            throw new ReferenceError(`Invalid classReference. classReference is '${classReference}'`);
        }

        const classType =
            typeof classReference === 'string' ? this.vocabulary.getClass(classReference) : classReference;
        if (!classType) {
            throw new errors.ResourceNotFoundError(classReference as string, 'Class');
        }
        if (!classType.isType('rdfs:Class')) {
            throw new errors.ResourceTypeMismatchError(classType.id, 'Class', classType.type);
        }

        if (!this.isInstanceOf(classType)) {
            return;
        }

        if (this.vertex.types.count() === 1) {
            throw new errors.InstanceClassRequiredError(this.id);
        }

        // Remove all property values and outgoing references for class properties.
        this.vertex.removeType(identity.expand(classType.id, this.vocabulary.baseIri));
        this._classes.delete(identity.expand(classType.id, this.vocabulary.baseIri));
        for (const classProperty of classType.properties) {
            const propertyId = identity.expand(classProperty.id, this.vocabulary.baseIri);
            if (!this.classes.some(x => x.hasProperty(classProperty))) {
                this.vertex.removeOutgoing(propertyId);
                this.vertex.deleteAttribute(propertyId);
                this._properties.delete(propertyId);
            }
        }

        return this;
    }

    /**
     * @description Sets the class type of an instance.
     * @param {(string | Class)} classReference The class type of the instance.
     * @memberof Instance
     */
    setClass(classReference: string | Class): this {
        if (!classReference) {
            throw new ReferenceError(`Invalid classType. classType is '${classReference}'`);
        }

        const classType = typeof classReference === 'string'
            ? this.vocabulary.getClass(classReference)
            : classReference;

        if (!classType) {
            throw new errors.ResourceNotFoundError(classReference as string, 'Class');
        }

        if (!(classType instanceof Class)) {
            throw new errors.ResourceTypeMismatchError(classReference as string, 'Class', '');
        }

        const classId = identity.expand(classType.id, this.vocabulary.baseIri);
        if (!this._classes.has(classId) && !this.classes.map(x => x.isDescendantOf(classId)).some(x => x)) {
            this.vertex.setType(identity.expand(classType.id, this.vocabulary.baseIri));
            this._classes.set(identity.expand(classType.id, this.vocabulary.baseIri), classType);
            for (const property of classType.properties) {
                const propertyId = identity.expand(property.id, this.vocabulary.baseIri);
                if (!this._properties.has(propertyId)) {
                    const instanceProperty = new InstanceProperty(
                        this.vertex,
                        property,
                        this.vocabulary,
                        this._instanceProvider
                    );
                    this._properties.set(propertyId, instanceProperty);
                }
            }
        }


        return this;
    }

    /**
     * @description Returns a JSON representation of the instance.
     * @param {JsonFormatOptions} [options] Optional formatting options for the json.
     * @returns {Promise<any>}
     * @memberof Instance
     */
    // tslint:disable-next-line: promise-function-async
    toJson<T = any>(options?: JsonFormatOptions): Promise<T> {
        return this.vertex.toJson(options);
    }

    /**
     * Checks if an instance is type or descendant of a class.
     *
     * @static
     * @template T The expected instance type
     * @param {T} instance The instance to check.
     * @param {string} classId The expected class or ancestor of the instance.
     * @returns {instance is T}
     * @memberof Instance
     */
    static is<T extends Instance>(instance: Instance, classId: string): instance is T {
        if (!instance) {
            throw new ReferenceError(`Invalid instance. instance is ${instance}`);
        }
        if (!classId) {
            throw new ReferenceError(`Invalid classId. classId is '${classId}'`);
        }

        return instance.classes.map(x => x.id === classId || x.isDescendantOf(classId)).some(x => x);
    }
}

export default Instance;
