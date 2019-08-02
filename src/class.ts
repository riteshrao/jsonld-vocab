import Iterable from 'jsiterable';
import { JsonldKeywords, Vertex } from 'jsonld-graph';
import * as errors from './errors';
import * as identity from './identity';
import Property from './property';
import Resource from './resource';
import Vocabulary, { ClassReference, PropertyReference } from './types';

/**
 * @description Class resource
 * @export
 * @class Class
 * @extends {Resource}
 */
export class Class extends Resource {
    private _properties = new Set<string>();

    /**
     * Creates an instance of Class.
     * @param {Vertex} vertex The class vertex.
     * @param {Vocabulary} vocabulary The vocabulary containing the class.
     * @memberof Class
     */
    constructor(vertex: Vertex, vocabulary: Vocabulary) {
        super(vertex, vocabulary);
        for (const { fromVertex: propertyV } of this.vertex.getIncoming('rdfs:domain')) {
            this._properties.add(propertyV.id);
        }
    }

    /**
     * @description Gets the ancestors of this class.
     * @readonly
     * @type {Iterable<Class>}
     * @memberof Class
     */
    get ancestors(): Iterable<Class> {
        // tslint:disable-next-line:no-this-assignment
        const that = this;
        return new Iterable<Class>((function* classAncestors() {
            for (const parent of that.parentClasses) {
                for (const ancestor of parent.ancestors) {
                    yield ancestor;
                }
                yield parent;
            }
        })());
    }

    /**
     * @description Gets all descendants of this class.
     * @readonly
     * @type {Iterable<Class>}
     * @memberof Class
     */
    get descendants(): Iterable<Class> {
        // tslint:disable-next-line:no-this-assignment
        const that = this;
        return new Iterable<Class>((function* classDescendants() {
            for (const child of that.subClasses) {
                for (const descendant of child.descendants) {
                    yield descendant;
                }
                yield child;
            }
        })());
    }

    /**
     * @description Ges all properties owned by this class.
     * @readonly
     * @type {Iterable<Property>}
     * @memberof Class
     */
    get ownProperties(): Iterable<Property> {
        return new Iterable(this._properties).map(x => this.vocabulary.getProperty(x));
    }

    /**
     * @description Gets all owned and ancestor properties of this class.
     * @readonly
     * @type {Iterable<Property>}
     * @memberof Class
     */
    get properties(): Iterable<Property> {
        // tslint:disable-next-line:no-this-assignment
        const that = this;
        return new Iterable((function* classProperties() {
            for (const ownProperty of that.ownProperties) {
                yield ownProperty;
            }

            for (const parent of that.parentClasses) {
                for (const parentProp of parent.properties) {
                    yield parentProp;
                }
            }
        })());
    }

    /**
     * @description Gets all classes that are sub-class of this class.
     * @readonly
     * @type {Iterable<Class>}
     * @memberof Class
     */
    get subClasses(): Iterable<Class> {
        return this.vertex.getIncoming('rdfs:subClassOf').map(edge => {
            return this.vocabulary.getClass(edge.fromVertex.id);
        });
    }

    /**
     * @description Gets all parent classes this class is a sub-class of.
     * @readonly
     * @type {Iterable<Class>}
     * @memberof Class
     */
    get parentClasses(): Iterable<Class> {
        // tslint:disable-next-line:no-this-assignment
        const that = this;
        return new Iterable<Class>((function* parentClasses() {
            const visited = new Set<string>();
            for (const { toVertex } of that.vertex.getOutgoing('rdfs:subClassOf')) {
                if (!visited.has(toVertex.id)) {
                    yield that.vocabulary.getClass(toVertex.id);
                }
            }
        })());
    }

    /**
     * @description Adds a property to the class.
     * @param {Property} property The property to add to the class.
     * @returns {void}
     * @memberof Class
     */
    addProperty(property: Property): void {
        if (!property) {
            throw new ReferenceError(`Invalid property. property is ${property}`);
        }

        const propertyId = identity.expand(property.id, this.vocabulary.baseIri);
        const propertyExists = this._properties.has(propertyId) || this.ancestors.some(x => x.hasProperty(propertyId));
        if (propertyExists) {
            return;
        }

        property.setDomain(this);
        this._properties.add(identity.expand(property.id, this.vocabulary.baseIri));
    }

    /**
     * @description Creates a new property on the class.
     * @param {string} id The property id to create.
     * @returns {Property}
     * @memberof Class
     */
    createProperty(id: string): Property {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is ${id}`);
        }

        const propertyId = identity.expand(id, this.vocabulary.baseIri, true);
        if (this._properties.has(propertyId)) {
            throw new errors.DuplicateResourceError(id);
        }

        const property = this.vocabulary.createProperty(propertyId);
        property.setDomain(this);
        this._properties.add(propertyId);
        return property;
    }

    /**
     * @description Creates a sub-class of this class.
     * @param {string} id The id of the class to create.
     * @returns {Class}
     * @memberof Class
     */
    createSubClass(id: string): Class {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is ${id}`);
        }

        const classReference = this.vocabulary.createClass(id);
        classReference.makeSubClassOf(this);
        return classReference;
    }

    /**
     * @description Gets a owned or ancestor property.
     * @param {string} id Id of the property to get.
     * @returns {Property}
     * @memberof Class
     */
    getProperty(id: string): Property {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is ${id}`);
        }

        const propertyId = identity.expand(id, this.vocabulary.baseIri, true);
        if (this._properties.has(propertyId)) {
            return this.vocabulary.getProperty(propertyId);
        } else {
            for (const ancestor of this.ancestors) {
                const property = ancestor.getProperty(id);
                if (property) {
                    return property;
                }
            }
        }
    }

    /**
     * @description Checks if the class or any of its ancestors have the specified property.
     * @param {string} property The id or property reference to check.
     * @returns {boolean} True if this class or any of its ancestors have the specified property.
     * @memberof Class
     */
    hasProperty(property: PropertyReference): boolean {
        if (!property) {
            throw new ReferenceError(`Invalid property`);
        }

        const propertyId = typeof property === 'string' ? identity.expand(property, this.vocabulary.baseIri) : property.id;
        if (this._properties.has(propertyId)) {
            return true;
        }

        for (const ancestor of this.ancestors) {
            if (ancestor.hasProperty(propertyId)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @description Checks if the class has the specified property.
     * @param {string} property The id of the property to check.
     * @returns {boolean} True if the class has the specified property, else false.
     * @memberof Class
     */
    hasOwnProperty(property: PropertyReference): boolean {
        if (!property) {
            throw new ReferenceError(`Invalid property. property is '${property}'`);
        }

        const propertyId = typeof property === 'string'
            ? identity.expand(property, this.vocabulary.baseIri, true)
            : identity.expand(property.id, this.vocabulary.baseIri);

        return this._properties.has(propertyId);
    }

    /**
     * @description Checks if this class is an ancestor of another type.
     * @param {(string | Class)} classReference The class type to check if this class is an ancestor of.
     * @returns {boolean} True if the class is an ancestor ot the specified type.
     * @memberof Class
     */
    isAncestorOf(classReference: ClassReference): boolean {
        if (!classReference) {
            throw new ReferenceError(`Invalid classReference. classREference is '${classReference}'`);
        }

        const classId = typeof classReference === 'string'
            ? identity.expand(classReference, this.vocabulary.baseIri)
            : identity.expand(classReference.id, this.vocabulary.baseIri);

        return this.descendants.some(x => identity.expand(x.id, this.vocabulary.baseIri) === classId);
    }

    /**
     * @description Checks if this class is a descendant of another type.
     * @param {(string | Class)} classType The class id or class reference to check if this class is a descendant of.
     * @returns {boolean}
     * @memberof Class
     */
    isDescendantOf(classType: ClassReference): boolean {
        if (!classType) {
            throw new ReferenceError(`Invalid classType. classType is '${classType}'`);
        }

        const classId = typeof classType === 'string'
            ? identity.expand(classType, this.vocabulary.baseIri)
            : identity.expand(classType.id, this.vocabulary.baseIri);

        return this.ancestors.some(x => identity.expand(x.id, this.vocabulary.baseIri) === classId);
    }

    /**
     * @description Checks if this class is a sub-class of another class type.
     * @param {(string | Class)} classType The id or class reference to check.
     * @returns {boolean} True if this class is a sub-class of the specified type, else false.
     * @memberof Class
     */
    isSubClassOf(classType: ClassReference): boolean {
        if (!classType) {
            throw new ReferenceError(`Invalid classType. classType is '${classType}'`);
        }

        const classId = typeof classType === 'string'
            ? identity.expand(classType, this.vocabulary.baseIri, true)
            : identity.expand(classType.id, this.vocabulary.baseIri);

        return this.vertex.getOutgoing('rdfs:subClassOf').some(x => x.toVertex.id === classId);
    }

    /**
     * @description Makes this class a sub-class of another class type.
     * @param {(string | Class)} classReference The class id or class reference to make this a class a sub-class of.
     * @memberof Class
     */
    makeSubClassOf(classReference: ClassReference): this {
        if (!classReference) {
            throw new ReferenceError(`Invalid classReference. classReference is ${classReference}`);
        }

        const classType = typeof classReference === 'string'
            ? this.vocabulary.getClass(classReference)
            : classReference;

        if (!classType) {
            throw new errors.ResourceNotFoundError(classReference as string, 'Class');
        }

        this.vertex.setOutgoing('rdfs:subClassOf', identity.expand(classType.id, this.vocabulary.baseIri), false);
        return this;
    }

    /**
     * @description Removes a property from the class.
     * @param {(string | Property)} propertyReference The property id or reference to remove.
     * @param {boolean} [deleteOwned=false] True to remove the property from the vocabulary if the property is owned and not shared by other classes.
     * @memberof Class
     */
    removeProperty(propertyReference: PropertyReference, deleteOwned: boolean = false): this {
        if (!propertyReference) {
            throw new ReferenceError(`Invalid property. property is '${propertyReference}'`);
        }

        const propertyRef = typeof propertyReference === 'string'
            ? this.getProperty(propertyReference)
            : propertyReference;

        if (!propertyRef) {
            throw new errors.ResourceNotFoundError(propertyReference as string, 'Property');
        }

        this._properties.delete(identity.expand(propertyRef.id, this.vocabulary.baseIri));
        propertyRef.removeDomain(this);
        if (propertyRef.domains.count() === 0 && deleteOwned) {
            this.vocabulary.removeProperty(propertyRef);
        }

        return this;
    }

    /**
     * @description Removes a sub-class reference from this class.
     * @param {(string | Class)} classReference The class id or class reference to remove this class as a sub-class of.
     * @memberof Class
     */
    removeSubClassOf(classReference: ClassReference): this {
        if (!classReference) {
            throw new ReferenceError(`Invalid classReference. classReference is '${classReference}'`);
        }

        const classType = typeof classReference === 'string'
            ? this.vocabulary.getClass(classReference)
            : classReference;

        if (!classType) {
            throw new errors.ResourceNotFoundError(classReference as string, 'Class');
        }

        this.vertex.removeOutgoing('rdfs:subClassOf', identity.expand(classType.id, this.vocabulary.baseIri));
        return this;
    }

    /**
     * @description Generates a JSON representation of the class.
     * @param {boolean} [includeProps=false] True to include all owned and ancestor class properties, else false. Defaults to false.
     * @param {string} [context=Context.DefaultVocabularyContext] Optional custom context uri to use for formatting the JSON output. Defaults to the built in vocabulary context.
     * @returns {Promise<any>}
     * @memberof Class
     */
    // tslint:disable-next-line: promise-function-async
    toJson(includeProps: boolean = false): Promise<any> {
        if (!includeProps) {
            return this.vertex.toJson({
                base: this.vocabulary.baseIri,
                context: this.vocabulary.contextUri,
                frame: {
                    SubClassOf: {
                        '@embed': '@never',
                        '@omitDefault': true
                    }
                }
            });
        } else {
            return this.vertex.toJson({
                base: this.vocabulary.baseIri,
                frame: {
                    [JsonldKeywords.context]: [
                        `${this.vocabulary.contextUri}`,
                        {
                            Properties: {
                                '@reverse': 'Domain',
                                '@container': '@set'
                            }
                        }
                    ],
                    Properties: {
                        Domain: {
                            '@embed': '@never',
                            '@omitDefault': true
                        },
                        Range: {
                            '@embed': '@never',
                            '@omitDefault': true
                        }
                    },
                    SubClassOf: {
                        '@embed': '@never',
                        '@omitDefault': true
                    }
                }
            });
        }
    }

    /**
     * @description Creates a new class type.
     * @static
     * @param {string} id The id of the class.
     * @param {Vocabulary} vocabulary The vocabulary to create the class in.
     * @returns {Class}
     * @memberof Class
     */
    static create(id: string, vocabulary: Vocabulary): Class {
        const normalizedId = identity.expand(id, vocabulary.baseIri, true);
        if (vocabulary.hasResource(normalizedId) ||
            vocabulary.hasDataType(normalizedId) ||
            vocabulary.hasInstance(normalizedId)) {

            throw new errors.DuplicateResourceError(id);
        }

        const classV = vocabulary.graph.createVertex(normalizedId);
        classV.setType('rdfs:Class');
        return new Class(classV, vocabulary);
    }
}

export default Class;
