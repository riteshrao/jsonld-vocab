/**
 * @description Data type resource in the vocabulary.
 * @export
 * @class DataType
 * @implements {Resource}
 */
export class DataType {

    static AnyURI: DataType = new DataType('xsd:anyURI', 'Any URI', 'URI as defined by RFC 2396.');
    static Base64Binary: DataType = new DataType('xsd:base64Binary', 'Base64 Binary', 'Base64-encoded arbitrary binary data.');
    static Boolean: DataType = new DataType('xsd:boolean', 'Boolean', 'True or False values.');
    static HexBinary: DataType = new DataType('xsd:hexBinary', 'Hex Binary', 'Arbitrary hex-encoded binary data.');
    static Day: DataType = new DataType('xsd:gDay', 'Day', 'Day of the month.');
    static Date: DataType = new DataType('xsd:date', 'Date', 'Calendar date.');
    static DateTime: DataType = new DataType('xsd:dateTime', 'Date Time', 'Specific instance of time.');
    static Decimal: DataType = new DataType('xsd:decimal', 'Decimal', 'Arbitrary precision numbers.');
    static Double: DataType = new DataType('xsd:double', 'Double', 'Double-precision 64-bit floating point numbers.');
    static Duration: DataType = new DataType('xsd:duration', 'Duration', 'Duration of time.');
    static Float: DataType = new DataType('xsd:float', 'Float', 'Single-precision 32-bit floating point numbers.');
    static Int: DataType = new DataType('xsd:int', 'Int', 'Integer with a minimum value of -2147483648 and maximum of 2147483647.');
    static Integer: DataType = new DataType('xsd:integer', 'Integer', 'Integer with a minimum value of -2147483648 and maximum of 2147483647.');
    static Long: DataType = new DataType('xsd:long', 'Long', 'Integer with a minimum value of -9223372036854775808 and maximum of 9223372036854775807');
    static Month: DataType = new DataType('xsd:gMonth', 'Month', 'Month of year.');
    static Short: DataType = new DataType('xsd:short', 'Short', 'Integer with a minimum value of -32768 and maximum of 32767.');
    static String: DataType = new DataType('xsd:string', 'String', 'Character strings.');
    static Time: DataType = new DataType('xsd:time', 'Time', 'Instance of time that recurs every day.');
    static Year: DataType = new DataType('xsd:year', 'Year', 'Year');

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
    private constructor(
        public readonly id: string,
        public readonly label: string,
        public readonly comment: string) { }

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