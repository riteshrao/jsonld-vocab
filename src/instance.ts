import Iterable from 'jsiterable';
import { Vertex } from 'jsonld-graph';
import JsonFormatOptions from 'jsonld-graph/lib/formatOptions';

import { ValueType } from './context';
import Class from './class';
import Vocabulary from './types';
import Errors from './errors';
import Id from './id';
import { InstanceProxy } from './instanceProxy';
import Property from './property';

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
        return this.vertex.id;
    }

    /**
     * @description Sets the id of the instance.
     * @memberof Instance
     */
    set id(value: string) {
        if (!value) {
            throw new ReferenceError(`Invalid id. id is '${value}'`);
        }

        this.vertex.id = value;
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
     * @description Gets the user friendly label of the property.
     * @readonly
     * @memberof InstanceProperty
     */
    get label() {
        return this.property.label;
    }

    /**
     * @description Gets the value of the property.
     * @type {*}
     * @memberof InstanceProperty
     */
    get value(): any {
        switch (this.property.valueType) {
            case (ValueType.id): {
                const vertices = [...this.vertex.getOutgoing(Id.expand(this.property.id)).map(x => x.toVertex)];
                if (!vertices || vertices.length === 0) {
                    return null;
                }

                const instances = vertices.map(vertex => InstanceProxy.proxify(new Instance(vertex, this.vocabulary)));
                return instances.length === 1 ? instances[0] : instances;
            }
            case (ValueType.vocab): {
                const vertices = [...this.vertex.getOutgoing(Id.expand(this.property.id))].map(x => x.toVertex);
                if (!vertices || vertices.length === 0) {
                    return null;
                }

                const instances = vertices.map(vertex => this.vocabulary.getInstance(vertex.id));
                return instances.length === 1 ? instances[0] : instances;
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
        switch (this.property.valueType) {
            case(ValueType.id): {
                break;
            }
            case(ValueType.vocab): {
                break;
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

export default Instance;