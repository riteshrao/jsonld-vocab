import 'mocha';
import { expect } from 'chai';
import { Vocabulary, Errors } from '../src';

const testContext = require('./samples/context.json');
const testClasses = require('./samples/vocabulary.json');

describe('Class', () => {
    let vocabulary: Vocabulary;

    before(async () => {
        vocabulary = new Vocabulary('http://example.org/classes/', 'http://example.org/context');
        vocabulary.context.load('http://example.org/context', testContext);
        await vocabulary.load(testClasses);
    });

    describe('.getAncestors', () => {
        it('should get all ancestors of the class', () => {
            const managerClass = vocabulary.getClass('Manager');
            const ancestors = [...managerClass.ancestors];
            expect(ancestors.length).to.equal(2);
            expect(ancestors.some(x => x.id === 'Person')).to.be.true;
            expect(ancestors.some(x => x.id === 'Employee')).to.be.true;
        });

        it('should return empty when class no ancestors', () => {
            const personClass = vocabulary.getClass('Person');
            expect(personClass.ancestors.count()).to.equal(0);
        });
    });

    describe('.descendants', () => {
        it('should get all descendants of the class', () => {
            const personClass = vocabulary.getClass('Person');
            const descendants = [...personClass.descendants];
            expect(descendants.length).to.equal(3);
            expect(descendants.some(x => x.id === 'Employee')).to.be.true;
            expect(descendants.some(x => x.id === 'Manager')).to.be.true;
        });

        it('should return empty when class has no descendants', () => {
            const managerClass = vocabulary.getClass('Manager');
            expect(managerClass.descendants.count()).to.equal(0);
        });
    });

    describe('.ownProperties', () => {
        it('should return all owned properties of the class', () => {
            const employeeClass = vocabulary.getClass('Employee');
            const ownProps = [...employeeClass.ownProperties];
            expect(ownProps.length).to.equal(3);
            expect(ownProps.some(x => x.id === 'Employee/level')).to.be.true;
            expect(ownProps.some(x => x.id === 'Employee/manager')).to.be.true;
            expect(ownProps.some(x => x.id === 'Employee/department')).to.be.true;
        });
    });

    describe('.properties', () => {
        it('should return owned and ancestor properties', () => {
            const managerClass = vocabulary.getClass('Manager');
            const properties = [...managerClass.properties];

            expect(properties.length).to.equal(8);
            expect(properties.some(x => x.id === 'Person/firstName')).to.be.true;
            expect(properties.some(x => x.id === 'Person/lastName')).to.be.true;
            expect(properties.some(x => x.id === 'Person/location')).to.be.true;
            expect(properties.some(x => x.id === 'Employee/level')).to.be.true;
            expect(properties.some(x => x.id === 'Employee/manager')).to.be.true;
            expect(properties.some(x => x.id === 'Employee/department')).to.be.true;
            expect(properties.some(x => x.id === 'Manager/manages')).to.be.true;
        });
    });

    describe('.subClasses', () => {
        it('should return sub-classes of class', () => {
            const personClass = vocabulary.getClass('Person');
            const subClasses = [...personClass.subClasses];

            expect(subClasses.length).to.equal(2);
            expect(subClasses.some(x => x.id === 'Employee')).to.be.true;
            expect(subClasses.some(x => x.id === 'Contractor')).to.be.true;
        });
    });

    describe('.parentClasses', () => {
        it('should get parents of class', () => {
            const managerClass = vocabulary.getClass('Manager');
            const parents = [...managerClass.parentClasses];
            expect(parents.length).to.equal(1);
            expect(parents[0].id).to.equal('Employee');
        });
    });

    describe('.addProperty', () => {
        it('should throw when property is undefined or null', () => {
            const managerClass = vocabulary.getClass('Manager');
            expect(() => managerClass.addProperty(undefined)).to.throw(ReferenceError);
            expect(() => managerClass.addProperty(null)).to.throw(ReferenceError);
        });

        it('should add property to class', () => {
            const property = vocabulary.createProperty('Entity/description');
            const managerClass = vocabulary.getClass('Manager');
            managerClass.addProperty(property);

            expect(managerClass.hasProperty('Entity/description')).to.be.true;
            expect(property.hasDomain('Manager')).to.be.true;
        });

        it('should do nothing when property is already part of class hierarhcy', () => {
            const firstNameProp = vocabulary.getProperty('Person/firstName');
            const managerClass = vocabulary.getClass('Manager');
            managerClass.addProperty(firstNameProp);

            expect(managerClass.hasOwnProperty(firstNameProp)).to.be.false;
            expect(firstNameProp.hasDomain(managerClass)).to.be.false;
        });
    });

    describe('.createProperty', () => {
        it('should throw when property id is undefined, null or empty', () => {
            const managerClass = vocabulary.getClass('Manager');
            expect(() => managerClass.createProperty(undefined)).to.throw(ReferenceError);
            expect(() => managerClass.createProperty(null)).to.throw(ReferenceError);
            expect(() => managerClass.createProperty('')).to.throw(ReferenceError);
        });

        it('should throw when property id already exists', () => {
            const managerClass = vocabulary.getClass('Manager');
            expect(() => managerClass.createProperty('Manager/manages')).to.throw(Errors.DuplicateResourceError);
        });

        it('should throw when property id is invalid', () => {
            const managerClass = vocabulary.getClass('Manager');
            expect(() => managerClass.createProperty('xsder:foo')).to.throw(Errors.InvalidResourceIdError);
        });

        it('should create new property', () => {
            const managerClass = vocabulary.getClass('Manager');
            const property = managerClass.createProperty('Manager/worksWith');

            expect(property).to.be.ok;
            expect(managerClass.hasOwnProperty('Manager/worksWith')).to.be.true;
            expect(vocabulary.hasResource('Manager/worksWith')).to.be.true;
            expect(property.hasDomain(managerClass)).to.be.true;
        });
    });

    describe('.createSubClass', () => {
        it('should throw when class id is undefined, null or empty', () => {
            const managerClass = vocabulary.getClass('Manager');
            expect(() => managerClass.createSubClass(undefined)).to.throw(ReferenceError);
            expect(() => managerClass.createSubClass(null)).to.throw(ReferenceError);
            expect(() => managerClass.createSubClass('')).to.throw(ReferenceError);
        });

        it('should throw when another class with same id already exists', () => {
            const managerClass = vocabulary.getClass('Manager');
            expect(() => managerClass.createSubClass('Person')).to.throw(Errors.DuplicateResourceError);
        });

        it('should throw when class id is invalid', () => {
            const managerClass = vocabulary.getClass('Manager');
            expect(() => managerClass.createSubClass('I Cannot Have Spaces')).to.throw(Errors.InvalidResourceIdError);
        });

        it('should create sub-class', () => {
            const managerClass = vocabulary.getClass('Manager');
            const subClass = managerClass.createSubClass('BranchManager');

            expect(subClass).to.be.ok;
            expect(subClass.isSubClassOf(managerClass)).to.be.true;
            expect(managerClass.isAncestorOf(subClass)).to.be.true;
            expect(vocabulary.hasResource('BranchManager'));
        });
    });

    describe('.getProperty', () => {
        it('should throw when property id is undefined, null or empty', () => {
            const managerClass = vocabulary.getClass('Manager');
            expect(() => managerClass.getProperty(undefined)).to.throw(ReferenceError);
            expect(() => managerClass.getProperty(null)).to.throw(ReferenceError);
            expect(() => managerClass.getProperty('')).to.throw(ReferenceError);
        });

        it('should return own property', () => {
            const managerClass = vocabulary.getClass('Manager');
            const property = managerClass.getProperty('Manager/manages');
            expect(property).to.be.ok;
            expect(property.id).to.equal('Manager/manages');
        });

        it('should return ancestor property', () => {
            const managerClass = vocabulary.getClass('Manager');
            const property = managerClass.getProperty('Person/firstName');
            expect(property).to.be.ok;
            expect(property.id).to.equal('Person/firstName');
        });
    });

    describe('.isAncestorOf', () => {
        it('should throw when when class id is undefined, null or empty', () => {
            const personClass = vocabulary.getClass('Person');
            expect(() => personClass.isAncestorOf(undefined)).to.throw(ReferenceError);
            expect(() => personClass.isAncestorOf(null)).to.throw(ReferenceError);
            expect(() => personClass.isAncestorOf('')).to.throw(ReferenceError);
        });

        it('should return true for ancestor of class using class id', () => {
            const personClass = vocabulary.getClass('Person');
            expect(personClass.isAncestorOf('Manager')).to.be.true;
        });

        it('should return true for ancestor of class using reference', () => {
            const personClass = vocabulary.getClass('Person');
            const managerClass = vocabulary.getClass('Manager');
            expect(personClass.isAncestorOf(managerClass)).to.be.true;
        });
    });

    describe('.isDescendantOf', () => {
        it('should throw when when class id is undefined, null or empty', () => {
            const personClass = vocabulary.getClass('Person');
            expect(() => personClass.isDescendantOf(undefined)).to.throw(ReferenceError);
            expect(() => personClass.isDescendantOf(null)).to.throw(ReferenceError);
            expect(() => personClass.isDescendantOf('')).to.throw(ReferenceError);
        });

        it('should return true for ancestor of class using class id', () => {
            const personClass = vocabulary.getClass('Manager');
            expect(personClass.isDescendantOf('Person')).to.be.true;
        });

        it('should return true for ancestor of class using reference', () => {
            const personClass = vocabulary.getClass('Person');
            const managerClass = vocabulary.getClass('Manager');
            expect(managerClass.isDescendantOf(personClass)).to.be.true;
        });
    });

    describe('.isSubClassOf', () => {
        it('should throw when when class id is undefined, null or empty', () => {
            const employeeClass = vocabulary.getClass('Employee');
            expect(() => employeeClass.isSubClassOf(undefined)).to.throw(ReferenceError);
            expect(() => employeeClass.isSubClassOf(null)).to.throw(ReferenceError);
            expect(() => employeeClass.isSubClassOf('')).to.throw(ReferenceError);
        });

        it('should return true for ancestor of class using class id', () => {
            const employeeClass = vocabulary.getClass('Employee');
            expect(employeeClass.isSubClassOf('Person')).to.be.true;
        });

        it('should return true for ancestor of class using reference', () => {
            const personClass = vocabulary.getClass('Person');
            const employeeClass = vocabulary.getClass('Employee');
            expect(employeeClass.isSubClassOf(personClass)).to.be.true;
        });
    });

    describe('.makeSubClassOf', () => {
        it('should throw when class id is undefined, null or empty', () => {
            const contractorClass = vocabulary.getClass('Contractor');
            expect(() => contractorClass.makeSubClassOf(undefined)).to.throw(ReferenceError);
            expect(() => contractorClass.makeSubClassOf(null)).to.throw(ReferenceError);
            expect(() => contractorClass.makeSubClassOf('')).to.throw(ReferenceError);
        });

        it('should throw when class is not found', () => {
            const contractorClass = vocabulary.getClass('Contractor');
            expect(() => contractorClass.makeSubClassOf('DoesNotExist')).to.throw(Errors.ResourceNotFoundError);
        });

        it('should make sub-class of type', () => {
            const contractorClass = vocabulary.getClass('Manager');
            contractorClass.makeSubClassOf('Person');
            expect(contractorClass.isSubClassOf('Person')).to.be.true;
            expect(vocabulary.getClass('Person').isAncestorOf(contractorClass)).to.be.true;
        });
    });

    describe('.removeProperty', () => {
        it('should throw when property reference is undefined, null or empty', () => {
            const contractorClass = vocabulary.getClass('Contractor');
            expect(() => contractorClass.removeProperty(undefined)).to.throw(ReferenceError);
            expect(() => contractorClass.removeProperty(null)).to.throw(ReferenceError);
            expect(() => contractorClass.removeProperty('')).to.throw(ReferenceError);
        });

        it('should throw when property is not found', () => {
            const contractorClass = vocabulary.getClass('Contractor');
            expect(() => contractorClass.removeProperty('test')).to.throw(Errors.ResourceNotFoundError);
        });

        it('should remove property from class', () => {
            const contractorClass = vocabulary.getClass('Contractor');
            contractorClass.createProperty('Contractor/worksFor');

            expect(contractorClass.hasProperty('Contractor/worksFor'));
            contractorClass.removeProperty('Contractor/worksFor');

            expect(contractorClass.hasProperty('Contractor/worksFor')).to.be.false;
        });
    });
});