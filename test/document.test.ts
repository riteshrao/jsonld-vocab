import 'mocha';
import { expect } from 'chai';
import Vocabulary, { Document, Errors } from '../src';

const testContext = require('./samples/context.json');
const testVocab = require('./samples/vocabulary.json');
const testInstances = require('./samples/instances.json');

describe('Document', () => {
    let vocabulary: Vocabulary;
    let document: Document;

    before(async () => {
        vocabulary = new Vocabulary('http://example.org/classes/', 'http://example.org/context');
        vocabulary.context.load('http://example.org/context', testContext);
        await vocabulary.load(testVocab);
    });

    beforeEach(async () => {
        document = new Document(vocabulary);
        await document.load(testInstances);
    });

    describe('.createInstance', () => {
        it('should throw when class reference not valid', () => {
            expect(() => document.createInstance(undefined, 'foo')).to.throw(ReferenceError);
            expect(() => document.createInstance(null, 'foo')).to.throw(ReferenceError);
            expect(() => document.createInstance('', 'foo')).to.throw(ReferenceError);
        });

        it('should throw when instance id not undefined, null or empty', () => {
            expect(() => document.createInstance('Person', undefined)).to.throw(ReferenceError);
            expect(() => document.createInstance('Person', null)).to.throw(ReferenceError);
            expect(() => document.createInstance('Person', '')).to.throw(ReferenceError);
        });

        it('should throw when instance id is not a valid IRI', () => {
            expect(() => document.createInstance('Person', 'foobar')).to.throw();
            expect(() => document.createInstance('Person', 'mailto://foobar')).to.throw();
            expect(() => document.createInstance('Person', 'urn:incomplete')).to.throw();
        });

        it('should throw when class is not found', () => {
            expect(() => document.createInstance('ClassNotFound', 'urn:example.org:persons/TestPerson')).to.throw(Errors.ResourceNotFoundError);
        });

        it('should have created instance in document', () => {
            document.createInstance('Person', 'urn:example.org:persons/jimd');
            expect(document.hasInstance('urn:example.org:persons/jimd')).to.be.true;
        });

        it('should throw when creating instance with duplicate id', () => {
            expect(() => document.createInstance('Employee', 'urn:example.org:employees/jdoe')).to.throw(Errors.DuplicateInstanceError);
        });

        it('should throw when creating instance with existing class id', () => {
            expect(() => document.createInstance('Person', 'http://example.org/classes/Department')).to.throw(Errors.InvalidInstanceIdError);
        });

        it('should throw when instance id conflicts with vocabulary instance', () => {
            expect(() => document.createInstance('Person', 'http://example.org/classes/Department/deptA')).to.throw(Errors.InvalidInstanceIdError);
        });
    });

    describe('.getInstance', () => {
        it('should throw when id is not a valid type', () => {
            expect(() => document.getInstance(undefined)).to.throw(ReferenceError);
            expect(() => document.getInstance(null)).to.throw(ReferenceError);
            expect(() => document.getInstance('')).to.throw(ReferenceError);
        });

        it('should throw not found when attempting to get a class definition', () => {
            expect(() => document.getInstance('vocab:Person')).to.throw(Errors.InstanceNotFoundError);
        });

        it('should throw not found when attempting to get vocabulary instance', () => {
            expect(() => document.getInstance('http://example.org/classes/Department/deptA')).to.throw(Errors.InstanceNotFoundError);
        });

        it('should throw not found when instance does not exist', () => {
            expect(() => document.getInstance('urn:example.org:persons/doesnotexist')).to.throw(Errors.InstanceNotFoundError);
        });

        it('should get instance from document using id', () => {
            const instance = document.getInstance('urn:example.org:employees/jdoe');
            expect(instance).to.be.ok;
            expect(instance.id).to.equal('urn:example.org:employees/jdoe');
        });
    });

    describe('.getInstances', () => {
        it('should throw when class reference is undefined, null or empty', () => {
            expect(() => document.getInstances(undefined)).to.throw(ReferenceError);
            expect(() => document.getInstances(null)).to.throw(ReferenceError);
            expect(() => document.getInstances('')).to.throw(ReferenceError);
        });

        it('should throw when class does not exist', () => {
            expect(() => document.getInstances('NotExists')).to.throw(Errors.ResourceNotFoundError);
        });

        it('should get all instances of class', () => {
            const instances = [...document.getInstances('Employee')];
            expect(instances.length).to.equal(2);
            expect(instances.some(x => x.id === 'urn:example.org:employees/jdoe')).to.be.true;
            expect(instances.some(x => x.id === 'urn:example.org:employees/jilld')).to.be.true;
        });

        it('should get all descendant instances of class', () => {
            const instances = [...document.getInstances('Person', true)];
            expect(instances.length).to.equal(3);
            expect(instances.some(x => x.id === 'urn:example.org:employees/jdoe')).to.be.true;
            expect(instances.some(x => x.id === 'urn:example.org:employees/jilld')).to.be.true;
            expect(instances.some(x => x.id === 'urn:example.org:employees/janed')).to.be.true;
        });
    });

    describe('.removeInstance', () => {
        it('throws when instance reference is undefined, null or empty', () => {
            expect(() => document.removeInstance(undefined)).to.throw(ReferenceError);
            expect(() => document.removeInstance(null)).to.throw(ReferenceError);
            expect(() => document.removeInstance('')).to.throw(ReferenceError);
        });

        it('should not throw when removing an unknown unknown instance', () => {
            expect(() => document.removeInstance('urn:example.org:instances/notfound')).not.to.throw;
        });

        it('should not remove vocabulary instance', () => {
            document.removeInstance('http://example.org/context/Department/deptA');
            expect(vocabulary.hasInstance('Department/deptA')).to.be.true;
        });

        it('should remove instance', () => {
            document.removeInstance('urn:example.org:employees/employeeA');
            expect(document.hasInstance('urn:example.org:employees/employeeA')).to.be.false;
        });

        it('should not remove referenced instances in non-recursive mode', () => {
            document.removeInstance('urn:example.org:employees/jilld');
            expect(document.hasInstance('urn:example.org:employees/jilld')).to.be.false;
            expect(document.hasInstance('urn:example.org:departments/finance')).to.be.true;
            expect(document.hasInstance('urn:example.org:locations/nashua')).to.be.true;
        });

        it('should remove referenced instances in recursive-mode', () => {
            document.removeInstance('urn:example.org:employees/jilld', true);
            expect(document.hasInstance('urn:example.org:employees/jilld')).to.be.false;
            expect(document.hasInstance('urn:example.org:departments/finance')).to.be.false;
            expect(document.hasInstance('urn:example.org:locations/nashua')).to.be.false;
        });

        it('should not remove referenced instances in recursive-mode when instance is still has references', () => {
            document.removeInstance('urn:example.org:employees/janed', true);
            expect(document.hasInstance('urn:example.org:employees/janed')).to.be.false;
            expect(document.hasInstance('urn:example.org:departments/hr')).to.be.false;
            expect(document.hasInstance('urn:example.org:locations/nashua')).to.be.true;
        });
    });
});