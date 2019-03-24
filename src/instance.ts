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
        return this.vertex.types.map(typeV => new Class(typeV, this.vocabulary));
    }

    /**
     * @description Gets all properties in the instance.
     * @readonly
     * @type {Iterable<InstanceProperty>}
     * @memberof Instance
     */
    get properties(): Iterable<InstanceProperty> {
        return this.classes
            .mapMany((classType) => classType
                .properties
                .map(property => new InstanceProperty(this.vertex, property, this.vocabulary)));
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
     * @param {(string | Property)} property The reference property.
     * @returns {Instance}
     * @memberof Instance
     */
    getReferrers(property: string | Property): Iterable<Instance> {
        if (!property) {
            throw new ReferenceError(`Invalid property. property is '${property}'`);
        }

        const propertyId = typeof property === 'string' ? Id.expand(property) : Id.expand(property.id);
        return this.vertex.getIncoming(propertyId)
            .map(({ fromVertex }) => new Instance(fromVertex, this.vocabulary));
    }

    /**
     * @description Checks if the instance is the type of a class.
     * @param {(string | Class)} classType The class id or class reference to check.
     * @returns {boolean} True if the instance is an instance of the specified class, else false.
     * @memberof Instance
     */
    isInstanceOf(classType: string | Class): boolean {
        if (!classType) {
            throw new ReferenceError(`Invalid classType. classType is '${classType}'`);
        }

        const classId = typeof classType === 'string' ? Id.expand(classType) : Id.expand(classType.id);
        return this.vertex.isType(classId);
    }

    /**
     * @description Removes a class from the instance.
     * @param {(string | Class)} classType The class id or class reference to remove.
     * @returns {this}
     * @memberof Instance
     */
    removeClass(classType: string | Class): this {
        if (!classType) {
            throw new ReferenceError(`Invalid classType. classType is '${classType}'`);
        }

        if (!this.isInstanceOf(classType)) {
            return;
        }

        if (this.vertex.types.count() === 0) {
            throw new Errors.InstanceClassRequiredError(this.id);
        }

        const classReference = typeof classType === 'string' ? this.vocabulary.getClass(classType) : classType;
        if (!classReference.isType('rdfs:Class')) {
            throw new Errors.ResourceTypeMismatchError(classReference.id, 'Class', classReference.type);
        }

        // Remove all property values and outgoing references for class properties.
        for (const property of classReference.ownProperties) {
            if (property.valueType === ValueType.id || property.valueType === ValueType.vocab) {
                this.vertex.removeOutgoing(Id.expand(property.id));
            } else {
                this.vertex.deleteAttribute(Id.expand(property.id));
            }
        }

        this.vertex.removeType(Id.expand(classReference.id));
        return this;
    }

    /**
     * @description Sets the class type of an instance.
     * @param {(string | Class)} classType The class type of the instance.
     * @memberof Instance
     */
    setClass(classType: string | Class): this {
        if (!classType) {
            throw new ReferenceError(`Invalid classType. classType is '${classType}'`);
        }

        let classRef: Class;
        if (typeof classType === 'string') {
            const resource = this.vocabulary.getResource(classType);
            if (!resource) {
                throw new Errors.ResourceNotFoundError(classType, 'Class');
            }

            if (!(resource instanceof Class)) {
                throw new Errors.ResourceTypeMismatchError(classType, 'Class', '');
            }
        } else {
            classRef = classType;
        }

        if (this.vertex.isType(Id.expand(classRef.id))) {
            return;
        }

        this.vertex.setType(Id.expand(classRef.id));
        return this;
    }

    /**
     * @description Returns a JSON representation of the instance.
     * @param {JsonFormatOptions} [options] Optional formatting options for the json.
     * @returns {Promise<any>}
     * @memberof Instance
     */
    toJson(options?: JsonFormatOptions): Promise<any> {
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
            switch (this.valueType) {
                case (ValueType.id): {
                    const outgoingInstance = this.vertex.getOutgoing(Id.expand(this.property.id)).first();
                    if (!outgoingInstance) {
                        return undefined;
                    }

                    return InstanceProxy.proxify(new Instance(outgoingInstance.toVertex, this.vocabulary));
                }
                case (ValueType.vocab): {
                    const outgoingInstance = this.vertex.getOutgoing(Id.expand(this.property.id)).first();
                    if (!outgoingInstance) {
                        return undefined;
                    }

                    return this.vocabulary.getInstance(outgoingInstance.toVertex.id);
                }
                default: {
                    return this.vertex.getAttributeValue(Id.expand(this.property.id));
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

        switch (this.valueType) {
            case (ValueType.id):
            case (ValueType.vocab): {
                if (value === null || value === undefined) {
                    this.vertex.removeOutgoing(Id.expand(this.property.id));
                } else {
                    const referenceId = value instanceof Instance ? Id.expand(value.id) : '' + value;
                    const currentReferenceId = this.vertex.getOutgoing(Id.expand(this.property.id)).first();
                    if (currentReferenceId) {
                        this.vertex.removeOutgoing(Id.expand(this.property.id), currentReferenceId.toVertex.id);
                    }
                    this.vertex.setOutgoing(Id.expand(this.property.id), referenceId);
                }
            }
            default: {
                if (value === null || value === undefined) {
                    this.vertex.deleteAttribute(Id.expand(this.property.id));
                } else {
                    this.vertex.replaceAttributeValue(Id.expand(this.property.id), value);
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
        switch (this.property.valueType) {
            case (ValueType.id): {
                const instances = this.vertex
                    .getOutgoing(Id.expand(this.property.id))
                    .map(outgoing => InstanceProxy.proxify(new Instance(outgoing.toVertex, this.vocabulary)));

                for (const instance of instances) {
                    yield instance;
                }
            }
            case (ValueType.vocab): {
                const instances = this.vertex
                    .getOutgoing(Id.expand(this.property.id))
                    .map(outgoing => this.vocabulary.getInstance(outgoing.toVertex.id));

                for (const instance of instances) {
                    yield instance;
                }
            }
            default: {
                const values = this.vertex.getAttributeValue<any>(Id.expand(this.property.id));
                if (values instanceof Array) {
                    for (const value of values) {
                        yield value;
                    }
                } else {
                    return values;
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
        switch (this.property.valueType) {
            case (ValueType.id):
            case (ValueType.vocab): {
                return this.vertex.getOutgoing(Id.expand(this.property.id)).count();
            }
            default: {
                const values = this.vertex.getAttributeValue<any>(Id.expand(this.property.id));
                if (!values) {
                    return 0;
                } else {
                    return values instanceof Array ? values.length : 1;
                }
            }
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

        if (this.property.valueType === ValueType.id || this.property.valueType === ValueType.vocab) {
            const referenceId = value instanceof Instance ? Id.expand(value.id) : '' + value;
            this.vertex.setOutgoing(Id.expand(this.property.id), referenceId, false);
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

        if (this.property.valueType === ValueType.id || this.property.valueType === ValueType.vocab) {
            const referenceId = value instanceof Instance ? Id.expand(value.id) : Id.expand('' + value);
            this.vertex.removeOutgoing(Id.expand(this.property.id), referenceId);
        } else {
            this.vertex.removeAttributeValue(Id.expand(this.property.id), value);
        }
    }

    /**
     * @description Clears the container property.
     * @memberof ContainerPropertyValues
     */
    clear(): void {
        if (this.property.valueType === ValueType.id || this.property.valueType === ValueType.vocab) {
            this.vertex.removeOutgoing(Id.expand(this.property.id));
        } else {
            this.vertex.deleteAttribute(Id.expand(this.property.id));
        }
    }
}

export default Instance;