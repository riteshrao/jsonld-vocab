import * as urijs from 'uri-js';
import * as Errors from './errors';

const resourceIdPattern = /^[a-zA-Z][a-zA-Z0-9_//:]*[a-zA-Z0-9]$/; // Supports both HTTP/s and URN formats

export namespace Id {
    /**
     * @description Expands a vocabulary id.
     * @export
     * @param {string} id The id to expand.
     * @param {boolean} [validate] True to validate the id before expanding
     * @returns
     */
    export function expand(id: string, base: string, validate: boolean = false) {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        if (!id.startsWith('xsd:') && validate) {
            const idPart = id.startsWith('vocab:') ? id.replace('vocab:', '') : id;
            validateResourceId(idPart);
        }

        const parsed = urijs.parse(id, { iri: true });
        if (!parsed.scheme) {
            return `vocab:${id}`;
        } else if (id.startsWith(base)) {
            return id.replace(base, 'vocab:');
        } else {
            return id;
        }
    }

    /**
     * @description Compacts an id into the vocabulary short id.
     * @export
     * @param {string} id The expanded id to compact.
     * @returns The compacted id.
     */
    export function compact(id: string, base: string) {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is ${id}`);
        }

        if (id.startsWith('vocab:')) {
            return id.replace('vocab:', '');
        } else if (id.startsWith(base)) {
            return id.replace(base, '');
        } else {
            return id;
        }
    }

    /**
     * @description Validates that the id is a valid resource identifier.
     * @export
     * @param {string} id The id to validate.
     */
    export function validateResourceId(id: string) {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is ${id}`);
        }

        if (!resourceIdPattern.test(id)) {
            throw new Errors.InvalidResourceIdError(id);
        }
    }
}

export default Id;
