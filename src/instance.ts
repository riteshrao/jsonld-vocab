import Iterable from 'jsiterable';
import { Vertex } from 'jsonld-graph';
import JsonFormatOptions from 'jsonld-graph/lib/formatOptions';

import { ValueType, ContainerType } from './context';
import Errors from './errors';
import Class from './class';
import Id from './id';
import InstanceProxy from './instanceProxy';
import Property from './property';
import Vocabulary from './types';

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
        private readonly vocabulary: Vocabulary) {

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

        const classId = typeof classType === 'string' ? Id.expand(classType) : Id.expand(classType.id);
        this.vertex.removeType(classId);
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

export class InstanceProperty {
    constructor(
        private readonly vertex: Vertex,
        private readonly property: Property,
        private readonly vocabulary: Vocabulary) {

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
        switch (this.valueType) {
            case (ValueType.id): {
                const vertices = [...this.vertex.getOutgoing(Id.expand(this.property.id)).map(x => x.toVertex)];
                if (!vertices || vertices.length === 0) {
                    return [];
                }

                const instances = vertices.map(vertex => InstanceProxy.proxify(new Instance(vertex, this.vocabulary)));
                return this.container ? instances : instances[0];
            }
            case (ValueType.vocab): {
                const vertices = [...this.vertex.getOutgoing(Id.expand(this.property.id))].map(x => x.toVertex);
                if (!vertices || vertices.length === 0) {
                    return [];
                }

                const instances = vertices.map(vertex => this.vocabulary.getInstance(vertex.id));
                return this.container ? instances : instances[0];
            }
            default: {
                return this.vertex.getAttributeValue(Id.expand(this.property.id));
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
                'Value setter for container properties cannot be used. Use addValue / removeValue methods instead.');
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

    /**
     * @description Adds a value to a container property.
     * @param {*} value The value to add to the container property.
     * @memberof InstanceProperty
     */
    addValue(value: any): void {
        if (value === null || value === undefined) {
            throw new ReferenceError(`Invalid value. value is ${value}`);
        }

        if (!this.container) {
            throw new Errors.InstancePropertyValueError(
                Id.expand(this.vertex.id),
                this.property.id,
                'Cannot use add/remove/clear value methods for non-container properties. Use the value setter instead');
        }

        if (this.valueType === ValueType.id || this.valueType === ValueType.vocab) {
            const referenceId = value instanceof Instance ? Id.expand(value.id) : '' + value;
            this.vertex.setOutgoing(Id.expand(this.property.id), referenceId, false);
        } else {
            this.vertex.addAttributeValue(Id.expand(this.property.id), value);
        }
    }

    /**
     * @description Removes a value from a container property.
     * @param {*} value The value to remove.
     * @memberof InstanceProperty
     */
    removeValue(value: any): void {
        if (value === null || value === undefined) {
            throw new ReferenceError(`Invalid value. value is ${value}`);
        }

        if (!this.container) {
            throw new Errors.InstancePropertyValueError(
                Id.expand(this.vertex.id),
                this.property.id,
                'Cannot use add/remove/clear value methods for non-container properties. Use the value setter instead');
        }

        if (this.valueType === ValueType.id || this.valueType === ValueType.vocab) {
            const referenceId = value instanceof Instance ? Id.expand(value.id) : Id.expand('' + value);
            this.vertex.removeOutgoing(Id.expand(this.property.id), referenceId);
        } else {
            throw new Error('Method not implemented');
        }
    }

    /**
     * @description Clears all values in a container property.
     * @memberof InstanceProperty
     */
    clearValues(): void {
        if (!this.container) {
            throw new Errors.InstancePropertyValueError(
                Id.expand(this.vertex.id),
                this.property.id,
                'Cannot use add/remove/clear value methods for non-container properties. Use the value setter instead');
        }

        if (this.valueType === ValueType.id || this.valueType === ValueType.vocab) {
            this.vertex.removeOutgoing(Id.expand(this.property.id));
        } else {
            this.vertex.deleteAttribute(Id.expand(this.property.id));
        }
    }
}

export default Instance;