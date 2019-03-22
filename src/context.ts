import Iterable from 'jsiterable';
import Id from './id';
import Errors from './errors';
import { JsonldKeywords } from 'jsonld-graph';

/**
 * @description The value type of a term in the context.
 * @export
 * @enum {number}
 */
export enum ValueType {
    id = '@id',
    vocab = '@vocab'
}

/**
 * @description The container type of a term in the context.
 * @export
 * @enum {number}
 */
export enum ContainerType {
    language = '@language',
    id = '@id',
    index = '@index',
    list = '@list',
    set = '@set',
    type = '@type'
}

/**
 * @description A term defined in the context.
 */
export class ContextTerm {
    constructor(
        public id: string,
        public type?: string | ValueType,
        public container?: ContainerType) { }

    /**
     * @description Gets the JSON representation of a term definition.
     * @returns {*}
     * @memberof ContextTerm
     */
    toJson(): any {
        if (!this.type && !this.container) {
            return this.id;
        } else {
            const json = { [JsonldKeywords.id]: this.id };
            if (this.type) {
                json[JsonldKeywords.type] = this.type;
            }
            if (this.container) {
                json['@container'] = this.container;
            }

            return json;
        }
    }
}

export class Context {

    static readonly RdfNamespace = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
    static readonly RdfsNamespace = 'http://www.w3.org/2000/01/rdf-schema#';
    static readonly XSDNamesapce = 'http://www.w3.org/2001/XMLSchema#';

    private readonly _terms: Map<string, ContextTerm> = new Map<string, ContextTerm>();

    /**
     * Creates an instance of Context.
     * @param {string} baseIri The base vocabulary IRI of the context.
     * @memberof Context
     */
    constructor(private readonly baseIri: string) {
        if (!baseIri) {
            throw new ReferenceError(`Invalid baseIri. baseIri is '${baseIri}'`);
        }
    }

    /**
     * @description Gets all terms defined in the context.
     * @readonly
     * @type {Iterable<[string, ContextTerm]>}
     * @memberof Context
     */
    get terms(): Iterable<[string, ContextTerm]> {
        return new Iterable(this._terms);
    }

    /**
     * @description Sets the term associated with an id.
     * @param {string} term The term to set.
     * @param {string} id The id associated with the term.
     * @returns {ContextTerm} The term.
     * @memberof Context
     */
    setTerm(term: string, id: string): ContextTerm {
        if (!term) {
            throw new ReferenceError(`Invalid term. term is ${term}`);
        }

        if (!id) {
            throw new ReferenceError(`Invalid id. id is ${id}`);
        }

        if (this.isDefined(term)) {
            throw new Errors.DuplicateContextTermError(term);
        }

        const compactId = Id.compact(id);
        const existing = this.resolveTerm(id);
        if (existing) {
            // Id was already mapped to another term. Copy its definition over to the new term and delete the old one.
            existing.definition.id = compactId;
            this._terms.set(term, existing.definition);
            this._terms.delete(existing.term);
            return existing.definition;
        } else {
            const definition = new ContextTerm(id);
            this._terms.set(term, definition);
            return definition;
        }
    }

    /**
     * @description Gets the term.
     * @param {string} term The term key to lookup.
     * @returns {ContextTerm}
     * @memberof Context
     */
    getTerm(term: string): ContextTerm {
        if (!term) {
            throw new ReferenceError(`Invalid key. key is '${term}'`);
        }

        return this._terms.get(term);
    }

    /**
     * @description Checks if a term has been defined in the context.
     * @param {string} term The term to check.
     * @returns {boolean} True if the term exists and has been defined, else false.
     * @memberof Context
     */
    isDefined(term: string): boolean {
        if (!term) {
            throw new ReferenceError(`Invalid term. term is '${term}'`);
        }

        return this._terms.has(term);
    }

    /**
     * @description Loads a context document.
     * @param {*} document The context document to parse.
     * @memberof Context
     */
    load(document: any) {
        if (!document) {
            throw new ReferenceError(`Invalid document. document is '${document}'`);
        }

        if (!document[JsonldKeywords.context]) {
            throw new Errors.ContextSyntaxError(`Missing ${JsonldKeywords.context} key`);
        }

        const context = document[JsonldKeywords.context];
        if (context['@vocab'] && context['@vocab'] !== this.baseIri) {
            throw new Errors.ContextSyntaxError(`Context '@vocab' IRI ${context['@vocab']} does not match vocabulary base ${this.baseIri}`);
        }

        for (const term of Object.getOwnPropertyNames(context).filter(x => !x.startsWith('@'))) {
            const value = typeof context[term] === 'string' ? { [JsonldKeywords.id]: context[term] } : context[term];
            if (!value[JsonldKeywords.id]) {
                throw new Errors.ContextSyntaxError(`Invalid context term ${term}. ${JsonldKeywords.id} not specified for term`);
            }

            const definition = this.isDefined(term) ? this.getTerm(term) : this.setTerm(term, value[JsonldKeywords.id]);
            definition.container = value['@container'];
            definition.type = value[JsonldKeywords.type];
        }
    }

    /**
     * @description Removes a term from the context.
     * @param {string} term The term to remove from the context.
     * @memberof Context
     */
    removeTerm(term: string): void {
        if (!term) {
            throw new ReferenceError(`Invalid term. term is '${term}'`);
        }

        this._terms.delete(term);
    }

    /**
     * @description Resolves the term mapped to an id.
     * @param {string} id The id whose mapped term should be resolved.
     * @memberof Context
     */
    resolveTerm(id: string): { term: string, definition: ContextTerm } {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        const compactId = Id.compact(id);
        for (const [term, definition] of this._terms.entries()) {
            if (definition.id === compactId) {
                return { term,  definition };
            }
        }

        return undefined;
    }
}

export default Context;