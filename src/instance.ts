import Iterable from 'jsiterable';
import { Vertex } from 'jsonld-graph';
import JsonFormatOptions from 'jsonld-graph/lib/formatOptions';

import * as types from './types';
import * as Errors from './errors';

import Class from './class';
import Id from './id';
import Property from './property';
import { ValueType, ContainerType } from './context';

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
        return Id.compact(this.vertex.id, this.vocabulary.baseIri);
    }

    /**
     * @description Sets the id of the instance.
     * @memberof Instance
     */
    set id(value: string) {
        if (!value) {
            throw new ReferenceError(`Invalid id. id is '${value}'`);
        }

        const expandedId = Id.expand(value, this.vocabulary.baseIri);
        if (this.vertex.id === expandedId) {
            return;
        }

        if (this.vocabulary.hasInstance(expandedId)) {
            throw new Errors.DuplicateInstanceError(value);
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
     * @description Gets a property of the instance.
     * @param {string} id The id of the property to get.
     * @returns {InstanceProperty}
     * @memberof Instance
     */
    getProperty(id: string): InstanceProperty {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        return this._properties.get(Id.expand(id, this.vocabulary.baseIri, true));
    }

    /**
     * @description Gets referrers of this instance with the specified property.
     * @param {(string | Property)} propertyReference The reference property.
     * @returns {Instance}
     * @memberof Instance
     */
    getReferrers(propertyReference: string | Property): Iterable<Instance> {
        if (!propertyReference) {
            throw new ReferenceError(`Invalid property. property is '${propertyReference}'`);
        }

        const property =
            typeof propertyReference === 'string' ? this.vocabulary.getProperty(propertyReference) : propertyReference;
        if (!property) {
            throw new Errors.ResourceNotFoundError(propertyReference as string, 'Property');
        }

        return this.vertex
            .getIncoming(Id.expand(property.id, this.vocabulary.baseIri))
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

        return this._properties.has(Id.expand(id, this.vocabulary.baseIri));
    }

    /**
     * @description Checks if the instance is the type of a class.
     * @param {(string | Class)} classReference The class id or class reference to check.
     * @returns {boolean} True if the instance is an instance of the specified class, else false.
     * @memberof Instance
     */
    isInstanceOf(classReference: string | Class): boolean {
        if (!classReference) {
            throw new ReferenceError(`Invalid classType. classType is '${classReference}'`);
        }

        const classId =
            typeof classReference === 'string'
                ? Id.expand(classReference, this.vocabulary.baseIri)
                : Id.expand(classReference.id, this.vocabulary.baseIri);

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
            throw new Errors.ResourceNotFoundError(classReference as string, 'Class');
        }
        if (!classType.isType('rdfs:Class')) {
            throw new Errors.ResourceTypeMismatchError(classType.id, 'Class', classType.type);
        }

        if (!this.isInstanceOf(classType)) {
            return;
        }

        if (this.vertex.types.count() === 1) {
            throw new Errors.InstanceClassRequiredError(this.id);
        }

        // Remove all property values and outgoing references for class properties.
        this.vertex.removeType(Id.expand(classType.id, this.vocabulary.baseIri));
        this._classes.delete(Id.expand(classType.id, this.vocabulary.baseIri));
        for (const classProperty of classType.properties) {
            const propertyId = Id.expand(classProperty.id, this.vocabulary.baseIri);
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

        const classType =
            typeof classReference === 'string' ? this.vocabulary.getClass(classReference) : classReference;

        if (!classType) {
            throw new Errors.ResourceNotFoundError(classReference as string, 'Class');
        }

        if (!(classType instanceof Class)) {
            throw new Errors.ResourceTypeMismatchError(classReference as string, 'Class', '');
        }

        if (this.isInstanceOf(classType)) {
            return;
        }

        this.vertex.setType(Id.expand(classType.id, this.vocabulary.baseIri));
        this._classes.set(Id.expand(classType.id, this.vocabulary.baseIri), classType);
        for (const property of classType.properties) {
            const propertyId = Id.expand(property.id, this.vocabulary.baseIri);
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
}

/**
 * @description Property of an instance.
 * @export
 * @class InstanceProperty
 */
export class InstanceProperty {
    private readonly _vertex: Vertex;
    private readonly _property: Property;
    private readonly _vocabulary: types.Vocabulary;
    private readonly _instanceProvider: types.InstanceProvider;
    private readonly _normalizedId: string;

    constructor(
        vertex: Vertex,
        property: Property,
        vocabulary: types.Vocabulary,
        instanceProvider: types.InstanceProvider
    ) {
        if (!vertex) {
            throw new ReferenceError(`Invalid vertex. veretx is '${vertex}'`);
        }

        if (!property) {
            throw new ReferenceError(`Invalid property. property is '${property}'`);
        }

        if (!vocabulary) {
            throw new ReferenceError(`Invalid vocabulary. vocabulary is '${vocabulary}'`);
        }

        this._vertex = vertex;
        this._property = property;
        this._vocabulary = vocabulary;
        this._instanceProvider = instanceProvider;
        this._normalizedId = Id.expand(this._property.id, this._vocabulary.baseIri);
    }

    /**
     * @description Gets the id of the property.
     * @readonly
     * @memberof InstanceProperty
     */
    get id() {
        return this._property.id;
    }

    /**
     * @description Gets the user friendly comment of the property.
     * @readonly
     * @memberof InstanceProperty
     */
    get comment() {
        return this._property.comment;
    }

    /**
     * @description Gets the container type of the property.
     * @readonly
     * @type {(string | ContainerType)}
     * @memberof InstanceProperty
     */
    get container(): string | ContainerType {
        return this._property.container;
    }

    /**
     * @description Gets the user friendly label of the property.
     * @readonly
     * @memberof InstanceProperty
     */
    get label() {
        return this._property.label;
    }

    /**
     * @description Gets the associated context term.
     * @readonly
     * @memberof InstanceProperty
     */
    get term() {
        return this._property.term;
    }

    /**
     * @description Gets the value type of the property.
     * @readonly
     * @type {(string | ValueType)}
     * @memberof InstanceProperty
     */
    get valueType(): string | ValueType {
        return this._property.valueType;
    }

    /**
     * @description Gets the value of the property.
     * @type {*}
     * @memberof InstanceProperty
     */
    get value(): any {
        switch (this.valueType) {
            case ValueType.Id:
            case ValueType.Vocab: {
                if (this.container) {
                    return new ContainerPropertyReferences(
                        this._vertex,
                        this._property,
                        this._vocabulary,
                        this._instanceProvider
                    );
                }

                const outgoingInstance = this._vertex.getOutgoing(this._normalizedId).first();
                if (outgoingInstance) {
                    const instance = this._vocabulary.getEntity(
                        Id.expand(outgoingInstance.toVertex.id, this._vocabulary.baseIri)
                    );
                    if (instance) {
                        return instance;
                    } else {
                        return this._instanceProvider.getInstance(outgoingInstance.toVertex.id);
                    }
                } else {
                    return undefined;
                }
                break;
            }
            default: {
                if (this.container) {
                    return new ContainerPropertyValues(this._vertex, this._property, this._vocabulary);
                }

                return this._vertex.getAttributeValue(this._normalizedId);
            }
        }
    }

    /**
     * @description Sets the value of the property
     * @memberof InstanceProperty
     */
    set value(value: any) {
        if (this.container) {
            throw new Errors.InstancePropertyValueError(
                Id.compact(this._vertex.id, this._vocabulary.baseIri),
                this._property.id,
                'Value setter for container properties cannot be used. Use add/remove value methods instead.'
            );
        }

        switch (this.valueType) {
            case ValueType.Id:
            case ValueType.Vocab: {
                if (value && !(value instanceof Instance) && !(value instanceof Class)) {
                    throw new Errors.InstancePropertyValueError(
                        Id.compact(this._vertex.id, this._vocabulary.baseIri),
                        this._property.id,
                        'Value for @id or @vocab properties MUST be a valid Instance or Class reference'
                    );
                }
                this._vertex.removeOutgoing(this._normalizedId);
                if (value) {
                    this._vertex.setOutgoing(this._normalizedId, Id.expand(value.id, this._vocabulary.baseIri), true);
                }
                break;
            }
            default: {
                if (typeof value === 'function' || typeof value === 'object' || typeof value === 'symbol') {
                    throw new Errors.InstancePropertyValueError(
                        Id.compact(this._vertex.id, this._vocabulary.baseIri),
                        this._property.id,
                        'Value for @value properties MUST be a valid primitive data types.'
                    );
                }

                if (value == null || value === undefined) {
                    this._vertex.deleteAttribute(this._normalizedId);
                } else {
                    this._vertex.replaceAttributeValue(this._normalizedId, value);
                }
            }
        }
    }
}

/**
 * @description Container property values.
 * @export
 * @class ContainerPropertyValues
 */
export class ContainerPropertyValues {
    private readonly _normalizedId: string;
    private readonly _vertex: Vertex;
    private readonly _property: Property;
    private readonly _vocabulary: types.Vocabulary;

    /**
     * Creates an instance of InstancePropertyContainer.
     * @param {Vertex} vertex The instance vertex.
     * @param {Property} property The container property.
     * @param {Vocabulary} vocabulary Reference to the vocabulary.
     * @memberof ContainerPropertyValues
     */
    constructor(vertex: Vertex, property: Property, vocabulary: types.Vocabulary) {
        this._vertex = vertex;
        this._property = property;
        this._vocabulary = vocabulary;
        this._normalizedId = Id.expand(this._property.id, this._vocabulary.baseIri);
    }

    /**
     * @description Gets the count of items in the container.
     * @readonly
     * @memberof ContainerPropertyValues
     */
    get count(): number {
        return this._vertex.getAttributeValues(this._normalizedId).length;
    }

    /**
     * @description Gets all the items in the container.
     * @readonly
     * @memberof ContainerPropertyValues
     */
    get items() {
        return this._vertex.getAttributeValues<any>(this._normalizedId);
    }

    /**
     * @description Adds a value to the container.
     * @param {*} value The value to add.
     * @param {string} [language] The language of the value.
     * @memberof ContainerPropertyValues
     */
    add(value: any, language?: string): void {
        this._vertex.addAttributeValue(this._normalizedId, value, language);
    }

    /**
     * @description Clears all values in the container.
     * @memberof ContainerPropertyValues
     */
    clear(): void {
        this._vertex.deleteAttribute(this._normalizedId);
    }
    /**
     * @description Gets the first value in the container.
     * @template T
     * @param {string} [language] Optional language whose localized value should be retrieved.
     * @returns {T}
     * @memberof ContainerPropertyValues
     */
    get<T>(language?: string): T {
        return this._vertex.getAttributeValue<T>(this._normalizedId, language);
    }

    /**
     * @description Checks if the specified value exists in the container.
     * @param {*} value The value to check.
     * @param {string} [language] Optional language.
     * @returns {boolean} True if the value exists, else false.
     * @memberof ContainerPropertyValues
     */
    has(value: any, language?: string): boolean {
        return this._vertex.hasAttributeValue(this._normalizedId, value, language);
    }

    /**
     * @description Sets a value in the container.
     * @param {*} value The value to set in the container.
     * @param {string} [language] Optional language.
     * @memberof ContainerPropertyValues
     */
    set(value: any, language?: string): void {
        this._vertex.replaceAttributeValue(this._normalizedId, value, language);
    }

    /**
     * @description Removes a value from the container.
     * @param {*} value The value to remove.
     * @memberof ContainerPropertyValues
     */
    remove(value: any): void {
        this._vertex.removeAttributeValue(this._normalizedId, value);
    }
}

/**
 * @description Container property references.
 * @export
 * @class ContainerPropertyReferences
 * @template T
 */
export class ContainerPropertyReferences<T extends Instance> {
    private readonly _normalizedId: string;
    private readonly _property: Property;
    private readonly _vertex: Vertex;
    private readonly _vocabulary: types.Vocabulary;
    private readonly _instanceProvider: types.InstanceProvider;

    constructor(
        vertex: Vertex,
        property: Property,
        vocabulary: types.Vocabulary,
        instanceProvider: types.InstanceProvider
    ) {
        if (!vertex) {
            throw new ReferenceError(`Invalid vertex. vertex is ${vertex}`);
        }

        if (!property) {
            throw new ReferenceError(`Invalid property. property is ${property}`);
        }

        if (!vocabulary) {
            throw new ReferenceError(`Invalid vocabulary. vocabulary is ${vocabulary}`);
        }

        if (!instanceProvider) {
            throw new ReferenceError(`Invalid instanceProvider. instanceProvider is ${instanceProvider}`);
        }

        this._vertex = vertex;
        this._vocabulary = vocabulary;
        this._instanceProvider = instanceProvider;
        this._property = property;
        this._normalizedId = Id.expand(this._property.id, this._vocabulary.baseIri);
    }

    /**
     * @description Gets the count of items in the container.
     * @readonly
     * @type {number}
     * @memberof ContainerPropertyReferences
     */
    get count(): number {
        return this._vertex.getOutgoing(this._normalizedId).count();
    }

    /**
     * @description Gets all the references in the container.
     * @readonly
     * @type {Iterable<T>}
     * @memberof ContainerPropertyReferences
     */
    get items(): Iterable<T> {
        return this._vertex
            .getOutgoing(this._normalizedId)
            .map(item => this._instanceProvider.getInstance(Id.expand(item.toVertex.id, this._vocabulary.baseIri)));
    }

    /**
     * @description Adds a new reference to an instance.
     * @param {T} instance The instance to add a reference to.
     * @memberof ContainerPropertyReferences
     */
    add(instance: T): void {
        if (!instance) {
            throw new ReferenceError(`Invalid instance. instance is ${instance}`);
        }

        this._vertex.setOutgoing(this._normalizedId, Id.expand(instance.id, this._vocabulary.baseIri));
    }

    /**
     * @description Clears all instance references from the container.
     * @memberof ContainerPropertyReferences
     */
    clear(): void {
        this._vertex.removeOutgoing(this._normalizedId);
    }

    /**
     * @description Gets an instance reference in the container.
     * @template T
     * @param {string} id The id of the instance to get.
     * @returns {T}
     * @memberof ContainerPropertyReferences
     */
    get<T>(id: string): T {
        const outgoing = this._vertex
            .getOutgoing(this._normalizedId)
            .first(x => x.toVertex.id === Id.expand(id, this._vocabulary.baseIri));

        if (outgoing) {
            return this._instanceProvider.getInstance(outgoing.toVertex.id);
        } else {
            return null;
        }
    }

    /**
     * @description Checks if the container has a reference to an instance.
     * @param {string} id The of the instance to check
     * @param {(string | Class)} [classType] The expected class type of the instance.
     * @returns {boolean} True of the container has a reference to the specified instance.
     * @memberof ContainerPropertyReferences
     */
    has(id: string, classType?: string | Class): boolean {
        const outgoing = this._vertex
            .getOutgoing(this._normalizedId)
            .first(x => x.toVertex.id === Id.expand(id, this._vocabulary.baseIri));

        if (!outgoing) {
            return false;
        }

        if (classType) {
            const classId = typeof classType === 'string' ? classType : classType.id;
            return outgoing.toVertex.isType(Id.expand(classId, this._vocabulary.baseIri));
        } else {
            return true;
        }
    }

    /**
     * @description Removes a reference to an instance.
     * @param {T} instance The instance to remove the reference from.
     * @memberof ContainerPropertyReferences
     */
    remove(instance: T): void {
        this._vertex.removeOutgoing(this._normalizedId, Id.expand(instance.id, this._vocabulary.baseIri));
    }
}

export default Instance;
