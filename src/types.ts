/**
 * Internal typings. DO NOT EXPORT AS IS
 */

import Iterable from 'jsiterable';
import JsonldGraph from 'jsonld-graph';

import Class from './class';
import Context from './context';
import DataType from './dataType';
import Property from './property';
import Instance from './instance';
import Resource from './resource';

export type ClassReference = string | Class;
export type PropertyReference = string | Property;
export type ResourceReference = string | Resource;
export type InstanceReference = string | Instance;

export interface LanguageMap {
    value: string;
    language?: string;
}

export interface InstanceProvider {
    getInstance<T = void>(id: string): Instance & T;
}

export interface Vocabulary extends InstanceProvider {
    readonly baseIri: string;
    readonly classes: Iterable<Class>;
    readonly contextUri: string;
    readonly context: Context;
    readonly dataTypes: Iterable<DataType>;
    readonly graph: JsonldGraph;
    readonly instances: Iterable<Instance>;
    readonly properties: Iterable<Property>;
    readonly resources: Iterable<Resource>;
    createClass(id: string): Class;
    createProperty(id: string): Property;
    createInstance<T = Instance>(id: string, ...classTypes: ClassReference[]): T;
    getClass(id: string): Class;
    getEntity(id: string): Resource | Instance;
    getProperty(id: string): Property;
    getResource(id: string): Resource;
    hasDataType(id: string): boolean;
    hasInstance(id: string): boolean;
    hasResource(id: string): boolean;
    removeClass(classReference: ClassReference, deleteOwnedProps?: boolean): void;
    removeInstance(instanceRef: InstanceReference): void;
    removeProperty(propertyRef: PropertyReference): void;
    removeResource(resourceRef: ResourceReference): void;
}

export default Vocabulary;
