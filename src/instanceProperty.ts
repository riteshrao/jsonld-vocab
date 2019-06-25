import { Vertex } from 'jsonld-graph';
import Class from './class';
import ContainerPropertyValues from './containerPropertyValues';
import { ContainerType, ValueType } from './context';
import * as errors from './errors';
import * as identity from './identity';
import Instance from './instance';
import Property from './property';
import * as types from './types';

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
        this._normalizedId = identity.expand(this._property.id, this._vocabulary.baseIri);
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
     * @description Gets the property value.
     * @type {*}
     * @memberof InstanceProperty
     */
    get value(): any {
        if (this._property.container) {
            return new ContainerPropertyValues<any>(
                this._vertex,
                this._property,
                this._vocabulary,
                this._instanceProvider
            );
        } else {
            const instanceRef = this._vertex.getOutgoing(this._normalizedId).first();
            if (instanceRef) {
                const entity = this._vocabulary.getEntity(identity.expand(instanceRef.toVertex.id, this._vocabulary.baseIri));
                if (entity) {
                    return entity;
                } else {
                    return this._instanceProvider.getInstance(
                        identity.expand(instanceRef.toVertex.id, this._vocabulary.baseIri)
                    );
                }
            }

            if (this._property.valueType === ValueType.Id || this._property.valueType === ValueType.Vocab) {
                return undefined;
            }

            return this._vertex.getAttributeValue(this._normalizedId);
        }
    }

    /**
     * @description Sets the property value;
     * @memberof InstanceProperty
     */
    set value(value: any) {
        if (this._property.container) {
            throw new errors.InstancePropertyValueError(
                identity.compact(this._vertex.id, this._vocabulary.baseIri),
                this._property.id,
                'Value setter for container properties cannot be used. Use add/remove value methods instead on the property values instead.'
            );
        }

        this._vertex.removeOutgoing(this._normalizedId);
        this._vertex.deleteAttribute(this._normalizedId);
        if (value === null || value === undefined) {
            return;
        }

        if (
            (this._property.valueType === ValueType.Id || this._property.valueType === ValueType.Vocab) &&
            (!(value instanceof Instance) && !(value instanceof Class))
        ) {
            throw new errors.InstancePropertyValueError(
                identity.compact(this._vertex.id, this._vocabulary.baseIri),
                this._property.id,
                'Value for @id or @vocab properties MUST be a valid Instance or Class reference'
            );
        }

        switch (typeof value) {
            case 'bigint':
            case 'boolean':
            case 'number':
            case 'string': {
                this._vertex.replaceAttributeValue(this._normalizedId, value);
                break;
            }
            case 'object': {
                if (value instanceof Instance || value instanceof Class) {
                    this._vertex.setOutgoing(this._normalizedId, identity.expand(value.id, this._vocabulary.baseIri), true);
                    return;
                } else {
                    throw new errors.InstancePropertyValueError(
                        identity.compact(this._vertex.id, this._vocabulary.baseIri),
                        this._property.id,
                        `Value of type ${typeof value} is not supported.`
                    );
                }
            }
            default: {
                throw new errors.InstancePropertyValueError(
                    identity.compact(this._vertex.id, this._vocabulary.baseIri),
                    this._property.id,
                    `Value of type ${typeof value} is not supported.`
                );
            }
        }
    }
}

export default InstanceProperty;
