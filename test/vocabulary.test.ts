// tslint:disable-next-line: no-import-side-effect
import 'mocha';
import { expect } from 'chai';
import {
    Class,
    Errors,
    Instance,
    Property,
    Vocabulary,
} from '../src';

const testContext = require('./samples/context.json');
const testVocabulary = require('./samples/vocabulary.json');

const invalidIds = [
    '_startsWith',
    'endsWith_',
    '0startsWith',
    'endsWith/',
    '/startsWith',
    'starts*With'
];

describe('Vocabulary', () => {

    let vocabulary: Vocabulary;

    describe('.classes', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should return all classes defined in the vocabulary', () => {
            const classes = [...vocabulary.classes];
            expect(classes.length).to.equal(7);
            expect(classes.some(x => x.id === 'Project')).to.be.true;
            expect(classes.some(x => x.id === 'Department')).to.be.true;
            expect(classes.some(x => x.id === 'Location')).to.be.true;
            expect(classes.some(x => x.id === 'Person')).to.be.true;
            expect(classes.some(x => x.id === 'Person')).to.be.true;
            expect(classes.some(x => x.id === 'Employee')).to.be.true;
            expect(classes.some(x => x.id === 'Manager')).to.be.true;
        });
    });

    describe('.instances', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should get all instances in the vocabulary', () => {
            const instances = [...vocabulary.instances];
            expect(instances.some(x => x.id === 'Department/deptA')).to.be.true;
            expect(instances.some(x => x.id === 'Department/deptB')).to.be.true;
        });
    });

    describe('.properties', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should get all properties across all classes in the vocabulary', () => {
            const properties = [...vocabulary.properties];
            expect(properties.some(x => x.id === 'Person/firstName')).to.be.true;
            expect(properties.some(x => x.id === 'Manager/manages')).to.be.true;
        });
    });

    describe('.resources', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should get all class and property resources in the vocabulary', () => {
            const resources = [...vocabulary.resources];
            expect(resources.length).to.equal(21);
        });
    });

    describe('.createClass', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should throw when id is undefined, null or empty', () => {
            expect(() => vocabulary.createClass(undefined)).to.throw(ReferenceError);
            expect(() => vocabulary.createClass(null)).to.throw(ReferenceError);
            expect(() => vocabulary.createClass('')).to.throw(ReferenceError);
        });

        it('should throw when id is invalid', () => {
            for (const invalidId of invalidIds) {
                expect(() => vocabulary.createClass(invalidId)).to.throw(Errors.InvalidResourceIdError);
            }
        });

        it('should throw when another class with the same id already exists', () => {
            expect(() => vocabulary.createClass('Person')).to.throw(Errors.DuplicateResourceError);
        });

        it('should throw when another property with the same id already exists', () => {
            expect(() => vocabulary.createClass('Person/firstName')).to.throw(Errors.DuplicateResourceError);
        });

        it('should throw when creating a class with a data type id', () => {
            expect(() => vocabulary.createClass('xsd:string')).to.throw(Errors.DuplicateResourceError);
        });

        it('should throw when another instance with the same id already exists', () => {
            expect(() => vocabulary.createClass('Department/deptA')).to.throw(Errors.DuplicateResourceError);
        });

        it('should create class', () => {
            const classType = vocabulary.createClass('Test');
            expect(classType).to.be.ok;
            expect(classType.id).to.equal('Test');
            expect(vocabulary.hasResource('Test'));
        });
    });

    describe('.createInstance', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should throw when id is undefined, null or empty', () => {
            expect(() => vocabulary.createInstance(undefined, 'Person')).to.throw(ReferenceError);
            expect(() => vocabulary.createInstance(null, 'Person')).to.throw(ReferenceError);
            expect(() => vocabulary.createInstance('', 'Person')).to.throw(ReferenceError);
        });

        it('should throw when class type is not specified', () => {
            expect(() => vocabulary.createInstance('TestInstance', null)).to.throw(ReferenceError);
            expect(() => vocabulary.createInstance('TestInstance', ...[] as any)).to.throw(ReferenceError);
        });

        it('should throw when class type is not found', () => {
            expect(() => vocabulary.createInstance('TestInstance', 'Foobar')).to.throw(Errors.ResourceNotFoundError);
            expect(() => vocabulary.createInstance('TestInstance', 'Foobar', 'Person')).to.throw(Errors.ResourceNotFoundError);
        });

        it('should throw when instance is is invalid', () => {
            for (const invalidId of invalidIds) {
                expect(() => vocabulary.createInstance(invalidId, 'Person')).to.throw(Errors.InvalidResourceIdError);
            }
        });

        it('should create instance of class', () => {
            const instance = vocabulary.createInstance('TestPerson', 'Person');
            expect(instance).to.be.ok;
            expect(instance).to.be.instanceOf(Instance);
            expect(instance.isInstanceOf('Person'));
            expect(vocabulary.hasInstance('TestPerson')).to.be.true;
        });

        it('should create instance of multiple classes', () => {
            const instance = vocabulary.createInstance('TestManager', 'Manager', 'Contractor');
            expect(instance).to.be.ok;
            expect(instance).to.be.instanceOf(Instance);
            expect(instance.isInstanceOf('Manager')).to.be.true;
            expect(instance.isInstanceOf('Contractor')).to.be.true;
            expect(vocabulary.hasInstance('TestManager')).to.be.true;
        });
    });

    describe('.createProperty', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should throw when id is undefined, null or empty', () => {
            expect(() => vocabulary.createProperty(undefined)).to.throw(ReferenceError);
            expect(() => vocabulary.createProperty(null)).to.throw(ReferenceError);
            expect(() => vocabulary.createProperty('')).to.throw(ReferenceError);
        });

        it('should throw when id is invalid', () => {
            for (const invalidId of invalidIds) {
                expect(() => vocabulary.createProperty(invalidId)).to.throw(Errors.InvalidResourceIdError);
            }
        });

        it('should throw when another property with the same id already exists', () => {
            expect(() => vocabulary.createProperty('Person/firstName')).to.throw(Errors.DuplicateResourceError);
        });

        it('should throw when another resource with the same id already exists', () => {
            expect(() => vocabulary.createProperty('Person')).to.throw(Errors.DuplicateResourceError);
        });

        it('should throw when creating a property with a data type id', () => {
            expect(() => vocabulary.createProperty('xsd:string')).to.throw(Errors.DuplicateResourceError);
        });

        it('should throw when another instance with the same id already exists', () => {
            expect(() => vocabulary.createProperty('Department/deptA')).to.throw(Errors.DuplicateResourceError);
        });

        it('should create class', () => {
            const property = vocabulary.createProperty('Department/foo');
            expect(property).to.be.ok;
            expect(property.id).to.equal('Department/foo');
            expect(vocabulary.hasResource('Department/foo'));
        });
    });

    describe('.getInstance', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should throw when id is undefined, null or empty', () => {
            expect(() => vocabulary.getInstance(undefined)).to.throw(ReferenceError);
            expect(() => vocabulary.getInstance(null)).to.throw(ReferenceError);
            expect(() => vocabulary.getInstance('')).to.throw(ReferenceError);
        });

        it('should return undefined when class id is specified', () => {
            expect(vocabulary.getInstance('Person')).to.be.undefined;
        });

        it('should return undefined when property id is specified', () => {
            expect(vocabulary.getInstance('Person/firstName')).to.be.undefined;
        });

        it('should return undefined when data type id is specified', () => {
            expect(vocabulary.getInstance('xsd:string')).to.be.undefined;
        });

        it('should return undefined when instance does not not exist', () => {
            expect(vocabulary.getInstance('DoesNotExist')).to.be.undefined;
        });

        it('should return instance from vocabulary', () => {
            const instance = vocabulary.getInstance('Department/deptA');
            expect(instance).to.be.ok;
            expect(instance).to.be.instanceOf(Instance);
            expect(instance.id).to.equal('Department/deptA');
        });
    });

    describe('.getInstancesOf', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should throw when class reference is undefined, null or empty', () => {
            expect(() => vocabulary.getInstancesOf(undefined)).to.throw(ReferenceError);
            expect(() => vocabulary.getInstancesOf(null)).to.throw(ReferenceError);
            expect(() => vocabulary.getInstancesOf('')).to.throw(ReferenceError);
        });

        it('should throw when class reference is not found', () => {
            expect(() => vocabulary.getInstancesOf('DoesNotExist')).to.throw(Errors.ResourceNotFoundError);
        });

        it('should return empty when no instances are found', () => {
            const instances = [...vocabulary.getInstancesOf('Person')];
            expect(instances.length).to.equal(0);
        });

        it('should return instances of class', () => {
            const instances = [...vocabulary.getInstancesOf('Manager')];
            expect(instances.length).to.equal(2);
            expect(instances[0].id).to.equal('Manager/managerA');
        });

        it('should return descendant instances of class', () => {
            const instances = [...vocabulary.getInstancesOf('Person', true)];
            expect(instances.length).to.equal(2);
            expect(instances[0].id).to.equal('Manager/managerA');
        });
    });

    describe('.getProperty', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should throw when property id is undefined, null or empty', () => {
            expect(() => vocabulary.getProperty(undefined)).to.throw(ReferenceError);
            expect(() => vocabulary.getProperty(null)).to.throw(ReferenceError);
            expect(() => vocabulary.getProperty('')).to.throw(ReferenceError);
        });

        it('should throw when id is class id', () => {
            expect(() => vocabulary.getProperty('Person')).to.throw(Errors.ResourceTypeMismatchError);
        });

        it('should throw when id is data type id', () => {
            expect(() => vocabulary.getProperty('xsd:string')).to.throw(Errors.ResourceTypeMismatchError);
        });

        it('should return null when property is not found', () => {
            expect(vocabulary.getProperty('DoesNotExist')).to.be.null;
        });

        it('should return property', () => {
            const property = vocabulary.getProperty('Person/firstName');
            expect(property).to.be.ok;
            expect(property).to.be.instanceOf(Property);
        });
    });

    describe('.getResource', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should throw when property id is undefined, null or empty', () => {
            expect(() => vocabulary.getResource(undefined)).to.throw(ReferenceError);
            expect(() => vocabulary.getResource(null)).to.throw(ReferenceError);
            expect(() => vocabulary.getResource('')).to.throw(ReferenceError);
        });

        it('should throw when id is data type id', () => {
            expect(() => vocabulary.getResource('xsd:string')).to.throw(Errors.ResourceTypeMismatchError);
        });

        it('should throw when id is instance id', () => {
            expect(() => vocabulary.getResource('Department/deptA')).to.throw(Errors.ResourceTypeMismatchError);
        });

        it('should return null when resource is not found', () => {
            expect(vocabulary.getResource('DoesNotExist')).to.be.null;
        });

        it('should return property', () => {
            const property = vocabulary.getResource('Person/firstName');
            expect(property).to.be.ok;
            expect(property).to.be.instanceOf(Property);
        });

        it('should return class', () => {
            const property = vocabulary.getResource('Person');
            expect(property).to.be.ok;
            expect(property).to.be.instanceOf(Class);
        });
    });

    describe('.context', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should be able to load context with references', () => {
            vocabulary.context.load('http://test/context', {
                '@context': [
                    'http://example.org/context',
                    {
                        test: 'Test/Term'
                    }
                ]
            });
        });
    });

    describe('.hasDataType', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should throw when id is undefined, null or empty', () => {
            expect(() => vocabulary.hasDataType(undefined)).to.throw(ReferenceError);
            expect(() => vocabulary.hasDataType(null)).to.throw(ReferenceError);
            expect(() => vocabulary.hasDataType('')).to.throw(ReferenceError);
        });

        it('should return false for unknown data type', () => {
            expect(vocabulary.hasDataType('xsd:unknown')).to.equal(false);
        });

        it('should return true for known data types', () => {
            expect(vocabulary.hasDataType('xsd:string')).to.equal(true);
            expect(vocabulary.hasDataType('xsd:date')).to.equal(true);
        });
    });

    describe('.hasInstance', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should throw when id is undefined, null or empty', () => {
            expect(() => vocabulary.hasInstance(undefined)).to.throw(ReferenceError);
            expect(() => vocabulary.hasInstance(null)).to.throw(ReferenceError);
            expect(() => vocabulary.hasInstance('')).to.throw(ReferenceError);
        });

        it('should return false for unknown id', () => {
            expect(vocabulary.hasInstance('IUnkown')).to.equal(false);
        });

        it('should return false when id is for class or property', () => {
            expect(vocabulary.hasInstance('Person')).to.equal(false);
            expect(vocabulary.hasInstance('Person/firstName')).to.equal(false);
        });
    });

    describe('.hasResource', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should throw when id is undefined, null or empty', () => {
            expect(() => vocabulary.hasResource(undefined)).to.throw(ReferenceError);
            expect(() => vocabulary.hasResource(null)).to.throw(ReferenceError);
            expect(() => vocabulary.hasResource('')).to.throw(ReferenceError);
        });

        it('should return false when resource does not exist', () => {
            expect(vocabulary.hasResource('notFound')).to.equal(false);
        });

        it('should return false when id is instance id', () => {
            expect(vocabulary.hasResource('Department/deptA')).to.equal(false);
            expect(vocabulary.hasResource('http://example.org/classes/Department/deptA')).to.equal(false);
        });

        it('should return true for class id', () => {
            expect(vocabulary.hasResource('Manager')).to.equal(true);
        });

        it('should return true for property id', () => {
            expect(vocabulary.hasResource('Person/firstName')).to.equal(true);
        });
    });

    describe('.removeClass', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should throw when class reference is undefined, null or empty', () => {
            expect(() => vocabulary.removeClass(undefined)).to.throw(ReferenceError);
            expect(() => vocabulary.removeClass(null)).to.throw(ReferenceError);
            expect(() => vocabulary.removeClass('')).to.throw(ReferenceError);
        });

        it('should throw when class does not exist', () => {
            expect(() => vocabulary.removeClass('DoesNotExist')).to.throw(Errors.ResourceNotFoundError);
        });

        it('should throw when class is sub-classed', () => {
            expect(() => vocabulary.removeClass('Person')).to.throw(Errors.InvalidOperationError);
        });

        it('should remove class and all owned properties', () => {
            vocabulary.removeClass('Department');
            expect(vocabulary.hasResource('Department')).to.equal(false);
            expect(vocabulary.hasResource('Department/name')).to.equal(false);
            expect(vocabulary.hasResource('Department/location')).to.equal(false);
            expect(vocabulary.hasResource('Department/phoneNo')).to.equal(false);
        });

        it('should remove instances of class', () => {
            vocabulary.removeClass('Manager');
            expect(vocabulary.hasInstance('Manager/managerA')).to.equal(false);
            expect(vocabulary.hasInstance('Manager/managerB')).to.equal(true);
            expect(vocabulary.getInstance('Manager/managerB').isInstanceOf('Manager')).to.equal(false);
        });
    });

    describe('.removeInstance', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should throw when instance reference is undefined, null or empty', () => {
            expect(() => vocabulary.removeInstance(undefined)).to.throw(ReferenceError);
            expect(() => vocabulary.removeInstance(null)).to.throw(ReferenceError);
            expect(() => vocabulary.removeInstance('')).to.throw(ReferenceError);
        });

        it('should throw when instance is not found', () => {
            expect(() => vocabulary.removeInstance('DoesNotExist')).to.throw(Errors.InstanceNotFoundError);
        });

        it('should throw when attempting to remove a resource', () => {
            expect(() => vocabulary.removeInstance('Manager')).to.throw(Errors.InstanceNotFoundError);
            expect(() => vocabulary.removeInstance('Manager/manages')).to.throw(Errors.InstanceNotFoundError);
        });

        it('should remove instance from a resource', () => {
            vocabulary.removeInstance('Manager/managerA');
            expect(vocabulary.hasInstance('Manager/managerA')).to.be.false;
        });
    });

    describe('.removeProperty', () => {
        before(async () => {
            vocabulary = await loadVocabulary();
        });

        it('should throw when property reference is undefined, null or empty', () => {
            expect(() => vocabulary.removeProperty(undefined)).to.throw(ReferenceError);
            expect(() => vocabulary.removeProperty(null)).to.throw(ReferenceError);
            expect(() => vocabulary.removeProperty('')).to.throw(ReferenceError);
        });

        it('should throw when property does not exist', () => {
            expect(() => vocabulary.removeProperty('DoesNotExist')).to.throw(Errors.ResourceNotFoundError);
        });

        it('should throw when property is referenced by class', () => {
            expect(() => vocabulary.removeProperty('Manager/manages')).to.throw(Errors.InvalidOperationError);
        });

        it('should remove un-referenced property', () => {
            vocabulary.getClass('Manager').removeProperty('Manager/manages');
            expect(vocabulary.hasResource('Manager/manages')).to.equal(true);

            vocabulary.removeProperty('Manager/manages');
            expect(vocabulary.hasResource('Manager/manages')).to.equal(false);
        });
    });

    async function loadVocabulary(): Promise<Vocabulary> {
        const vocabulary = new Vocabulary('http://example.org/classes/', 'http://example.org/class/context');
        vocabulary.context.load('http://example.org/context', testContext);
        await vocabulary.load(testVocabulary);
        return vocabulary;
    }
});