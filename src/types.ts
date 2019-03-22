import Iterable from 'jsiterable';
import JsonldGraph from 'jsonld-graph';

import Class from './class';
import Context from './context';
import DataType from './dataType';
import Property from './property';
import Instance from './instance';
import Resource from './resource';

export interface Vocabulary {
    readonly baseIri: string;
    readonly classes: Iterable<Class>;
    readonly contextUri: string;
    readonly context: Context;
    readonly dataTypes: Iterable<DataType>;
    readonly graph: JsonldGraph;
    readonly instances: Iterable<Instance>;
    readonly properties: Iterable<Property>;
    readonly resources: Iterable<Resource>;
    hasDataType(id: string): boolean;
    hasInstance(id: string): boolean;
    hasResource(id: string): boolean;
    getInstance(id: string): Instance;
    getResource(id: string): Resource;
    removeResource(resource: string | Resource): void;
}

export default Vocabulary;