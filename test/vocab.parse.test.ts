import 'mocha';
import { expect } from 'chai';
import Vocabulary, { ValueType, ContainerType } from '../src';

const context = {
    '@context': {
        '@vocab': 'http://example/classes/',
        firstName: 'Person/firstName',
        lastName: 'Person/lastName',
        reportsTo: { '@type': '@id', '@container': '@set', '@id': 'Employee/reportsTo' },
        manages: { '@type': '@id', '@container': '@list', '@id': 'Manager/manages' }
    }
};

const baseClasses = {
    '@context': {
        '@base': 'http://example/classes/'
    },
    '@graph': [
        {
            '@id': 'Person',
            '@type': 'Class',
            Label: 'Person',
            Comment: 'Person class'
        },
        {
            '@id': 'Employee',
            '@type': 'Class',
            SubClassOf: 'Person',
            Label: 'Employee',
            Comment: 'Employee class'
        },
        {
            '@id': 'Person/firstName',
            '@type': 'Property',
            Label: 'First Name',
            Comment: 'Person first name',
            Domain: 'Person',
            Range: 'xsd:string'
        },
        {
            '@id': 'Person/lastName',
            '@type': 'Property',
            Label: 'Last Name',
            Comment: 'Person last name',
            Domain: 'Person',
            Range: 'xsd:string'
        },
        {
            '@id': 'Employee/reportsTo',
            '@type': 'Property',
            Label: 'Reports To',
            Comment: 'Who the employee reports to.',
            Domain: 'Employee',
            Range: 'Employee'
        }
    ]
};

const extensionClasses = {
    '@context': {
        '@base': 'http://example/classes/'
    },
    '@graph': [
        {
            '@id': 'Manager',
            '@type': 'Class',
            SubClassOf: 'Employee',
            Label: 'Manager',
            Comment: 'Manager class'
        },
        {
            '@id': 'Manager/manages',
            '@type': 'Property',
            Label: 'Manages',
            Comment: 'Person a manager manages',
            Domain: 'Manager',
            Range: 'Employee'
        },
        {
            '@id': 'Address',
            '@type': 'Property',
            Label: 'Lavel',
            Comment: 'Employee level',
            Domain: ['Employee', 'Manager'],
            Range: 'xsd:integer'
        }
    ]
};

describe('Vocabulary parse', () => {

    let vocabulary: Vocabulary;

    before(async () => {
        vocabulary = new Vocabulary('http://example/classes/', 'http://example/context');
        vocabulary.context.load(context);
        await vocabulary.load(baseClasses);
        await vocabulary.load(extensionClasses);
    });

    it('should have parsed all classes', () => {
        expect(vocabulary.classes.count()).to.equal(3);
        expect(vocabulary.hasResource('Person')).to.be.true;
        expect(vocabulary.hasResource('Employee')).to.be.true;
        expect(vocabulary.hasResource('Manager')).to.be.true;
    });

    it('should have parsed class properties', () => {
        const personClass = vocabulary.getClass('Person');
        expect(personClass.hasProperty('Person/firstName')).to.be.true;
        expect(personClass.hasProperty('Person/lastName')).to.be.true;
        expect(personClass.getProperty('Person/firstName').label).to.equal('First Name');
        expect(personClass.getProperty('Person/firstName').comment).to.equal('Person first name');
        expect(personClass.getProperty('Person/lastName').hasRange('xsd:string')).to.be.true;
        expect(personClass.hasProperty('Person/lastName')).to.be.true;
        expect(personClass.getProperty('Person/lastName').label).to.equal('Last Name');
        expect(personClass.getProperty('Person/lastName').comment).to.equal('Person last name');
        expect(personClass.getProperty('Person/lastName').hasRange('xsd:string')).to.be.true;
    });

    it('should have parsed sub-classes', () => {
        const employeeClass = vocabulary.getClass('Employee');
        expect(employeeClass.isSubClassOf('Person')).to.be.true;
        expect(employeeClass.hasProperty('Employee/reportsTo')).to.be.true;
        expect(employeeClass.getProperty('Employee/reportsTo').hasRange('Employee')).to.be.true;
        expect(employeeClass.hasProperty('Person/firstName')).to.be.true;
        expect(employeeClass.hasProperty('Person/lastName')).to.be.true;
    });

    it('should have parsed descendants', () => {
        const managerClass = vocabulary.getClass('Manager');
        expect(managerClass.isDescendantOf('Person')).to.be.true;
        expect(managerClass.isSubClassOf('Employee'));
        expect(managerClass.hasOwnProperty('Manager/manages')).to.be.true;
    });

    it('should have parsed shared properties', () => {
        expect(vocabulary.getClass('Employee').hasProperty('Address')).to.be.true;
        expect(vocabulary.getClass('Manager').hasProperty('Address')).to.be.true;
        expect(vocabulary.getProperty('Address').hasDomain('Employee')).to.be.true;
        expect(vocabulary.getProperty('Address').hasDomain('Manager')).to.be.true;
    });

    it('should have parsed context', () => {
        expect(vocabulary.getProperty('Person/firstName').term).to.be.equal('firstName');
        expect(vocabulary.getProperty('Person/lastName').term).to.be.equal('lastName');
        expect(vocabulary.getProperty('Employee/reportsTo').term).to.be.equal('reportsTo');
        expect(vocabulary.getProperty('Employee/reportsTo').valueType).to.be.equal(ValueType.id);
        expect(vocabulary.getProperty('Employee/reportsTo').container).to.be.equal(ContainerType.set);
        expect(vocabulary.getProperty('Manager/manages').term).to.be.equal('manages');
        expect(vocabulary.getProperty('Manager/manages').valueType).to.be.equal(ValueType.id);
        expect(vocabulary.getProperty('Manager/manages').container).to.be.equal(ContainerType.list);
    });
});