import Iterable from 'jsiterable';
import { Vertex } from 'jsonld-graph';

import * as Errors from './errors';

import { ValueType, ContainerType } from './context';
import DataType from './dataType';
import Id from './id';
import Resource from './resource';
import Vocabulary from './types';

type DomainTypes = string | Resource;
type RangeTypes = string | Resource | DataType;

export class Property extends Resource {
    /**
     * Creates an instance of Property.
     * @param {Vertex} vertex The property vertex.
     * @param {Vocabulary} vocabulary The vocabulary containing the property.
     * @memberof Property
     */
    constructor(vertex: Vertex, vocabulary: Vocabulary) {
        super(vertex, vocabulary);
    }

    /**
     * @description Gets the container type of the property.
     * @type {ContainerType}
     * @memberof Property
     */
    get container(): ContainerType {
        const definition = this.getTermDefinition();
        return definition ? definition.container : undefined;
    }

    /**
     * @description Gets the domains that the property applies to.
     * @readonly
     * @type {Iterable<Resource>}
     * @memberof Property
     */
    get domains(): Iterable<Resource> {
        return this.vertex.getOutgoing('rdfs:domain').map(edge => this.vocabulary.getResource(edge.toVertex.id));
    }

    /**
     * @description Gets the range of types applicable for the property.
     * @readonly
     * @type {Iterable<Resource>}
     * @memberof Property
     */
    get range(): Iterable<Resource | DataType> {
        return this.vertex
            .getOutgoing('rdfs:range')
            .map(edge =>
                this.vocabulary.hasResource(edge.toVertex.id)
                    ? this.vocabulary.getResource(edge.toVertex.id)
                    : DataType.parse(edge.toVertex.id)
            );
    }

    /**
     * @description Gets the value type of the property
     * @type {(string | ValueType)}
     * @memberof Property
     */
    get valueType(): string | ValueType {
        const definition = this.getTermDefinition();
        return definition ? definition.type : undefined;
    }

    /**
     * @description Checks if the property has applies to specific resource.
     * @param {(string | Resource)} resource The resource id or resource reference to check.
     * @memberof Property
     */
    hasDomain(resource: string | Resource): boolean {
        if (!resource) {
            throw new ReferenceError(`Invalid resource. resource is ${resource}`);
        }

        const resourceId =
            typeof resource === 'string'
                ? Id.expand(resource, this.vocabulary.baseIri, true)
                : Id.expand(resource.id, this.vocabulary.baseIri);

        return this.vertex.getOutgoing('rdfs:domain').some(edge => edge.toVertex.id === resourceId);
    }

    /**
     * @description Checks if a resource is in applicable range of the property.
     * @param {(string | Resource)} resource The resource id or resource reference to check.
     * @returns {boolean}
     * @memberof Property
     */
    hasRange(resource: string | Resource): boolean {
        if (!resource) {
            throw new ReferenceError(`Invalid resource. resource is ${resource}`);
        }

        const resourceId =
            typeof resource === 'string'
                ? Id.expand(resource, this.vocabulary.baseIri, true)
                : Id.expand(resource.id, this.vocabulary.baseIri);

        return this.vertex.getOutgoing('rdfs:range').some(edge => edge.toVertex.id === resourceId);
    }

    /**
     * @description Sets the domain of the property to a specific resource.
     * @param {(string | Resource)} resources The resource id or resource reference.
     * @returns {void}
     * @memberof Property
     */
    setDomain(...resources: DomainTypes[]): this {
        if (!resources) {
            throw new ReferenceError(`Invalid resource. resource is ${resources}`);
        }

        for (const resource of resources) {
            const resourceId =
                typeof resource === 'string'
                    ? Id.expand(resource, this.vocabulary.baseIri, true)
                    : Id.expand(resource.id, this.vocabulary.baseIri);

            if (!this.vocabulary.hasResource(resourceId)) {
                throw new Errors.ResourceNotFoundError(resourceId, 'Resource');
            }

            if (this.vertex.getOutgoing('rdfs:domain').some(x => x.toVertex.id === resourceId)) {
                return;
            }

            this.vertex.setOutgoing('rdfs:domain', resourceId);
        }
        return this;
    }

    /**
     * @description Sets the range of a property to a specific resource.
     * @param {(string | Resource)} resource The resource id or resource reference.
     * @returns {void}
     * @memberof Property
     */
    setRange(...resources: RangeTypes[]): this {
        if (!resources) {
            throw new ReferenceError(`Invalid resource. resource is ${resources}`);
        }

        for (const resource of resources) {
            const resourceId =
                typeof resource === 'string'
                    ? Id.expand(resource, this.vocabulary.baseIri, true)
                    : Id.expand(resource.id, this.vocabulary.baseIri);

            if (!this.vocabulary.hasResource(resourceId) && !this.vocabulary.hasDataType(resourceId)) {
                throw new Errors.ResourceNotFoundError(resourceId, 'Resource');
            }

            if (this.vertex.getOutgoing('rdfs:range').some(x => x.toVertex.id === resourceId)) {
                return;
            }

            this.vertex.setOutgoing('rdfs:range', resourceId);
        }
        return this;
    }

    /**
     * @description Removes a resource as a domain of the property.
     * @param {(string | Resource)} resource The resource to remove.
     * @memberof Property
     */
    removeDomain(resource: string | Resource): void {
        if (!resource) {
            throw new ReferenceError(`Invalid resource. resource is '${resource}'`);
        }

        const resourceId =
            typeof resource === 'string'
                ? Id.expand(resource, this.vocabulary.baseIri, true)
                : Id.expand(resource.id, this.vocabulary.baseIri);

        this.vertex.removeOutgoing('rdfs:domain', resourceV => resourceV.id === resourceId);
    }

    /**
     * @description Removes a resource from the range of the property.
     * @param {(string | Resource)} resource The resource to remove.
     * @memberof Property
     */
    removeRange(resource: string | Resource): this {
        if (!resource) {
            throw new ReferenceError(`Invalid resource. resource is '${resource}'`);
        }

        const resourceId =
            typeof resource === 'string'
                ? Id.expand(resource, this.vocabulary.baseIri, true)
                : Id.expand(resource.id, this.vocabulary.baseIri);

        this.vertex.removeOutgoing('rdfs:range', resourceV => resourceV.id === resourceId);
        return this;
    }

    /**
     * @description Gets a JSON representation of the property.
     * @returns {Promise<any>}
     * @memberof Property
     */
    // tslint:disable-next-line: promise-function-async
    toJson(): Promise<any> {
        return this.vertex.toJson({
            base: this.vocabulary.baseIri,
            context: this.vocabulary.contextUri,
            frame: {
                Range: {
                    '@embed': '@never',
                    '@omitDefault': true
                },
                Domain: {
                    '@embed': '@never',
                    '@omitDefault': true
                }
            }
        });
    }

    /**
     * @description Creates a new property.
     * @static
     * @param {string} id Id of the property to create.
     * @param {Vocabulary} vocabulary The vocabulary to create the property in.
     * @returns {Property}
     * @memberof Property
     */
    static create(id: string, vocabulary: Vocabulary): Property {
        const expandedId = Id.expand(id, vocabulary.baseIri, true);
        if (
            vocabulary.hasResource(expandedId) ||
            vocabulary.hasDataType(expandedId) ||
            vocabulary.hasInstance(expandedId)
        ) {
            throw new Errors.DuplicateResourceError(id);
        }

        const propertyV = vocabulary.graph.createVertex(expandedId);
        propertyV.setType('rdf:Property');
        return new Property(propertyV, vocabulary);
    }
}

export default Property;
