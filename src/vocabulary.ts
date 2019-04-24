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
    private readonly _classes = new Map<string, Class>();
    private readonly _properties = new Map<string, Property>();
    private readonly _instances = new Map<string, Instance & any>();

    /**
     * Creates an instance of Vocabulary.
     * @param {string} baseIri The base IRI of the vocabulary.
     * @param {string} contextUri The context URL of the vocabulary.
     * @memberof Vocabulary
     */
    constructor(public readonly baseIri: string, public readonly contextUri: string) {
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
                class: 'rdfs:Class',
                Comment: 'rdfs:comment',
                comment: 'rdfs:comment',
                Domain: {
                    '@id': 'rdfs:domain',
                    '@type': '@id',
                    '@container': '@set'
                },
                domain: {
                    '@id': 'rdfs:domain',
                    '@type': '@id',
                    '@container': '@set'
                },
                Label: 'rdfs:label',
                label: 'rdfs:label',
                Property: 'rdf:Property',
                property: 'rdfs:label',
                Range: {
                    '@id': 'rdfs:range',
                    '@type': '@id',
                    '@container': '@set'
                },
                range: {
                    '@id': 'rdfs:range',
                    '@type': '@id',
                    '@container': '@set'
                },
                SubClassOf: {
                    '@id': 'rdfs:subClassOf',
                    '@type': '@id',
                    '@container': '@set'
                },
                subClassOf: {
                    '@id': 'rdfs:subClassOf',
                    '@type': '@id',
                    '@container': '@set'
                }
            }
        });

        this._context = new Context(baseIri, this._graph);

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
        return new Iterable(this._classes).map(x => x[1]);
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
    get instances(): Iterable<Instance> {
        return new Iterable(this._instances).map(x => x[1]);
    }

    /**
     * @description Gets all properties defined in the vocabulary.
     * @readonly
     * @type {Iterable<Property>}
     * @memberof Vocabulary
     */
    get properties(): Iterable<Property> {
        return new Iterable(this._properties).map(x => x[1]);
    }

    /**
     * @description Gets all resources defined in the vocabulary.
     * @readonly
     * @type {Iterable<Resource>}
     * @memberof Vocabulary
     */
    get resources(): Iterable<Resource> {
        const _that = this;
        return new Iterable((function* resourcesIterable() {
            for (const [, classType] of _that._classes) {
                yield classType;
            }

            for (const [, property] of _that._properties) {
                yield property;
            }
        })());
    }

    /**
     * @description Creates a class in the vocabulary.
     * @param {string} id The id of the class.
     * @returns {Class}
     * @memberof Vocabulary
     */
    createClass(id: string): Class {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        const classId = Id.expand(id, this.baseIri);
        if (this._classes.has(classId)) {
            throw new Errors.DuplicateResourceError(id);
        }

        const classType = Class.create(classId, this);
        this._classes.set(classId, classType);
        return classType;
    }

    /**
     * @description Creates a new instance in the vocabulary.
     * @template T The instance type.
     * @param {string} id The id of the instance to create.
     * @param {(string | Class)} classTypes The initial class type of the instance.
     * @returns {(T)}
     * @memberof Vocabulary
     */
    createInstance<T = Instance>(id: string, ...classTypes: types.ClassReference[]): T {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        const instanceId = Id.expand(id, this.baseIri, true);
        if (this._instances.has(instanceId)) {
            throw new Errors.DuplicateInstanceError(id);
        }

        if (!classTypes || classTypes.length === 0) {
            throw new ReferenceError(`Invalid classType. classType is '${classTypes}'`);
        }

        const classRefs: Class[] = [];
        for (const classType of classTypes) {
            let classRef: Class;
            if (typeof classType === 'string') {
                classRef = this.getClass(classType);
                if (!classRef) {
                    throw new Errors.ResourceNotFoundError(classType, 'Class');
                }
            } else {
                classRef = classType;
            }

            classRefs.push(classRef);
        }

        const instanceV = this.graph.createVertex(instanceId);
        const instance = InstanceProxy.proxify<T>(new Instance(instanceV, this, this));
        for (const classRef of classRefs) {
            instance.setClass(classRef);
        }

        this._instances.set(instanceId, instance);
        return instance;
    }

    /**
     * @description Creates a property in the vocabulary.
     * @param {string} id The id of the property to create.
     * @returns {Property}
     * @memberof Vocabulary
     */
    createProperty(id: string): Property {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        const propertyId = Id.expand(id, this.baseIri);
        if (this._properties.has(propertyId)) {
            throw new Errors.DuplicateResourceError(id);
        }

        const property = Property.create(id, this);
        this._properties.set(propertyId, property);
        return property;
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

        return this._classes.get(Id.expand(id, this.baseIri));
    }

    /**
     * @description Gets an entity from the vocabulary that can either be a class, property or instance.
     * @param {string} id The id of the entity to get.
     * @returns {(Resource | Instance)}
     * @memberof Vocabulary
     */
    getEntity(id: string): Resource | Instance {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        const entityId = Id.expand(id, this.baseIri);
        return this._classes.get(entityId) ||
            this._properties.get(entityId) ||
            this._instances.get(entityId);
    }

    /**
     * @description Gets a instance defined in the vocabulary.
     * @param {string} id The id of the instance to get.
     * @returns {Instance}
     * @memberof Vocabulary
     */
    getInstance<T = void>(id: string): Instance & T {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        const instanceId = Id.expand(id, this.baseIri);
        return this._instances.get(instanceId);
    }

    /**
     * @description Gets instances of a specific class.
     * @template T
     * @param {types.ClassReference} classRef The id of the class or class instance whose instances are to be retrieved.
     * @param {boolean} descendants True to include all descendant instances of the specified class.
     * @returns {(Iterable<T>)}
     * @memberof Vocabulary
     */
    getInstancesOf<T = any>(classRef: types.ClassReference, descendants: boolean = false): Iterable<T & Instance> {
        if (!classRef) {
            throw new ReferenceError(`Invalid classRef. classRef is '${classRef}'`);
        }

        const classType = typeof classRef === 'string' ? this.getClass(classRef) : classRef;
        if (!classType) {
            throw new Errors.ResourceNotFoundError(classRef as string, 'Class');
        }

        const classV = this.graph.getVertex(Id.expand(classType.id, this.baseIri));
        if (!descendants) {
            return classV.instances.map(instanceV => this._instances.get(Id.expand(instanceV.id, this.baseIri)));
        } else {
            const _that = this;
            return new Iterable((function* getDescendantInstances() {
                const tracker = new Set<string>();
                // First the class instances and yield those results.
                for (const instanceV of classV.instances) {
                    if (!tracker.has(instanceV.id)) {
                        tracker.add(instanceV.id);
                        yield _that._instances.get(Id.expand(instanceV.id, _that.baseIri));
                    }
                }

                for (const descendantTypes of classType.descendants) {
                    const descendantV = _that.graph.getVertex(Id.expand(descendantTypes.id, _that.baseIri));
                    if (descendantV) {
                        for (const instanceV of descendantV.instances) {
                            if (!tracker.has(instanceV.id)) {
                                tracker.add(instanceV.id);
                                yield _that._instances.get(Id.expand(instanceV.id, _that.baseIri));
                            }
                        }
                    }
                }
            })());
        }
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

        const expandedId = Id.expand(id, this.baseIri);
        const propertyV = this._graph.getVertex(expandedId);
        if (!propertyV) {
            return null;
        }

        if (!propertyV.isType('rdf:Property')) {
            throw new Errors.ResourceTypeMismatchError(id, 'Property', propertyV.types.map(x => Id.compact(x.id, this.baseIri)).items().join(','));
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

        const expandedId = Id.expand(id, this.baseIri);
        const resourceV = this._graph.getVertex(expandedId);
        if (!resourceV) {
            return null;
        }

        if (!resourceV.isType('rdfs:Class') && !resourceV.isType('rdf:Property')) {
            throw new Errors.ResourceTypeMismatchError(id, 'Class | Property', resourceV.types.map(x => x.id).items().join(','));
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

        return this._instances.has(Id.expand(id, this.baseIri));
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

        const resourceId = Id.expand(id, this.baseIri);
        return this._classes.has(resourceId) || this._properties.has(resourceId);
    }

    /**
     * @description Loads a vocabulary definition.
     * @param {object[]} definition The definitions to load
     * @returns {Promise<void>}
     * @memberof Vocabulary
     */
    async load(definition: object | object[]): Promise<void> {
        const definitions = definition instanceof Array ? definition : [definition];
        if (!definitions || definitions.length === 0) {
            throw new ReferenceError(`Invalid definition. Expected one or mode definition JSON objects to load`);
        }

        const vertexIds = await this._graph.load(definition, [this.contextUri], this.baseIri);
        const classes: Vertex[] = [];
        const properties: Vertex[] = [];
        const instances: Vertex[] = [];

        // Process all created vertices and group them based on type.
        for (const vertexId of vertexIds) {
            const vertex = this._graph.getVertex(vertexId);
            if (vertex.isType('rdfs:Class') && !this._classes.has(vertexId)) {
                classes.push(vertex);
            } else if (vertex.isType('rdf:Property') && !this._properties.has(vertexId)) {
                properties.push(vertex);
            } else if (vertex.types.count() > 0 && !this._instances.has(vertexId)) {
                instances.push(vertex);
            }
        }

        // First load all properties up so that class property caching works correctly.
        for (const propertyV of properties) {
            this._properties.set(propertyV.id, new Property(propertyV, this));
        }

        // Load up all classes so that all instance class caching works correctly.
        for (const classV of classes) {
            this._classes.set(classV.id, new Class(classV, this));
        }

        // Load up all instances.
        for (const instanceV of instances) {
            const instance = new Instance(instanceV, this, this);
            for (const type of instanceV.types) {
                instance.setClass(this._classes.get(Id.expand(type.id, this.baseIri)));
            }

            this._instances.set(instanceV.id, InstanceProxy.proxify(instance));
        }
    }

    /**
     * @description Removes a class from the vocabulary.
     * @param {(string | Class)} classType The class id or class instance to remove.
     * @param {boolean} [deleteOwnedProps] True to delete all class owned properties, else false.
     * @memberof Vocabulary
     */
    removeClass(classType: types.ClassReference, deleteOwnedProps: boolean = true): void {
        if (!classType) {
            throw new ReferenceError(`Invalid classType. classType is '${classType}'`);
        }

        const classRef = classType instanceof Class ? classType : this.getClass(classType);
        if (!classRef) {
            throw new Errors.ResourceNotFoundError(classType as string, 'Class');
        }

        if (classRef.subClasses.count() > 0) {
            throw new Errors.InvalidOperationError('remove', classRef.id, 'Class', 'One or more classes sub-class this class.');
        }

        const classV = this._graph.getVertex(Id.expand(classRef.id, this.baseIri));
        const classProps = [...classRef.ownProperties];
        for (const property of classProps) {
            classRef.removeProperty(property, deleteOwnedProps);
        }

        for (const instanceV of classV.instances) {
            const instance: Instance = this._instances.get(instanceV.id) as Instance;
            if (instance.classes.count() === 1) {
                this._graph.removeVertex(instanceV.id);
                this._instances.delete(instanceV.id);
            } else {
                instance.removeClass(classRef);
            }
        }

        const classId = Id.expand(classRef.id, this.baseIri);
        this._graph.removeVertex(classId);
        this._classes.delete(classId);
    }

    /**
     * @description Removes an instance defined in the vocabulary
     * @param {types.InstanceReference} instanceRef The id of the instance or the instance to remove.
     * @memberof Vocabulary
     */
    removeInstance(instanceRef: types.InstanceReference): void {
        if (!instanceRef) {
            throw new ReferenceError(`Invalid instanceRef. instanceRef is '${instanceRef}'`);
        }

        const instance = typeof instanceRef === 'string' ? this.getInstance(instanceRef) : instanceRef;
        if (!instance) {
            throw new Errors.InstanceNotFoundError(instanceRef as string);
        }

        const instanceId = Id.expand(instance.id, this.baseIri);
        this._graph.removeVertex(instanceId);
        this._instances.delete(instanceId);
    }

    /**
     * @description Removes a property defined in the vocabulary.
     * @param {(string | Property)} property The property id or property instance to remove.
     * @memberof Vocabulary
     */
    removeProperty(property: types.PropertyReference): void {
        if (!property) {
            throw new ReferenceError(`Invalid property. property is '${property}'`);
        }

        const propertyRef = property instanceof Property ? property : this.getProperty(property);
        if (!propertyRef) {
            throw new Errors.ResourceNotFoundError(property as string, 'Property');
        }

        if (propertyRef.domains.count() > 0) {
            throw new Errors.InvalidOperationError('remove', propertyRef.id, 'Property', 'One or more classes reference this property.');
        }

        const propertyId = Id.expand(propertyRef.id, this.baseIri);
        this._graph.removeVertex(propertyId);
        this._properties.delete(propertyId);
    }

    /**
     * @description Removes a resource from the vocabulary.
     * @param {(string | Resource)} resource The resource id or resource instance to remove.
     * @memberof Vocabulary
     */
    removeResource(resource: types.ResourceReference): void {
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
                resolved.definition.id = Id.compact(vertex.id, this.baseIri);
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