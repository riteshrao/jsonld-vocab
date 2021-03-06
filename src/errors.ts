class VocabularyError extends Error {
    constructor(message: string) {
        super(message);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * @description Error thrown when a syntax error is found when loading a context.
 * @export
 * @class ContextSyntaxError
 * @extends {VocabularyError}
 */
export class ContextSyntaxError extends VocabularyError {
    constructor(public readonly innerError: any) {
        super(`Context syntax error: ${innerError}`);
    }
}

/**
 * @description Error thrown when a duplicate resource id was found.
 * @export
 * @class DuplicateResourceId
 * @extends {VocabularyError}
 */
export class DuplicateResourceError extends VocabularyError {
    /**
     * Creates an instance of DuplicateResourceId.
     * @param {string} id The id of the duplicate resource.
     * @memberof DuplicateResourceId
     */
    constructor(public readonly id: string) {
        super(`Duplicate resource id ${id}. Another resource with the same id already exists.`);
    }
}

/**
 * @description Error thrown when loading duplicate context files.
 * @export
 * @class DuplicateContextError
 * @extends {VocabularyError}
 */
export class DuplicateContextError extends VocabularyError {
    constructor(public readonly uri: string) {
        super(`Another context with the uri ${uri} has already been loaded`);
    }
}

/**
 * @description Error thrown when a duplicate term was found.
 * @export
 * @class DuplicateContextTermError
 * @extends {VocabularyError}
 */
export class DuplicateContextTermError extends VocabularyError {
    /**
     * Creates an instance of DuplicateContextTermError.
     * @param {string} term The duplicate term.
     * @memberof DuplicateContextTermError
     */
    constructor(public readonly term: string) {
        super(`The term ${term} has already been defined`);
    }
}

/**
 * @description Error thrown when a duplicate instance id was found.
 * @export
 * @class DuplicateInstanceError
 * @extends {VocabularyError}
 */
export class DuplicateInstanceError extends VocabularyError {
    /**
     * Creates an instance of DuplicateInstanceError.
     * @param {string} instanceId The duplicate instance id.
     * @memberof DuplicateInstanceError
     */
    constructor(public readonly instanceId: string) {
        super(`Duplicate instance id ${instanceId}. Another instance with the same id already exists`);
    }
}

/**
 * @description Error thrown when the id of an instance is invalid.
 * @export
 * @class InvalidInstanceIdError
 * @extends {VocabularyError}
 */
export class InvalidInstanceIdError extends VocabularyError {
    /**
     * Creates an instance of InvalidInstanceIdError.
     * @param {string} instanceId The invalid instance id.
     * @param {string} details The error details.
     * @memberof InvalidInstanceIdError
     */
    constructor(public readonly instanceId: string, details: string) {
        super(`Invalid id ${instanceId}. Details: ${details}`);
    }
}

/**
 * @description Error thrown when an invalid operation on a target is performed.
 * @export
 * @class InvalidOperationError
 * @extends {VocabularyError}
 */
export class InvalidOperationError extends VocabularyError {
    /**
     * Creates an instance of InvalidOperationError.
     * @param {string} operation The invalid operation.
     * @param {string} targetId The id of the target entity on which the invalid operation was performed.
     * @param {string} targetType The type of the target entity on which the invalid operation was performed.
     * @param {string} description Error description.
     * @memberof InvalidOperationError
     */
    constructor(
        public readonly operation: string,
        public readonly targetId: string,
        public readonly targetType: string,
        description: string
    ) {
        super(`Invalid operation ${operation} on ${targetId} of type ${targetType}. Error: ${description}`);
    }
}

/**
 * @description Error thrown when an invalid resource id is found.
 * @export
 * @class InvalidResourceId
 * @extends {VocabularyError}
 */
export class InvalidResourceIdError extends VocabularyError {
    /**
     * Creates an instance of InvalidResourceId.
     * @param {string} resourceId The invalid resource id.
     * @memberof InvalidResourceId
     */
    constructor(public readonly resourceId: string) {
        super(
            `The resource identifier ${resourceId} is not valid. Only alpha-numeric characters along with the - * _ special characters allow as part of a resource identifier`
        );
    }
}

/**
 * @description Error thrown when an instance class is required.
 * @export
 * @class InstanceClassRequired
 * @extends {VocabularyError}
 */
export class InstanceClassRequiredError extends VocabularyError {
    /**
     * Creates an instance of InstanceClassRequired.
     * @param {string} instanceId The id of the instance that raised the error.
     * @memberof InstanceClassRequired
     */
    constructor(public readonly instanceId: string) {
        super(`At least one class is required for instance ${instanceId}`);
    }
}

/**
 * @description Error thrown when an expected property on an instance is not found
 * @export
 * @class InstancePropertyNotFoundError
 * @extends {VocabularyError}
 */
export class InstancePropertyNotFoundError extends VocabularyError {
    /**
     * Creates an instance of InstancePropertyNotFoundError.
     * @param {string} instanceId The id of the instance that generated the error.
     * @param {string} propertyId The id of the property that was not found.
     * @memberof InstancePropertyNotFoundError
     */
    constructor(public readonly instanceId: string, public readonly propertyId: string) {
        super(`Property ${propertyId} not found on instance ${instanceId}`);
    }
}

/**
 * @description Error thrown when a value error occurs for an instance property.
 * @export
 * @class InstancePropertyValueError
 * @extends {VocabularyError}
 */
export class InstancePropertyValueError extends VocabularyError {
    /**
     * Creates an instance of InstancePropertyValueError.
     * @param {string} instanceId The id of the instance that generated the error.
     * @param {string} propertyId The id of the property for which this error occurred.
     * @param {string} details
     * @memberof InstancePropertyValueError
     */
    constructor(public readonly instanceId: string, public readonly propertyId: string, details: string) {
        super(`Invalid operation on container property ${propertyId} for instance ${instanceId}. Details: ${details}`);
    }
}

/**
 * @description Error thrown when an instance is not found.
 * @export
 * @class InstanceNotFoundError
 * @extends {VocabularyError}
 */
export class InstanceNotFoundError extends VocabularyError {
    /**
     * Creates an instance of InstanceNotFoundError.
     * @param {string} instanceId Id of the instance that was not found.
     * @memberof InstanceNotFoundError
     */
    constructor(public readonly instanceId: string) {
        super(`An instance with id ${instanceId} was not found.`);
    }
}

/**
 * @description Error thrown when the type of an instance is not of an expected type.
 * @export
 * @class InstanceTypeMismatchError
 * @extends {VocabularyError}
 */
export class InstanceTypeMismatchError extends VocabularyError {
    /**
     * Creates an instance of InstanceTypeMismatchError.
     * @param {string} instanceId The id of the instance with the type mismatch error.
     * @memberof InstanceTypeMismatchError
     */
    constructor(public readonly instanceId: string) {
        super(`Invalid instance ${instanceId}. The type of the instance is not a valid class`);
    }
}

/**
 * @description Error thrown when operation on a property expected the term of the property to be defined.
 * @export
 * @class PropertyTermNotDefinedError
 * @extends {VocabularyError}
 */
export class PropertyTermNotDefinedError extends VocabularyError {
    /**
     * Creates an instance of PropertyTermNotDefinedError.
     * @param {string} propertyId The id of the property whose term is not been defined.
     * @memberof PropertyTermNotDefinedError
     */
    constructor(public readonly propertyId: string) {
        super(`Required a term for the property ${propertyId} not defined.`);
    }
}

/**
 * @description Error thrown when a resource was not found.
 * @export
 * @class ResourceNotFound
 * @extends {VocabularyError}
 */
export class ResourceNotFoundError extends VocabularyError {
    /**
     * Creates an instance of ResourceNotFound.
     * @param {string} id The id of the resource.
     * @param {string} type The resource type.
     * @memberof ResourceNotFound
     */
    constructor(public readonly id: string, public readonly type: string) {
        super(`A resource of type ${type} with id ${id} was not found`);
    }
}

/**
 * @description Error throw when the expected type of a resource does not match.
 * @export
 * @class ResourceTypeMismatchError
 * @extends {VocabularyError}
 */
export class ResourceTypeMismatchError extends VocabularyError {
    /**
     * Creates an instance of ResourceTypeMismatchError.
     * @param {string} resourceId The id of the resource.
     * @param {string} expectedType The expected type of the resource.
     * @param {string} actualType The actual type of the resource.
     * @memberof ResourceTypeMismatchError
     */
    constructor(
        public readonly resourceId: string,
        public readonly expectedType: string,
        public readonly actualType: string
    ) {
        super(`Resource ${resourceId} type mismatch. Expected type ${expectedType} but found type ${actualType}`);
    }
}

/**
 * @description Error thrown when a resource type is not supported.
 * @export
 * @class UnknownResourceTypeError
 * @extends {VocabularyError}
 */
export class UnsupportedResourceTypeError extends VocabularyError {
    /**
     * Creates an instance of UnsupportedResourceTypeError.
     * @param {string} id The id of the resource whose type is not supported.
     * @param {string} types The type(s) of the resource.
     * @memberof UnsupportedResourceTypeError
     */
    constructor(public readonly id: string, public readonly types: string) {
        super(`Resource ${id} type(s) not supported. Types: ${types}`);
    }
}
