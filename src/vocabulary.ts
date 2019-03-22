import Iterable from 'jsiterable';
import JsonldGraph, { JsonldKeywords, Vertex } from 'jsonld-graph';

import * as types from './types';

import Class from './class';
import Context from './context';
import Errors from './errors';
import Id from './id';
import InstanceProxy from './instanceProxy';
import Property from './property';
import DataType from './dataType';
import Instance from './instance';
import Resource from './resource';

/**
 * @description RDF based vocabulary.
 * @export
 * @class Vocabulary
 * @implements {IVocabulary}
 */
export class Vocabulary implements types.Vocabulary {
    private readonly _context: Context;
    private readonly _graph: JsonldGraph;

    /**
     * Creates an instance of Vocabulary.
     * @param {string} baseIri The base IRI of the vocabulary.
     * @param {string} contextUri The context URL of the vocabulary.
     * @memberof Vocabulary
     */
    constructor(public readonly baseIri: string, public readonly contextUri: string) {
        this._context = new Context(baseIri);
        this._graph = new JsonldGraph();
        this._graph.addPrefix('vocab', baseIri);
        this._graph.addPrefix('rdf', Context.RdfNamespace);
        this._graph.addPrefix('rdfs', Context.RdfsNamespace);
        this._graph.addPrefix('xsd', Context.XSDNamesapce);
        this._graph.addContext(contextUri, {
            [JsonldKeywords.context]: {
                rdf: Context.RdfNamespace,
                rdfs: Context.RdfsNamespace,
                xsd: Context.XSDNamesapce,
                Class: 'rdfs:Class',
                Comment: 'rdfs:comment',
                Domain: {
                    '@id': 'rdfs:domain',
                    '@type': '@id',
                    '@container': '@set'
                },
                Label: 'rdfs:label',
                Property: 'rdf:Property',
                Range: {
                    '@id': 'rdfs:range',
                    '@type': '@id',
                    '@container': '@set'
                },
                SubClassOf: {
                    '@id': 'rdfs:subClassOf',
                    '@type': '@id',
                    '@container': '@set'
                }
            }
        });

        // Create xsd data types by default.
        for (const dataType of DataType.all()) {
            this._graph.createVertex(dataType.id);
        }

        this._graph.on('vertexIdChanged', this._onVertexIdChange.bind(this));
    }

    /**
     * @description Gets the vocabulary context.
     * @readonly
     * @memberof Vocabulary
     */
    get context() {
        return this._context;
    }

    /**
     * @description The raw vocabulary graph.
     * @readonly
     * @type {JsonldGraph}
     * @memberof Vocabulary
     */
    get graph(): JsonldGraph {
        return this._graph;
    }

    /**
     * @description Gets all classes defined in the vocabulary.
     * @readonly
     * @type {Iterable<Class>}
     * @memberof Vocabulary
     */
    get classes(): Iterable<Class> {
        const classTypeV = this._graph.getVertex('rdfs:Class');
        if (!classTypeV) {
            return new Iterable([]);
        }

        return classTypeV
            .getIncoming(JsonldKeywords.type)
            .map(edge => new Class(edge.fromVertex, this));
    }

    /**
     * @description Gets all data types supported by the vocabulary.
     * @readonly
     * @type {Iterable<DataType>}
     * @memberof Vocabulary
     */
    get dataTypes(): Iterable<DataType> {
        return new Iterable(DataType.all());
    }

    /**
     * @description Gets all instances in the vocabulary.
     * @readonly
     * @type {(Instance & any)}
     * @memberof Vocabulary
     */
    get instances(): Instance & any {
        return this.graph
            .getVertices(x => x.types.count() > 0 && !x.isType('rdfs:Class') && !x.isType('rdf:Property'))
            .map(vertex => InstanceProxy.proxify(new Instance(vertex, this)));
    }

    /**
     * @description Gets all properties defined in the vocabulary.
     * @readonly
     * @type {Iterable<Property>}
     * @memberof Vocabulary
     */
    get properties(): Iterable<Property> {
        const propertyTypeV = this._graph.getVertex('rdf:Property');
        if (!propertyTypeV) {
            return new Iterable([]);
        }

        return propertyTypeV
            .getIncoming(JsonldKeywords.type)
            .map(edge => new Property(edge.fromVertex, this));
    }

    /**
     * @description Gets all resources defined in the vocabulary.
     * @readonly
     * @type {Iterable<Resource>}
     * @memberof Vocabulary
     */
    get resources(): Iterable<Resource> {
        return this.graph
            .getVertices(vertex => vertex.isType('rdfs:Class') || vertex.isType('rdf:Property'))
            .map<Resource>(vertex => this._createResource(vertex));
    }

    /**
     * @description Creates a class in the vocabulary.
     * @param {string} id The id of the class.
     * @returns {Class}
     * @memberof Vocabulary
     */
    createClass(id: string): Class {
        return Class.create(id, this);
    }

    /**
     * @description Creates a new instance in the vocabulary.
     * @template T The instance type.
     * @param {string} id The id of the instance to create.
     * @param {(string | Class)} classType The initial class type of the instance.
     * @returns {(Instance & T)}
     * @memberof Vocabulary
     */
    createInstance<T = {}>(id: string, classType: string | Class): Instance & T {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        if (!classType) {
            throw new ReferenceError(`Invalid classType. classType is '${classType}'`);
        }

        let classRef: Class;
        if (typeof classType === 'string') {
            classRef = this.getClass(classType);
            if (!classRef) {
                throw new Errors.ResourceNotFoundError(classType, 'Class');
            }
        } else {
            classRef = classType;
        }

        const instanceV = this.graph.createVertex(id);
        const instance = new Instance(instanceV, this);
        instance.setClass(classRef);

        return InstanceProxy.proxify<T>(instance);
    }

    /**
     * @description Creates a property in the vocabulary.
     * @param {string} id The id of the property to create.
     * @returns {Property}
     * @memberof Vocabulary
     */
    createProperty(id: string): Property {
        return Property.create(id, this);
    }

    /**
     * @description Gets a class from the vocabulary.
     * @param {string} id The id of the class to get.
     * @returns {Class}
     * @memberof Vocabulary
     */
    getClass(id: string): Class {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        const expandedId = Id.expand(id);
        const classV = this._graph.getVertex(expandedId);
        if (!classV) {
            return null;
        }

        if (!classV.isType('rdfs:Class')) {
            throw new Errors.ResourceTypeMismatchError(id, 'Class', classV.types.map(x => Id.compact(x.id)).items().join(','));
        }

        return new Class(classV, this);
    }

    /**
     * @description Gets a instance defined in the vocabulary.
     * @param {string} id The id of the instance to get.
     * @returns {Instance}
     * @memberof Vocabulary
     */
    getInstance<T = {}>(id: string): Instance & T {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        const expandedId = Id.expand(id);
        const instanceV = this._graph.getVertex(expandedId);
        if (!instanceV) {
            return null;
        }

        if (instanceV.types.count() === 0 || instanceV.isType('rdfs:Class') || instanceV.isType('rdf:Property')) {
            throw new Errors.InstanceTypeMismatchError(id);
        }

        return InstanceProxy.proxify<T>(new Instance(instanceV, this));
    }

    /**
     * @description Gets a specific property from the vocabulary.
     * @param {string} id The id of the property to get.
     * @returns {Property}
     * @memberof Vocabulary
     */
    getProperty(id: string): Property {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        const expandedId = Id.expand(id);
        const propertyV = this._graph.getVertex(expandedId);
        if (!propertyV.isType('rdf:Property')) {
            throw new Errors.ResourceTypeMismatchError(id, 'Property', propertyV.types.map(x => Id.compact(x.id)).items().join(','));
        }

        return new Property(propertyV, this);
    }

    /**
     * @description Gets a specific resource from the vocabulary.
     * @param {string} id The id of the resource to get.
     * @returns {Resource}
     * @memberof Vocabulary
     */
    getResource(id: string): Resource {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is ${id}`);
        }

        const expandedId = Id.expand(id);
        const resourceV = this._graph.getVertex(expandedId);
        if (!resourceV || (!resourceV.isType('rdfs:Class') && !resourceV.isType('rdf:Property'))) {
            throw new Errors.ResourceNotFoundError(id, 'Resource');
        }

        return this._createResource(resourceV);
    }

    /**
     * @description Checks if the vocabulary supports a data type.
     * @param {string} id The id of the data type to check.
     * @returns {boolean} True if the vocabulary supports the data type, else false.
     * @memberof Vocabulary
     */
    hasDataType(id: string): boolean {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        return this.dataTypes.some(x => x.id === id);
    }

    /**
     * @description Checks if an instance is defined in the vocabulary.
     * @param {string} id The id of the instance to check.
     * @returns {boolean} True if the instance is defined, else false.
     * @memberof Vocabulary
     */
    hasInstance(id: string): boolean {
        if (!id) {
            throw new ReferenceError(`Invalid id id is '${id}'`);
        }

        const vertex = this._graph.getVertex(Id.expand(id));
        if (!vertex) {
            return false;
        }

        return vertex.types.count() > 0 && !vertex.isType('rdfs:Class') && !vertex.isType('rdf:Property');
    }

    /**
     * @description Checks if a resource is defined in the vocabulary.
     * @param {string} id The id of the resource to check.
     * @returns {boolean} True if the resource is defined, else false.
     * @memberof Vocabulary
     */
    hasResource(id: string): boolean {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        const vertex = this._graph.getVertex(Id.expand(id));
        if (!vertex) {
            return false;
        }

        return vertex.types.count() > 0 && (vertex.isType('rdfs:Class') || vertex.isType('rdf:Property'));
    }

    /**
     * @description Loads a vocabulary definition.
     * @param {*} definition The definition to load.
     * @returns {Promise<void>}
     * @memberof Vocabulary
     */
    load(definition: any): Promise<void> {
        if (!definition) {
            throw new ReferenceError(`Invalid definition. definition is '${definition}'`);
        }

        return this._graph.load(definition, [this.contextUri]);
    }

    /**
     * @description Removes a class from the vocabulary.
     * @param {(string | Class)} classType The class id or class instance to remove.
     * @param {boolean} [deleteOwnedProps] True to delete all class owned properties, else false.
     * @memberof Vocabulary
     */
    removeClass(classType: string | Class, deleteOwnedProps: boolean = true): void {
        if (!classType) {
            throw new ReferenceError(`Invalid classType. classType is '${classType}'`);
        }

        const classRef = classType instanceof Class ? classType : this.getClass(classType);
        if (!classRef) {
            throw new Errors.ResourceNotFoundError(classType as string, 'Class');
        }

        const classProps = [...classRef.ownProperties];
        for (const property of classProps) {
            classRef.removeProperty(property, deleteOwnedProps);
        }

        this._graph.removeVertex(Id.expand(classRef.id));
    }

    /**
     * @description Removes a property defined in the vocabulary.
     * @param {(string | Property)} property The property id or property instance to remove.
     * @memberof Vocabulary
     */
    removeProperty(property: string | Property): void {
        if (!property) {
            throw new ReferenceError(`Invalid property. property is '${property}'`);
        }

        const propertyRef = property instanceof Property ? property : this.getProperty(property);
        if (!propertyRef) {
            throw new Errors.ResourceNotFoundError(property as string, 'Property');
        }

        this._graph.removeVertex(Id.expand(propertyRef.id));
    }

    /**
     * @description Removes a resource from the vocabulary.
     * @param {(string | Resource)} resource The resource id or resource instance to remove.
     * @memberof Vocabulary
     */
    removeResource(resource: string | Resource): void {
        if (!resource) {
            throw new ReferenceError(`Invalid resource. resource is '${resource}`);
        }

        const resourceRef: Resource = typeof resource === 'string' ? this.getResource(resource) : resource;
        if (!resourceRef) {
            throw new Errors.ResourceNotFoundError(resource as string, 'Resource');
        }

        if (resourceRef instanceof Class) {
            this.removeClass(resourceRef);
        } else if (resourceRef instanceof Property) {
            this.removeProperty(resourceRef);
        }
    }

    /**
     * @description Gets a JSON representation of the vocabulary.
     * @returns {Promise<any>}
     * @memberof Vocabulary
     */
    toJson(): Promise<any> {
        return this.graph.toJson({
            base: this.baseIri,
            context: this.contextUri,
            frame: {
                '@type': ['Class', 'Property'],
                SubClassOf: {
                    '@embed': '@never',
                    '@omitDefault': true
                },
                Domain: {
                    '@embed': '@never',
                    '@omitDefault': true
                },
                Range: {
                    '@embed': '@never',
                    '@omitDefault': true
                }
            }
        });
    }

    /**
     * @description Handles id changes of classes and properties and updates the mapped terms in the context.
     * @private
     * @param {Vertex} vertex The vertex whose id was changed.
     * @param {string} previousId The previous id of the vertex.
     * @memberof Vocabulary
     */
    private _onVertexIdChange(vertex: Vertex, previousId: string) {
        if (vertex.isType('rdfs:Class') || vertex.isType('rdf:Property')) {
            const resolved = this._context.resolveTerm(previousId);
            if (resolved) {
                resolved.definition.id = Id.compact(vertex.id);
            }
        }
    }

    private _createResource(resourceV: Vertex): Resource {
        if (resourceV.isType('rdfs:Class')) {
            return new Class(resourceV, this);
        } else if (resourceV.isType('rdf:Property')) {
            return new Property(resourceV, this);
        } else {
            throw new Errors.UnsupportedResourceTypeError(resourceV.id, resourceV.types.map(x => x.id).items().join(','));
        }
    }
}

export default Vocabulary;