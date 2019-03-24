import { Vertex } from 'jsonld-graph';

import Errors from './errors';
import id from './id';
import Vocabulary from './types';
import { ContextTerm } from './context';

/**
 * @description Vocabulary resource.
 * @export
 * @abstract
 * @class Resource
 */
export abstract class Resource {
    protected constructor(
        protected readonly vertex: Vertex,
        protected readonly vocabulary: Vocabulary) { }

    /**
     * @description Gets the id of the resource.
     * @type {string}
     * @memberof Resource
     */
    get id(): string {
        return id.compact(this.vertex.id);
    }

    /**
     * @description Sets the id of the resource.
     * @memberof Resource
     */
    set id(value: string) {
        const expandedId = id.expand(value);
        if (this.vertex.id === expandedId) {
            return;
        }

        if (this.vocabulary.hasResource(expandedId)) {
            throw new Errors.DuplicateResourceError(value);
        }

        this.vertex.id = expandedId;
    }

    /**
     * @description Gets the user friendly label of the resource.
     * @type {string}
     * @memberof Resource
     */
    get label(): string {
        return this.vertex.getAttributeValue<string>('rdfs:label');
    }

    /**
     * @description Sets the user friendly label of the resource.
     * @memberof Resource
     */
    set label(value: string) {
        if (!value) {
            this.vertex.deleteAttribute('rdfs:label');
        } else {
            this.vertex.replaceAttributeValue('rdfs:label', value);
        }
    }

    /**
     * @description Gets the user friendly comment of the resource.
     * @type {string}
     * @memberof Resource
     */
    get comment(): string {
        return this.vertex.getAttributeValue('rdfs:comment');
    }

    /**
     * @description Sets the user friendly comment of the resource.
     * @memberof Resource
     */
    set comment(value: string) {
        if (!value) {
            this.vertex.deleteAttribute('rdfs:comment');
        } else {
            this.vertex.replaceAttributeValue('rdfs:comment', value);
        }
    }

    /**
     * @description Gets the context term associated with the resource.
     * @type {string}
     * @memberof Resource
     */
    get term(): string {
        const definition = this.vocabulary.context.resolveTerm(this.id);
        if (!definition) {
            return undefined;
        } else {
            return definition.term;
        }
    }

    /**
     * @description Sets the context term associated with the resource.
     * @memberof Resource
     */
    set term(value: string) {
        this.vocabulary.context.setTerm(value, this.id);
    }

    /**
     * @description Gets the resource type.
     * @readonly
     * @type {string}
     * @memberof Resource
     */
    get type(): string {
        return this.vertex.types.map(x => x.id).first();
    }

    /**
     * @description Checks if a resource is of a specified type.
     * @param {string} type The type id to check.
     * @returns {boolean}
     * @memberof Resource
     */
    isType(type: string): boolean {
        return this.vertex.isType(type);
    }

    /**
     * @description Gets the context term definition associated with this resource.
     * @protected
     * @returns {ContextTerm}
     * @memberof Resource
     */
    protected getTermDefinition(): ContextTerm {
        const contextTerm = this.vocabulary.context.resolveTerm(this.id);
        if (contextTerm) {
            return contextTerm.definition;
        } else {
            return undefined;
        }
    }
}

export default Resource;