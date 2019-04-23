import Iterable from 'jsiterable';
import JsonldGraph, { JsonldKeywords } from 'jsonld-graph';

import Errors from './errors';
import Id from './id';

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

    // TODO: Context cache re-constitution based on term changes.

    static readonly RdfNamespace = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
    static readonly RdfsNamespace = 'http://www.w3.org/2000/01/rdf-schema#';
    static readonly XSDNamesapce = 'http://www.w3.org/2001/XMLSchema#';

    private readonly _terms: Map<string, ContextTerm> = new Map<string, ContextTerm>();
    /**
     * Creates an instance of Context.
     * @param {string} baseIri The base vocabulary IRI of the context.
     * @memberof Context
     */
    constructor(
        private readonly baseIri: string,
        private readonly graph: JsonldGraph) {
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
     * @description Gets all the context definitions.
     * @readonly
     * @type {Iterable<[string, object]>}
     * @memberof Context
     */
    get definitions(): Iterable<[string, object]> {
        return this.graph.contexts;
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
     * @param {string} uri The uri of the context to load.
     * @param {object} document The context document to parse.
     * @memberof Context
     */
    load(uri: string, document: object) {
        if (!uri) {
            throw new ReferenceError(`Invalid uri. uri is '${uri}'`);
        }

        if (!document) {
            throw new ReferenceError(`Invalid document. document is '${document}'`);
        }

        if (!document[JsonldKeywords.context]) {
            throw new Errors.ContextSyntaxError(`Missing ${JsonldKeywords.context} key`);
        }

        this.graph.addContext(uri, document);
        const context = document[JsonldKeywords.context];
        if (context instanceof Array) {
            context.filter(x => typeof x !== 'string').forEach(item => this._parseContextObject(item));
        } else {
            this._parseContextObject(context);
        }
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

        const compactId = Id.compact(id, this.baseIri);
        for (const [term, definition] of this._terms.entries()) {
            if (definition.id === compactId) {
                return { term, definition };
            }
        }

        return undefined;
    }

    private _parseContextObject(context: any) {
        if (context['@vocab'] && context['@vocab'] !== this.baseIri) {
            throw new Errors.ContextSyntaxError(`Context '@vocab' IRI ${context['@vocab']} does not match vocabulary base ${this.baseIri}`);
        }

        for (const term of Object.getOwnPropertyNames(context).filter(x => !x.startsWith('@'))) {
            const value = typeof context[term] === 'string' ? { [JsonldKeywords.id]: context[term] } : context[term];
            if (!value['@reverse'] && !value[JsonldKeywords.id]) {
                throw new Errors.ContextSyntaxError(`Invalid context term ${term}. ${JsonldKeywords.id} not specified for term`);
            }

            if (!value['@reverse']) {
                const definition = this.isDefined(term) ? this.getTerm(term) : this._setTerm(term, value[JsonldKeywords.id]);
                definition.container = value['@container'];
                definition.type = value[JsonldKeywords.type];
            }
        }
    }

    private _setTerm(term: string, id: string): ContextTerm {
        if (!term) {
            throw new ReferenceError(`Invalid term. term is ${term}`);
        }

        if (!id) {
            throw new ReferenceError(`Invalid id. id is ${id}`);
        }

        if (this.isDefined(term)) {
            throw new Errors.DuplicateContextTermError(term);
        }

        const compactId = Id.compact(id, this.baseIri);
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
}

export default Context;