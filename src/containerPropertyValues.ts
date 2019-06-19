import LibIterable from 'jsiterable/lib/types';
import { Vertex } from 'jsonld-graph';

import * as Errors from './errors';
import * as types from './types';

import Property from './property';
import Id from './id';
import { ContainerType } from './context';
import Instance from './instance';
import Class from './class';

export class ContainerPropertyValues<T> implements LibIterable<any> {
    private readonly _instanceProvider: types.InstanceProvider;
    private readonly _property: Property;
    private readonly _vocabulary: types.Vocabulary;
    private readonly _vertex: Vertex;
    private readonly _normalizedId: string;

    constructor(
        vertex: Vertex,
        property: Property,
        vocabulary: types.Vocabulary,
        instanceProvider: types.InstanceProvider
    ) {
        this._instanceProvider = instanceProvider;
        this._property = property;
        this._vocabulary = vocabulary;
        this._vertex = vertex;
        this._normalizedId = Id.expand(this._property.id, this._vocabulary.baseIri);
    }

    /**
     * @description Gets all values and references in the container.
     * @returns {Iterator<any>}
     * @memberof ContainerPropertyValues
     */
    *[Symbol.iterator](): Iterator<T> {
        const attributeValues = this._vertex.getAttributeValues<any>(this._normalizedId);
        for (const attributeValue of attributeValues) {
            if (this._property.container === ContainerType.Language) {
                yield attributeValue as any;
            } else {
                yield attributeValue.value;
            }
        }

        for (const { toVertex } of this._vertex.getOutgoing(this._normalizedId)) {
            const instance =
                this._vocabulary.getInstance<T>(toVertex.id) || this._instanceProvider.getInstance<T>(toVertex.id);
            if (instance) {
                yield instance;
            }
        }
    }

    /**
     * @description Gets the count of items in the container.
     * @readonly
     * @type {number}
     * @memberof InstancePropertyValues
     */
    get count(): number {
        if (this._vertex.hasAttribute(this._normalizedId)) {
            return this._vertex.getAttributeValues(this._normalizedId).length;
        } else {
            return this._vertex.getOutgoing(this._normalizedId).count();
        }
    }

    /**
     * @description Adds a value to the container.
     * @param {T} value The value to add.
     * @param {string} [language] Optional language of the value to add.
     * @memberof InstancePropertyValues
     */
    addValue<T extends string | number | boolean>(value: T, language?: string): void {
        if (value === null || value === undefined || value === '') {
            throw new Errors.InstancePropertyValueError(
                Id.compact(this._vertex.id, this._vocabulary.baseIri),
                this._property.id,
                'Invalid value. Expected a valid non-null or non-empty string value'
            );
        }

        if (language && typeof value !== 'string') {
            throw new Errors.InstancePropertyValueError(
                Id.compact(this._vertex.id, this._vocabulary.baseIri),
                this._property.id,
                'Invalid value type. Language localization can only be specified for string values.'
            );
        }

        this._vertex.addAttributeValue(this._normalizedId, value, language);
    }

    /**
     * @description Adds a reference value to the container.
     * @param {(Instance | Class)} ref The instance, class or id of an instance to add to the contianer.
     * @memberof ContainerPropertyValues
     */
    addReference(ref: Instance | Class): void {
        if (ref === null || ref === undefined) {
            throw new Errors.InstancePropertyValueError(
                Id.compact(this._vertex.id, this._vocabulary.baseIri),
                this._property.id,
                'Expected a valid non-null instance or class reference'
            );
        }

        this._vertex.setOutgoing(this._normalizedId, Id.expand(ref.id, this._vocabulary.baseIri));
    }

    /**
     * @description Gets the first value in the container.
     * @param {string} [language] The optional language whose value should be retrieved.
     * @returns {T}
     * @memberof ContainerPropertyValues
     */
    getValue(language?: string): T {
        return this._vertex.getAttributeValue(this._normalizedId, language);
    }

    /**
     * @description Gets a reference value in the container.
     * @template T
     * @param {string} referenceId The id of the reference to get.
     * @returns {T}
     * @memberof ContainerPropertyValues
     */
    getReference(referenceId: string): T {
        if (!referenceId) {
            throw new ReferenceError(`Invalid referenceId. referenceId is '${referenceId}'`);
        }

        const reference = this._vertex
            .getOutgoing(this._normalizedId)
            .first(({ toVertex }) => toVertex.id === Id.expand(referenceId, this._vocabulary.baseIri));

        if (reference) {
            return this._instanceProvider.getInstance<T>(reference.toVertex.id);
        } else {
            return null;
        }
    }

    /**
     * @description Checks if the container has the specified value.
     * @param {T} value The value to check.
     * @param {string} [language] Optional language of a string value.
     * @returns {boolean}
     * @memberof ContainerPropertyValues
     */
    hasValue<T extends string | number | boolean>(value: T, language?: string): boolean {
        if (value === null || value === undefined || value === '') {
            throw new Errors.InstancePropertyValueError(
                Id.compact(this._vertex.id, this._vocabulary.baseIri),
                this._property.id,
                'Invalid value. Expected a valid non-null or non-empty string value'
            );
        }

        return this._vertex.hasAttributeValue(this._normalizedId, value, language);
    }

    /**
     * @description Checks if the container has the specified reference.
     * @param {(Instance | Class | string)} ref Id or reference instance to check.
     * @param {(string | Class)} classType Optional expected class of the reference.
     * @returns {boolean}
     * @memberof ContainerPropertyValues
     */
    hasReference(ref: Instance | Class | string, classType?: string | Class): boolean {
        if (ref === null || ref === undefined || ref === '') {
            throw new Errors.InstancePropertyValueError(
                Id.compact(this._vertex.id, this._vocabulary.baseIri),
                this._property.id,
                'Expected a valid non-null instance or class reference'
            );
        }

        const referenceId = typeof ref === 'string' ? ref : ref.id;
        const reference = this._vertex
            .getOutgoing(this._normalizedId)
            .first(x => x.toVertex.id === Id.expand(referenceId, this._vocabulary.baseIri));

        if (!reference) {
            return false;
        }

        if (classType) {
            const classId = typeof classType === 'string' ? classType : classType.id;
            return reference.toVertex.isType(Id.expand(classId, this._vocabulary.baseIri));
        } else {
            return true;
        }
    }

    /**
     * @description Removes a value from the container.
     * @param {T} value The value to remove.
     * @memberof ContainerPropertyValues
     */
    removeValue<T extends string | number | boolean>(value: T): void {
        if (value === null || value === undefined || value === '') {
            throw new Errors.InstancePropertyValueError(
                Id.compact(this._vertex.id, this._vocabulary.baseIri),
                this._property.id,
                'Invalid value. Expected a valid non-null or non-empty string value'
            );
        }

        this._vertex.removeAttributeValue(this._normalizedId, value);
    }

    /**
     * @description Removes a reference from the container.
     * @param {(Instance | Class | string)} ref Id of reference instance to remove.
     * @memberof ContainerPropertyValues
     */
    removeReference(ref: Instance | Class | string): void {
        if (ref === null || ref === undefined || ref === '') {
            throw new Errors.InstancePropertyValueError(
                Id.compact(this._vertex.id, this._vocabulary.baseIri),
                this._property.id,
                'Expected a valid non-null instance or class reference'
            );
        }

        const referenceId = typeof ref === 'string' ? ref : ref.id;
        this._vertex.removeOutgoing(this._normalizedId, referenceId);
    }

    /**
     * @description Clears the container of all values and references.
     * @memberof ContainerPropertyValues
     */
    clear(): void {
        this._vertex.deleteAttribute(this._normalizedId);
        this._vertex.removeOutgoing(this._normalizedId);
    }
}

export default ContainerPropertyValues;
