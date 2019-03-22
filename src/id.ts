import * as urijs from 'uri-js';
import Errors from './errors';

const resourceIdPattern = /^[a-zA-Z][a-zA-Z0-9_//]*[a-zA-Z0-9]$/;

export namespace Id {

    /**
     * @description Expands a vocabulary id.
     * @export
     * @param {string} id The id to expand.
     * @param {boolean} [validate] True to validate the id before expanding
     * @returns
     */
    export function expand(id: string, validate: boolean = false) {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        if (!id.startsWith('xsd:') && validate) {
            validateResourceId(id);
        }

        const parsed = urijs.parse(id, { iri: true });
        if (!parsed.scheme) {
            return `vocab:${id}`;
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
    export function compact(id: string) {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is ${id}`);
        }

        if (id.startsWith('vocab:')) {
            return id.replace('vocab:', '');
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
            throw new Errors.InvalidResourceId(id);
        }
    }
}

export default Id;