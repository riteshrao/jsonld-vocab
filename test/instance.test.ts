import 'mocha';
import { expect } from 'chai';
import { Vocabulary, Document, Errors, ContainerPropertyValues, Instance } from '../src';

const testContext = require('./samples/context.json');
const testClasses = require('./samples/vocabulary.json');
const testInstances = require('./samples/instances.json');

describe('Instance', () => {

    let vocabulary: Vocabulary;


    beforeEach(async () => {
        vocabulary = new Vocabulary('http://example.org/classes/', 'http://example.org/class/context');
        vocabulary.context.load('http://example.org/context', testContext);
        await vocabulary.load(testClasses);
    });

    describe('.classes', () => {
        let document: Document;

        beforeEach(async () => {
            document = new Document(vocabulary);
            await document.load(testInstances);
        });

        it('should return all classes of an instance', () => {
            const instance = document.getInstance('urn:example.org:employees/jdoe');
            expect(instance.classes.count()).to.equal(2);
            expect(instance.classes.some(x => x.id === 'Employee')).to.be.true;
        });
    });

    describe('.properties', () => {
        let document: Document;

        beforeEach(async () => {
            document = new Document(vocabulary);
            await document.load(testInstances);
        });

        it('should return all properties of the class', () => {
            const instance = document.getInstance('urn:example.org:employees/jdoe');
            const properties = [...instance.properties];
            expect(properties.length).to.equal(8);
            expect(properties.some(x => x.id === 'Person/firstName')).to.be.true;
            expect(properties.some(x => x.id === 'Person/lastName')).to.be.true;
            expect(properties.some(x => x.id === 'Person/location')).to.be.true;
            expect(properties.some(x => x.id === 'Employee/level')).to.be.true;
            expect(properties.some(x => x.id === 'Employee/department')).to.be.true;
            expect(properties.some(x => x.id === 'Employee/manager')).to.be.true;
        });
    });

    describe('.referrers', () => {
        let document: Document;

        beforeEach(async () => {
            document = new Document(vocabulary);
            await document.load(testInstances);
        });

        it('should get referrers of instance', () => {
            const instance = document.getInstance('urn:example.org:locations/nashua');
            const referrers = [...instance.referrers];
            expect(referrers.length).to.equal(3);
            expect(referrers.some(referrer => referrer.instance.id === 'urn:example.org:employees/jilld')).to.be.true;
            expect(referrers.some(referrer => referrer.instance.id === 'urn:example.org:employees/janed')).to.be.true;
            expect(referrers.some(referrer => referrer.instance.id === 'urn:example.org:departments/finance')).to.be.true;
        });

        it('should return empty when instance has no referrers', () => {
            const instance = document.getInstance('urn:example.org:employees/jdoe');
            expect(instance.referrers.count()).to.equal(0);
            expect(instance.referrers.items()).to.be.empty;
        });
    });

    describe('.getProperty', () => {
        let document: Document;

        beforeEach(async () => {
            document = new Document(vocabulary);
            await document.load(testInstances);
        });

        it('should throw when property reference is undefined, null or empty', () => {
            const instance = document.getInstance('urn:example.org:locations/nashua');
            expect(() => instance.getProperty(undefined)).to.throw(ReferenceError);
            expect(() => instance.getProperty(null)).to.throw(ReferenceError);
            expect(() => instance.getProperty('')).to.throw(ReferenceError);
        });

        it('should get property from single class type instance', () => {
            const instance = document.getInstance('urn:example.org:employees/jdoe');
            const property = instance.getProperty('Person/firstName');
            expect(property).to.be.ok;
            expect(property.id).to.equal('Person/firstName');
            expect(property.label).to.equal('First Name');
        });

        it('should get property from multiple class type instance', () => {
            const instance = document.getInstance('urn:example.org:employees/janed');
            expect(instance.getProperty('Person/firstName')).to.be.ok;
            expect(instance.getProperty('Contractor/company')).to.be.ok;
            expect(instance.getProperty('Manager/manages')).to.be.ok;
            expect(instance.getProperty('Manager/project')).to.be.ok;
        });
    });

    describe('.getReferrers', () => {
        let document: Document;

        beforeEach(async () => {
            document = new Document(vocabulary);
            await document.load(testInstances);
        });

        it('should throw when property reference is undefined, null or empty', () => {
            const instance = document.getInstance('urn:example.org:locations/nashua');
            expect(() => instance.getReferrers(undefined)).to.throw(ReferenceError);
            expect(() => instance.getReferrers(null)).to.throw(ReferenceError);
            expect(() => instance.getReferrers('')).to.throw(ReferenceError);
        });

        it('should throw not fund when property is not found', () => {
            const instance = document.getInstance('urn:example.org:locations/nashua');
            expect(() => instance.getReferrers('DoesNotExist')).to.throw(Errors.ResourceNotFoundError);
        });

        it('should get referrers with specified incoming property', () => {
            const instance = document.getInstance('urn:example.org:locations/nashua');
            const departments = [...instance.getReferrers('Department/location')];
            const persons = [...instance.getReferrers('Person/location')];

            expect(departments.length).to.equal(1);
            expect(departments.some(x => x.id === 'urn:example.org:departments/finance')).to.be.true;

            expect(persons.length).to.equal(2);
            expect(persons.some(x => x.id === 'urn:example.org:employees/jilld')).to.be.true;
            expect(persons.some(x => x.id === 'urn:example.org:employees/janed')).to.be.true;
        });
    });

    describe('.isInstanceOf', () => {
        let document: Document;

        beforeEach(async () => {
            document = new Document(vocabulary);
            await document.load(testInstances);
        });

        it('should throw when class reference is undefined, null or empty', () => {
            const instance = document.getInstance('urn:example.org:employees/janed');
            expect(() => instance.isInstanceOf(undefined)).to.throw(ReferenceError);
            expect(() => instance.isInstanceOf(null)).to.throw(ReferenceError);
            expect(() => instance.isInstanceOf('')).to.throw(ReferenceError);
        });

        it('should return false when instance is instance of class', () => {
            const instance = document.getInstance('urn:example.org:employees/janed');
            expect(instance.isInstanceOf('Contractor')).to.be.true;
            expect(instance.isInstanceOf('Manager')).to.be.true;
        });

        it('should return true when instance is descendant of class', () => {
            const instance = document.getInstance('urn:example.org:employees/janed');
            expect(instance.isInstanceOf('Person')).to.be.true;
        });
    });

    describe('.removeClass', () => {
        let document: Document;

        beforeEach(async () => {
            document = new Document(vocabulary);
            await document.load(testInstances);
        });

        it('should throw when class reference is undefined, null, or empty', () => {
            const instance = document.getInstance('urn:example.org:locations/scranton');
            expect(() => instance.removeClass(undefined)).to.throw(ReferenceError);
            expect(() => instance.removeClass(null)).to.throw(ReferenceError);
            expect(() => instance.removeClass('')).to.throw(ReferenceError);
        });

        it('should do nothing when instance is not of specified type', () => {
            const instance = document.getInstance('urn:example.org:employees/janed');
            instance.removeClass('Location');
            expect(instance.isInstanceOf('Person')).to.be.true;
            expect(instance.isInstanceOf('Manager')).to.be.true;
        });

        it('should throw when instance is only type of class being removed', () => {
            const instance = document.getInstance('urn:example.org:locations/nashua');
            expect(() => instance.removeClass('Location')).to.throw(Errors.InstanceClassRequiredError);
        });

        it('should remove class and class properties from instance', () => {
            const instance = document.getInstance<Employee>('urn:example.org:employees/janed');
            instance.removeClass('Manager');

            expect(instance.isInstanceOf('Manager')).to.be.false;
            expect(instance.isInstanceOf('Contractor')).to.be.true;
            expect(instance.properties.some(x => x.id === 'Manager/manages')).to.be.false;
            expect(instance.properties.some(x => x.id === 'Employee/department')).to.be.false;

            expect(document
                .getInstance('urn:example.org:locations/nashua')
                .referrers
                .some(x => x.instance.id === 'urn:example.org:employees/janed')).to.be.true;

            expect(document
                .getInstance('urn:example.org:departments/hr')
                .referrers
                .some(x => x.instance.id === 'urn:example.org:employees/janed')).to.be.false;
        });
    });

    describe('.setClass', () => {
        let document: Document;

        beforeEach(async () => {
            document = new Document(vocabulary);
            await document.load(testInstances);
        });

        it('should throw when class reference is undefined, null or empty', () => {
            const instance = document.getInstance('urn:example.org:employees/jilld');
            expect(() => instance.setClass(undefined)).to.throw(ReferenceError);
            expect(() => instance.setClass(null)).to.throw(ReferenceError);
            expect(() => instance.setClass('')).to.throw(ReferenceError);
        });

        it('should throw when class reference is not found', () => {
            const instance = document.getInstance('urn:example.org:employees/jilld');
            expect(() => instance.setClass('NotFound')).to.throw(Errors.ResourceNotFoundError);
        });

        it('should throw when setting class to a non-class type', () => {
            const instance = document.getInstance('urn:example.org:employees/jilld');
            expect(() => instance.setClass('Person/firstName')).to.throw(Errors.ResourceTypeMismatchError);
        });

        it('should do nothing when instance is already type of class', () => {
            const instance = document.getInstance('urn:example.org:employees/jilld');
            instance.setClass('Employee');
            expect(instance.classes.count()).to.equal(1);
            expect(instance.classes.first().id).to.equal('Employee');
        });

        it('should make instance type of class', () => {
            const instance = document.getInstance('urn:example.org:employees/jilld');
            instance.setClass('Contractor');
            expect(instance.classes.count()).to.equal(2);
            expect(instance.classes.some(x => x.id === 'Contractor')).to.be.true;
            expect(instance.properties.some(x => x.id === 'Contractor/company')).to.be.true;
        });
    });

    describe('.toJson', () => {
        let document: Document;

        beforeEach(async () => {
            document = new Document(vocabulary);
            await document.load(testInstances);
        });

        it('should return json representation of instance', async () => {
            const instance = document.getInstance('urn:example.org:employees/jdoe');
            const json = await instance.toJson({ context: 'http://example.org/context' });

            expect(json).to.be.ok;
            expect(json['@id']).to.equal('urn:example.org:employees/jdoe');
            expect(json['@type']).to.be.instanceOf(Array);
            expect(json['@type'].length).to.equal(2);
            expect(json['@type'].some((x: string) => x === 'Employee')).to.be.true;
            expect(json['@type'].some((x: string) => x === 'Manager')).to.be.true;
            expect(json.firstName).to.eq('John');
            expect(json.lastName).to.equal('Doe');
            expect(json.level).to.equal(1);
        });

        it('should return json with inline references', async () => {
            const instance = document.getInstance('urn:example.org:employees/jilld');
            const json: Employee = await instance.toJson({ context: 'http://example.org/context' });

            expect(json).to.be.ok;
            expect(json.firstName).to.equal('Jill');
            expect(json.lastName).to.equal('Doe');
            expect(json.location).to.be.ok;
            expect(json.location['@id']).to.equal('urn:example.org:locations/nashua');
            expect(json.location.address).to.equal('Nashua, NH');
            expect(json.department).to.be.ok;
            expect(json.department.name).to.equal('Finance');
            expect(json.department.deptLocation).to.be.ok;
            expect(json.department.deptLocation).to.equal('urn:example.org:locations/nashua');
            expect(json.manager).to.be.ok;
            expect(json.manager['@id']).to.equal('urn:example.org:employees/janed');
            expect(json.manager.firstName).to.equal('Jane');
            expect(json.manager.lastName).to.equal('Doe');
        });

        it('should return json with containers as arrays', async () => {
            const instance = document.getInstance<Manager>('urn:example.org:employees/jdoe');
            instance.manages.add(document.getInstance('urn:example.org:employees/jilld'));

            const json = await instance.toJson({ context: 'http://example.org/context' });
            expect(json).to.be.ok;
            expect(json['@id']).to.equal('urn:example.org:employees/jdoe');
            expect(json.firstName).to.equal('John');
            expect(json.lastName).to.equal('Doe');
            expect(json.level).to.equal(1);
            expect(json.manages).to.be.instanceOf(Array);
            expect(json.manages.length).to.equal(1);
            expect(json.manages[0]['@id']).to.equal('urn:example.org:employees/jilld');
            expect(json.manages[0].firstName).to.equal('Jill');
            expect(json.manages[0].location).to.be.ok;
            expect(json.manages[0].location.address).to.equal('Nashua, NH');
        });
    });

    describe('.values', () => {
        let document: Document;

        beforeEach(async () => {
            document = new Document(vocabulary);
            await document.load(testInstances);
        });

        beforeEach(() => {
            document.createInstance('Location', 'urn:example.org:locations/testLocation1');
            document.createInstance('Location', 'urn:example.org:locations/testLocation2');
            document.createInstance('Department', 'urn:example.org:departments/testDepartment1');
            document.createInstance('Department', 'urn:example.org:departments/testDepartment2');
            document.createInstance('Employee', 'urn:example.org:employees/testEmployee1');
            document.createInstance('Employee', 'urn:example.org:employees/testEmployee2');
            document.createInstance('Manager', 'urn:example.org:employees/testManager1');
            document.createInstance('Manager', 'urn:example.org:employees/testManager2');
        });

        it('can get and set primitive property value', () => {
            const instance = document.getInstance('urn:example.org:locations/testLocation1');
            instance.getProperty('Location/address').value = 'test_value';
            expect(instance.getProperty('Location/address').value).to.equal('test_value');
        });

        it('can set primitive property value using context term', () => {
            const instance = document.getInstance<Location>('urn:example.org:locations/testLocation1');
            instance.address = 'test_address_using_term';
            expect(instance.address).to.equal('test_address_using_term');
        });

        it('can get and set primitive property set', () => {
            const instance = document.getInstance('urn:example.org:departments/testDepartment1');
            const phoneNo = instance.getProperty('Department/phoneNo');
            phoneNo.value.add('1234');
            phoneNo.value.add('5678');

            expect(phoneNo.value.count).to.equal(2);
            expect([...phoneNo.value][0]).to.equal('1234');
            expect([...phoneNo.value][1]).to.equal('5678');

            phoneNo.value.clear();
            expect(phoneNo.value.count).to.equal(0);
        });

        it('can get and set primitive property set using context term', () => {
            const instance = document.getInstance<Department>('urn:example.org:departments/testDepartment2');
            instance.phoneNo.add('1234');
            instance.phoneNo.add('5678');

            expect(instance.phoneNo.count).to.equal(2);
            expect([...instance.phoneNo][0]).to.equal('1234');
            expect([...instance.phoneNo][1]).to.equal('5678');

            instance.phoneNo.clear();
            expect(instance.phoneNo.count).to.equal(0);
        });

        it('can get, set and delete reference property', () => {
            const instance = document.getInstance('urn:example.org:employees/testEmployee1');
            const locationProperty = instance.getProperty('Person/location');
            const locationInstance = document.getInstance('urn:example.org:locations/testLocation1');

            locationProperty.value = locationInstance;

            expect(locationProperty.value).to.be.ok;
            expect(locationProperty.value).to.be.instanceOf(Instance);
            expect(locationProperty.value.id).to.equal('urn:example.org:locations/testLocation1');

            expect(locationInstance.getReferrers('Person/location').count()).to.equal(1);
            expect(locationInstance.getReferrers('Person/location').first().id).to.equal(instance.id);

            locationProperty.value = null;
            expect(locationProperty.value).to.be.undefined;
            expect(locationInstance.referrers.count()).to.equal(0);
        });

        it('can get, set and delete reference property using context term', () => {
            const instance = document.getInstance<Employee>('urn:example.org:employees/testEmployee2');
            const locationInstance = document.getInstance<Location>('urn:example.org:locations/testLocation1');

            instance.location = locationInstance;

            expect(instance.location).to.be.ok;
            expect(instance.location).to.be.instanceOf(Instance);
            expect(instance.location.id).to.equal('urn:example.org:locations/testLocation1');

            expect(locationInstance.getReferrers('Person/location').count()).to.equal(1);
            expect(locationInstance.getReferrers('Person/location').first().id).to.equal(instance.id);

            instance.location = null;
            expect(instance.location).to.be.undefined;
            expect(locationInstance.referrers.count()).to.equal(0);
        });

        it('can get, set and delete reference container property', () => {
            const instance = document.getInstance('urn:example.org:employees/testManager1');
            const testEmployee1 = document.getInstance('urn:example.org:employees/testEmployee1');
            const testEmployee2 = document.getInstance('urn:example.org:employees/testEmployee2');
            const managesProperty = instance.getProperty('Manager/manages');

            managesProperty.value.add(testEmployee1);
            managesProperty.value.add(testEmployee2);

            expect(managesProperty.value.count).to.equal(2);
            expect([...managesProperty.value][0]).to.be.instanceOf(Instance);
            expect([...managesProperty.value][1]).to.be.instanceOf(Instance);
            expect([...managesProperty.value].some(x => x.id === 'urn:example.org:employees/testEmployee1')).to.be.true;
            expect([...managesProperty.value].some(x => x.id === 'urn:example.org:employees/testEmployee2')).to.be.true;

            expect(testEmployee1.getReferrers('Manager/manages').count()).to.equal(1);
            expect(testEmployee2.getReferrers('Manager/manages').count()).to.equal(1);

            expect(testEmployee1.getReferrers('Manager/manages').some(x => x.id === 'urn:example.org:employees/testManager1')).to.be.true;
            expect(testEmployee2.getReferrers('Manager/manages').some(x => x.id === 'urn:example.org:employees/testManager1')).to.be.true;

            managesProperty.value.remove(testEmployee1);
            expect(managesProperty.value.count).to.equal(1);
            expect([...managesProperty.value].some(x => x.id === 'urn:example.org:employees/testEmployee2')).to.be.true;
            expect([...managesProperty.value].some(x => x.id === 'urn:example.org:employees/testEmployee1')).to.be.false;
            expect(testEmployee1.getReferrers('Manager/manages').count()).to.equal(0);

            managesProperty.value.clear();
            expect(managesProperty.value.count).to.equal(0);
            expect(testEmployee2.getReferrers('Manager/manages').count()).to.equal(0);
        });

        it('can get, set and delete reference container property using context term', () => {
            const instance = document.getInstance<Manager>('urn:example.org:employees/testManager1');
            const testEmployee1 = document.getInstance<Employee>('urn:example.org:employees/testEmployee1');
            const testEmployee2 = document.getInstance<Employee>('urn:example.org:employees/testEmployee2');

            instance.manages.add(testEmployee1);
            instance.manages.add(testEmployee2);

            expect(instance.manages.count).to.equal(2);
            expect([...instance.manages][0]).to.be.instanceOf(Instance);
            expect([...instance.manages][1]).to.be.instanceOf(Instance);
            expect([...instance.manages].some(x => x.id === 'urn:example.org:employees/testEmployee1')).to.be.true;
            expect([...instance.manages].some(x => x.id === 'urn:example.org:employees/testEmployee2')).to.be.true;
            expect(instance.manages.get('urn:example.org:employees/testEmployee1')).to.be.ok;

            expect(testEmployee1.getReferrers('Manager/manages').count()).to.equal(1);
            expect(testEmployee2.getReferrers('Manager/manages').count()).to.equal(1);

            expect(testEmployee1.getReferrers('Manager/manages').some(x => x.id === 'urn:example.org:employees/testManager1')).to.be.true;
            expect(testEmployee2.getReferrers('Manager/manages').some(x => x.id === 'urn:example.org:employees/testManager1')).to.be.true;

            instance.manages.clear();
            expect(instance.manages.count).to.equal(0);
            expect(testEmployee1.getReferrers('Manager/manages').count()).to.equal(0);
            expect(testEmployee2.getReferrers('Manager/manages').count()).to.equal(0);
        });
    });
});

interface Entity extends Instance { } 

interface Location extends Entity {
    address: string;
}

interface Person extends Entity {
    firstName: string;
    lastName: string;
    location: Location & Instance;
}

interface Department extends Entity {
    name: string;
    deptLocation: Location;
    phoneNo: ContainerPropertyValues<string>;
}

interface Employee extends Person {
    level: number;
    manager: Employee;
    department: Department;
}

interface Manager extends Employee {
    manages: ContainerPropertyValues<Employee>;
}