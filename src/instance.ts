import Iterable from 'jsiterable';
import LibIterable from 'jsiterable/lib/types';
import { Vertex } from 'jsonld-graph';
import JsonFormatOptions from 'jsonld-graph/lib/formatOptions';

import * as types from './types';

import Errors from './errors';
import Class from './class';
import Id from './id';
import InstanceProxy from './instanceProxy';
import Property from './property';
import { ValueType, ContainerType } from './context';

/**
 * @description Represents an vocabulary class instance.
 * @export
 * @class Instance
 */
export class Instance {
    /**
     * Creates an instance of Instance.
     * @param {Vertex} vertex The vertex backing the instance.
     * @param {Vocabulary} vocabulary The vocabulary instance.
     * @memberof Instance
     */
    constructor(
        private readonly vertex: Vertex,
        public readonly vocabulary: types.Vocabulary) {

        if (!vertex) {
            throw new ReferenceError(`Invalid vertex. vertex is ${vertex}`);
        }

        if (!vocabulary) {
            throw new ReferenceError(`Invalid vocabulary. vocabulary is ${vocabulary}`);
        }
    }

    /**
     * @description Gets the id of the instance.
     * @returns {string}
     * @memberof Instance
     */
    get id(): string {
        return Id.compact(this.vertex.id);
    }

    /**
     * @description Sets the id of the instance.
     * @memberof Instance
     */
    set id(value: string) {
        if (!value) {
            throw new ReferenceError(`Invalid id. id is '${value}'`);
        }

        const expandedId = Id.expand(value);
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
        return this.vertex.types.map(typeV => this.vocabulary.getClass(typeV.id));
    }

    /**
     * @description Gets all properties in the instance.
     * @readonly
     * @type {Iterable<InstanceProperty>}
     * @memberof Instance
     */
    get properties(): Iterable<InstanceProperty> {
        const _that = this;
        return new Iterable((function* getInstanceProperties() {
            const tracker = new Set<string>();
            for (const classType of _that.classes) {
                for (const property of classType.properties) {
                    if (!tracker.has(property.id)) {
                        tracker.add(property.id);
                        yield new InstanceProperty(_that.vertex, property, _that.vocabulary);
                    }
                }
            }
        })());
    }

    /**
     * @description Get all instances that reference this instance.
     * @readonly
     * @type {Iterable<Instance>}
     * @memberof Instance
     */
    get referrers(): Iterable<{ property: Property, instance: Instance }> {
        return this.vertex
            .getIncoming()
            .map((incoming) => {
                return {
                    property: this.vocabulary.getProperty(incoming.label),
                    instance: InstanceProxy.proxify(new Instance(incoming.fromVertex, this.vocabulary))
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

        let property: Property;
        for (const classType of this.classes) {
            property = classType.getProperty(id);
            if (property) {
                break;
            }
        }

        if (!property) {
            return null;
        } else {
            return new InstanceProperty(this.vertex, property, this.vocabulary);
        }
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

        const property = typeof propertyReference === 'string' ? this.vocabulary.getProperty(propertyReference) : propertyReference;
        if (!property) {
            throw new Errors.ResourceNotFoundError(propertyReference as string, 'Property');
        }

        return this.vertex.getIncoming(Id.expand(property.id))
            .map(({ fromVertex }) => InstanceProxy.proxify(new Instance(fromVertex, this.vocabulary)));
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

        const classId = typeof classReference === 'string' ? Id.expand(classReference) : Id.expand(classReference.id);
        return this.vertex.isType(classId) || this.classes.map(x => x.isDescendantOf(classId)).some(x => x);
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

        const classType = typeof classReference === 'string' ? this.vocabulary.getClass(classReference) : classReference;
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
        this.vertex.removeType(Id.expand(classType.id));
        const currentProps = [...this.properties];
        for (const property of classType.properties) {
            if (!currentProps.some(x => x.id === property.id)) {
                if (property.valueType === ValueType.id || property.valueType === ValueType.vocab) {
                    this.vertex.removeOutgoing(Id.expand(property.id));
                } else {
                    this.vertex.deleteAttribute(Id.expand(property.id));
                }
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

        const classType = typeof classReference === 'string' ? this.vocabulary.getClass(classReference) : classReference;
        if (!classType) {
            throw new Errors.ResourceNotFoundError(classReference as string, 'Class');
        }
        if (!(classType instanceof Class)) {
            throw new Errors.ResourceTypeMismatchError(classReference as string, 'Class', '');
        }

        if (this.isInstanceOf(classType)) {
            return;
        }

        this.vertex.setType(Id.expand(classType.id));
        return this;
    }

    /**
     * @description Returns a JSON representation of the instance.
     * @param {JsonFormatOptions} [options] Optional formatting options for the json.
     * @returns {Promise<any>}
     * @memberof Instance
     */
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
    constructor(
        private readonly vertex: Vertex,
        private readonly property: Property,
        private readonly vocabulary: types.Vocabulary) {

        if (!vertex) {
            throw new ReferenceError(`Invalid vertex. veretx is '${vertex}'`);
        }

        if (!property) {
            throw new ReferenceError(`Invalid property. property is '${property}'`);
        }

        if (!vocabulary) {
            throw new ReferenceError(`Invalid vocabulary. vocabulary is '${vocabulary}'`);
        }
    }

    /**
     * @description Gets the id of the property.
     * @readonly
     * @memberof InstanceProperty
     */
    get id() {
        return this.property.id;
    }

    /**
     * @description Gets the user friendly comment of the property.
     * @readonly
     * @memberof InstanceProperty
     */
    get comment() {
        return this.property.comment;
    }

    /**
     * @description Gets the container type of the property.
     * @readonly
     * @type {(string | ContainerType)}
     * @memberof InstanceProperty
     */
    get container(): string | ContainerType {
        return this.property.container;
    }

    /**
     * @description Gets the user friendly label of the property.
     * @readonly
     * @memberof InstanceProperty
     */
    get label() {
        return this.property.label;
    }

    get term() {
        return this.property.term;
    }

    /**
     * @description Gets the value type of the property.
     * @readonly
     * @type {(string | ValueType)}
     * @memberof InstanceProperty
     */
    get valueType(): string | ValueType {
        return this.property.valueType;
    }

    /**
     * @description Gets the value of the property.
     * @type {*}
     * @memberof InstanceProperty
     */
    get value(): any {
        if (this.container) {
            return new ContainerPropertyValues(this.vertex, this.property, this.vocabulary);
        } else {
            if (this.vertex.hasAttribute(Id.expand(this.property.id))) {
                return this.vertex.getAttributeValue(Id.expand(this.property.id));
            } else {
                const outgoingInstance = this.vertex.getOutgoing(Id.expand(this.property.id)).first();
                if (outgoingInstance) {
                    const instance = this.vocabulary.getInstance(outgoingInstance.toVertex.id);
                    if (instance) {
                        return instance;
                    } else {
                        return InstanceProxy.proxify(new Instance(outgoingInstance.toVertex, this.vocabulary));
                    }
                } else {
                    return undefined;
                }
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
                Id.compact(this.vertex.id),
                this.property.id,
                'Value setter for container properties cannot be used. Use add/remove value methods instead.');
        }

        if (value === null || value === undefined) {
            this.vertex.removeOutgoing(Id.expand(this.property.id));
            this.vertex.deleteAttribute(Id.expand(this.property.id));
            return;
        }

        if ((this.valueType === ValueType.id || this.valueType === ValueType.vocab) && !(value instanceof Instance)) {
            throw new Errors.InstancePropertyValueError(
                Id.compact(this.vertex.id),
                this.property.id,
                'Value for @id or @vocab properties MUST be a valid Instance');
        }

        if (value instanceof Instance) {
            this.vertex.removeOutgoing(Id.expand(this.property.id));
            this.vertex.setOutgoing(Id.expand(this.property.id), Id.expand(value.id), true);
        } else {
            this.vertex.replaceAttributeValue(Id.expand(this.property.id), value);
        }
    }
}

/**
 * @description Container property values.
 * @export
 * @class ContainerPropertyValues
 */
export class ContainerPropertyValues<T = any> implements LibIterable<T> {
    /**
     * Creates an instance of InstancePropertyContainer.
     * @param {Vertex} vertex The instance vertex.
     * @param {Property} property The container property.
     * @param {Vocabulary} vocabulary Reference to the vocabulary.
     * @memberof ContainerPropertyValues
     */
    constructor(
        private readonly vertex: Vertex,
        private readonly property: Property,
        private readonly vocabulary: types.Vocabulary) {
    }

    *[Symbol.iterator](): Iterator<any> {
        if (this.vertex.hasAttribute(Id.expand(this.property.id))) {
            const values = this.vertex.getAttributeValue<any>(Id.expand(this.property.id));
            if (values instanceof Array) {
                for (const value of values) {
                    yield value;
                }
            } else {
                return values;
            }
        } else {
            for (const { toVertex } of this.vertex.getOutgoing(Id.expand(this.property.id))) {
                const instance = this.vocabulary.getInstance(toVertex.id);
                if (instance) {
                    yield instance;
                } else {
                    // @type: @vocab allows for IRI's to point to custom vocabulary instances defined in the document.
                    // If the instance was not found in the vocabulary then its local vocabulary instance in the document.
                    // Construct an instance and return that.
                    yield InstanceProxy.proxify(new Instance(toVertex, this.vocabulary));
                }
            }
        }
    }

    /**
     * @description Gets the count of items in the container.
     * @readonly
     * @memberof ContainerPropertyValues
     */
    get count(): number {
        if (this.vertex.hasAttribute(Id.expand(this.property.id))) {
            const values = this.vertex.getAttributeValue<any>(Id.expand(this.property.id));
            if (!values) {
                return 0;
            } else {
                return values instanceof Array ? values.length : 1;
            }
        } else {
            return this.vertex.getOutgoing(Id.expand(this.property.id)).count();
        }
    }

    /**
     * @description Adds a value to the container property.
     * @param {*} value The value to add to the container property
     * @memberof ContainerPropertyValues
     */
    add(value: T): void {
        if (value === null || value === undefined) {
            throw new ReferenceError(`Invalid value. value is ${value}`);
        }

        if ((this.property.valueType === ValueType.id || this.property.valueType === ValueType.vocab) && !(value instanceof Instance)) {
            throw new Errors.InstancePropertyValueError(
                Id.compact(this.vertex.id),
                this.property.id,
                'Value for @id or @vocab properties MUST be a valid Instance');
        }

        if (value instanceof Instance) {
            this.vertex.setOutgoing(Id.expand(this.property.id), Id.expand(value.id));
        } else {
            this.vertex.addAttributeValue(Id.expand(this.property.id), value);
        }
    }

    /**
     * @description Removes a value from the container property.
     * @param {any} value The value to remove.
     * @memberof ContainerPropertyValues
     */
    remove(value: any): void {
        if (value === null || value === undefined) {
            throw new ReferenceError(`Invalid value. value is ${value}`);
        }

        if ((this.property.valueType === ValueType.id || this.property.valueType === ValueType.vocab) && !(value instanceof Instance)) {
            throw new Errors.InstancePropertyValueError(
                Id.compact(this.vertex.id),
                this.property.id,
                'Value for @id or @vocab properties MUST be a valid Instance');
        }

        if (value instanceof Instance) {
            this.vertex.removeOutgoing(Id.expand(this.property.id), Id.expand(value.id));
        } else {
            this.vertex.removeAttributeValue(Id.expand(this.property.id), value);
        }
    }

    /**
     * @description Clears the container property.
     * @memberof ContainerPropertyValues
     */
    clear(): void {
        this.vertex.removeOutgoing(Id.expand(this.property.id));
        this.vertex.deleteAttribute(Id.expand(this.property.id));
    }
}

export default Instance;