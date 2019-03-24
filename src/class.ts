import Iterable from 'jsiterable';
import { Vertex, JsonldKeywords } from 'jsonld-graph';

import Id from './id';
import Property from './property';
import Resource from './resource';
import Errors from './errors';
import Vocabulary, { PropertyReference, ClassReference } from './types';

/**
 * @description Class resource
 * @export
 * @class Class
 * @extends {Resource}
 */
export class Class extends Resource {

    /**
     * Creates an instance of Class.
     * @param {Vertex} vertex The class vertex.
     * @param {Vocabulary} vocabulary The vocabulary containing the class.
     * @memberof Class
     */
    constructor(vertex: Vertex, vocabulary: Vocabulary) {
        super(vertex, vocabulary);
    }

    /**
     * @description Gets the ancestors of this class.
     * @readonly
     * @type {Iterable<Class>}
     * @memberof Class
     */
    get ancestors(): Iterable<Class> {
        const _that = this;
        return new Iterable<Class>((function* classAncestors() {
            for (const parent of _that.subClassOf) {
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
        const _that = this;
        return new Iterable<Class>((function* classDescendants() {
            for (const child of _that.subClasses) {
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
        return this.vertex
            .getIncoming('rdfs:domain')
            .filter(x => x.fromVertex.isType('rdf:Property'))
            .map(x => new Property(x.fromVertex, this.vocabulary));
    }

    /**
     * @description Gets all owned and ancestor properties of this class.
     * @readonly
     * @type {Iterable<Property>}
     * @memberof Class
     */
    get properties(): Iterable<Property> {
        const _that = this;
        return new Iterable((function* classProperties() {
            for (const ownProperty of _that.ownProperties) {
                yield ownProperty;
            }

            for (const parent of _that.subClassOf) {
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
        return this.vertex
            .getIncoming('rdfs:subClassOf')
            .map(edge => new Class(edge.fromVertex, this.vocabulary));
    }

    /**
     * @description Gets all classes this class is a sub-class of.
     * @readonly
     * @type {Iterable<Class>}
     * @memberof Class
     */
    get subClassOf(): Iterable<Class> {
        return this.vertex
            .getOutgoing('rdfs:subClassOf')
            .map(edge => new Class(edge.toVertex, this.vocabulary));
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

        if (this.hasOwnProperty(property.id)) {
            return;
        }

        property.setDomain(this);
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

        const property = Property.create(id, this.vocabulary);
        property.setDomain(this);
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

        const _class = Class.create(id, this.vocabulary);
        _class.makeSubClassOf(this);
        return _class;
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

        return this.properties.first(x => x.id === id);
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

        const propertyId = typeof property === 'string' ? property : property.id;
        return this.getProperty(propertyId) ? true : false;
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

        const propertyId = typeof property === 'string' ? Id.expand(property, true) : Id.expand(property.id);
        return this.vertex
            .getIncoming('rdfs:domain')
            .filter(x => x.fromVertex.isType('rdf:Property'))
            .some(x => x.fromVertex.id === propertyId);
    }

    /**
     * @description Checks if this class is an ancestor of another type.
     * @param {(string | Class)} classType The class type to check if this class is an ancestor of.
     * @returns {boolean} True if the class is an ancestor ot the specified type.
     * @memberof Class
     */
    isAncestorOf(classType: ClassReference): boolean {
        if (!classType) {
            throw new ReferenceError(`Invalid classType. classType is '${classType}'`);
        }

        const classId = typeof classType === 'string' ? classType : classType.id;
        return this.descendants.some(x => x.id === classId);
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

        const classId = typeof classType === 'string' ? classType : classType.id;
        return this.ancestors.some(x => x.id === classId);
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

        const classId = typeof classType === 'string' ? Id.expand(classType, true) : Id.expand(classType.id);
        return this.vertex
            .getOutgoing('rdfs:subClassOf')
            .some(x => x.toVertex.id === classId);
    }

    /**
     * @description Makes this class a sub-class of another class type.
     * @param {(string | Class)} classType The class id or class reference to make this a class a sub-class of.
     * @memberof Class
     */
    makeSubClassOf(classType: ClassReference): this {
        if (!classType) {
            throw new ReferenceError(`Invalid classType. classType is ${classType}`);
        }

        const classId = typeof classType === 'string' ? Id.expand(classType, true) : Id.expand(classType.id);
        this.vertex.setOutgoing('rdfs:subClassOf', classId, false);
        return this;
    }

    /**
     * @description Removes a property from the class.
     * @param {(string | Property)} property The property id or reference to remove.
     * @param {boolean} [deleteOwned=false] True to remove the property from the vocabulary if the property is owned and not shared by other classes.
     * @memberof Class
     */
    removeProperty(property: PropertyReference, deleteOwned: boolean = false): this {
        if (!property) {
            throw new ReferenceError(`Invalid property. property is '${property}'`);
        }

        const propertyRef = property instanceof Property ? property : this.getProperty(property);
        propertyRef.removeDomain(this);
        if (propertyRef.domains.count() === 0 && deleteOwned) {
            this.vocabulary.removeResource(propertyRef);
        }

        return this;
    }

    /**
     * @description Removes a sub-class reference from this class.
     * @param {(string | Class)} classType The class id or class reference to remove this class as a sub-class of.
     * @memberof Class
     */
    removeSubClassOf(classType: ClassReference): this {
        if (!classType) {
            throw new ReferenceError(`Invalid classType. classType is '${classType}'`);
        }

        const classId = typeof classType === 'string' ? Id.expand(classType, true) : Id.expand(classType.id);
        this.vertex.removeOutgoing('rdfs:subClassOf', classId);
        return this;
    }

    /**
     * @description Generates a JSON representation of the class.
     * @param {boolean} [includeProps=false] True to include all owned and ancestor class properties, else false. Defaults to false.
     * @param {string} [context=Context.DefaultVocabularyContext] Optional custom context uri to use for formatting the JSON output. Defaults to the built in vocabulary context.
     * @returns {Promise<any>}
     * @memberof Class
     */
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
        const normalizedId = Id.expand(id, true);
        if (vocabulary.hasResource(normalizedId)) {
            throw new Errors.DuplicateResourceError(id);
        }

        const classV = vocabulary.graph.createVertex(normalizedId);
        classV.setType('rdfs:Class');
        return new Class(classV, vocabulary);
    }
}

export default Class;