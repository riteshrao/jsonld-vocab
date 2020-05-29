/**
 * @description Data type resource in the vocabulary.
 * @export
 * @class DataType
 * @implements {Resource}
 */
export class DataType {
    static readonly anyURI: DataType = new DataType('xsd:anyURI', 'Any URI', 'URI as defined by RFC 2396.');
    static readonly base64Binary: DataType = new DataType(
        'xsd:base64Binary',
        'Base64 Binary',
        'Base64-encoded arbitrary binary data.'
    );
    static readonly boolean: DataType = new DataType('xsd:boolean', 'Boolean', 'True or False values.');
    static readonly hexBinary: DataType = new DataType(
        'xsd:hexBinary',
        'Hex Binary',
        'Arbitrary hex-encoded binary data.'
    );
    static readonly day: DataType = new DataType('xsd:gDay', 'Day', 'Day of the month.');
    static readonly date: DataType = new DataType('xsd:date', 'Date', 'Calendar date.');
    static readonly dateTime: DataType = new DataType('xsd:dateTime', 'Date Time', 'Specific instance of time.');
    static readonly decimal: DataType = new DataType('xsd:decimal', 'Decimal', 'Arbitrary precision numbers.');
    static readonly double: DataType = new DataType(
        'xsd:double',
        'Double',
        'Double-precision 64-bit floating point numbers.'
    );
    static readonly duration: DataType = new DataType('xsd:duration', 'Duration', 'Duration of time.');
    static readonly float: DataType = new DataType(
        'xsd:float',
        'Float',
        'Single-precision 32-bit floating point numbers.'
    );
    static readonly int: DataType = new DataType(
        'xsd:int',
        'Int',
        'Integer with a minimum value of -2147483648 and maximum of 2147483647.'
    );
    static readonly integer: DataType = new DataType(
        'xsd:integer',
        'Integer',
        'Integer with a minimum value of -2147483648 and maximum of 2147483647.'
    );
    static readonly long: DataType = new DataType(
        'xsd:long',
        'Long',
        'Integer with a minimum value of -9223372036854775808 and maximum of 9223372036854775807'
    );
    static readonly month: DataType = new DataType('xsd:gMonth', 'Month', 'Month of year.');
    static readonly short: DataType = new DataType(
        'xsd:short',
        'Short',
        'Integer with a minimum value of -32768 and maximum of 32767.'
    );
    static readonly string: DataType = new DataType('xsd:string', 'String', 'Character strings.');
    static readonly time: DataType = new DataType('xsd:time', 'Time', 'Instance of time that recurs every day.');
    static readonly year: DataType = new DataType('xsd:year', 'Year', 'Year');

    private static _all: DataType[];

    /**
     * @description Returns all supported data types.
     * @static
     * @returns
     * @memberof DataType
     */
    static all(): DataType[] {
        if (!DataType._all) {
            DataType._all = Object.keys(DataType).map(x => DataType[x]);
        }
        return DataType._all;
    }

    /**
     * Creates an instance of DataType.
     * @param {string} id The id of the data type.
     * @param {string} label The label of the data type.
     * @param {string} comment The comment of the data type.
     * @memberof DataType
     */
    private constructor(public readonly id: string, public readonly label: string, public readonly comment: string) { }

    /**
     * @description Parses a data type id and returns the represented data type instance.
     * @static
     * @param {string} id The data type id to parse.
     * @returns {DataType}
     * @memberof DataType
     */
    static parse(id: string): DataType {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is ${id}`);
        }

        if (!id.startsWith('xsd:')) {
            return null;
        }

        return DataType.all().find(x => x.id === id);
    }
}

export default DataType;
