import 'mocha';
import { expect } from 'chai';
import Vocabulary, { Class, Property, ContainerType, ValueType, DataType, Errors, Instance, ContainerPropertyValues } from '../src';

describe('Vocabulary CRUD', () => {
    let vocabulary: Vocabulary;
    const invalidIds = [
        '_startsWith',
        'endsWith_',
        '0startsWith',
        'endsWith/',
        '/startsWith',
        'starts*With',
        'foo:prefix'
    ];
    const validIds = [
        'has_separator',
        'ends_with_0',
        'has/paths'
    ];

    beforeEach(() => {
        vocabulary = new Vocabulary('urn:alt.universe.net:classes/', 'urn:alt.universe.net:context.json');
    });

    describe('basic class', () => {
        beforeEach(() => {
            const planetClass = vocabulary.createClass('Planet');
            planetClass.label = 'Planet';
            planetClass.comment = 'Planet Class Type';

            const displayNameProp = planetClass.createProperty('Planet/displayName');
            displayNameProp.label = 'Display Name';
            displayNameProp.comment = 'Display name of the planet';
            displayNameProp.setRange(DataType.String);

            const descriptionProp = planetClass.createProperty('Planet/description');
            descriptionProp.label = 'Description';
            descriptionProp.comment = 'Planet description';
            descriptionProp.setRange(DataType.String, 'xsd:integer');
        });

        it('should throw when creating class with invalid id', () => {
            for (const id of invalidIds) {
                expect(() => vocabulary.createClass(id)).to.throw(Errors.InvalidResourceId);
            }
        });

        it('should not throw when creating class with valid id', () => {
            for (const id of validIds) {
                expect(() => vocabulary.createClass(id)).not.to.throw(Errors.InvalidResourceId);
            }
        });

        it('should have been created', () => {
            const planetClass = vocabulary.getClass('Planet');
            expect(planetClass).to.be.ok;
            expect(planetClass.id).to.equal('Planet');
            expect(planetClass.label).to.equal('Planet');
            expect(planetClass.comment).to.equal('Planet Class Type');
        });

        it('should be included in class list', () => {
            expect(vocabulary.classes.count()).to.equal(1);
            expect(vocabulary.classes.some(x => x.id === 'Planet')).to.be.true;
        });

        it('should have defined properties', () => {
            const planetClass = vocabulary.getClass('Planet');
            expect(planetClass.properties.count()).to.equal(2);
            expect(planetClass.getProperty('Planet/displayName')).to.be.ok;
            expect(planetClass.getProperty('Planet/displayName').id).to.equal('Planet/displayName');
            expect(planetClass.getProperty('Planet/displayName').label).to.equal('Display Name');
            expect(planetClass.getProperty('Planet/displayName').comment).to.equal('Display name of the planet');
            expect(planetClass.getProperty('Planet/displayName').range.count()).to.equal(1);
            expect(planetClass.getProperty('Planet/displayName').range.some(x => x.id === 'xsd:string')).to.be.true;

            expect(planetClass.getProperty('Planet/description')).to.be.ok;
            expect(planetClass.getProperty('Planet/description').id).to.equal('Planet/description');
            expect(planetClass.getProperty('Planet/description').label).to.equal('Description');
            expect(planetClass.getProperty('Planet/description').comment).to.equal('Planet description');
            expect(planetClass.getProperty('Planet/description').range.count()).to.equal(2);
            expect(planetClass.getProperty('Planet/description').range.some(x => x.id === 'xsd:string')).to.be.true;
            expect(planetClass.getProperty('Planet/description').range.some(x => x.id === 'xsd:integer')).to.be.true;
        });

        it('should expose properties via vocabulary', () => {
            const displayNameProp = vocabulary.getProperty('Planet/displayName');
            expect(displayNameProp).to.be.ok;
            expect(displayNameProp.id).to.equal('Planet/displayName');
            expect(displayNameProp.label).to.equal('Display Name');
            expect(displayNameProp.comment).to.equal('Display name of the planet');
            expect(displayNameProp.range.count()).to.equal(1);
            expect(displayNameProp.range.some(x => x.id === 'xsd:string')).to.be.true;

            const descriptionProp = vocabulary.getProperty('Planet/description');
            expect(descriptionProp).to.be.ok;
            expect(descriptionProp.id).to.equal('Planet/description');
            expect(descriptionProp.label).to.equal('Description');
            expect(descriptionProp.comment).to.equal('Planet description');
            expect(descriptionProp.range.count()).to.equal(2);
            expect(descriptionProp.range.some(x => x.id === 'xsd:string')).to.be.true;
            expect(descriptionProp.range.some(x => x.id === 'xsd:integer')).to.be.true;
        });

        it('should delete all owned properties', () => {
            vocabulary.removeClass('Planet', true);
            expect(vocabulary.hasResource('Planet/displayName')).to.be.false;
        });

        it('should ratain properties on id change', () => {
            const personClass = vocabulary.createClass('Person');
            personClass.createProperty('Person/firstName');
            personClass.createProperty('Person/lastName');

            personClass.id = 'NewPerson';
            expect(personClass.properties.count()).to.equal(2);
            expect(personClass.hasProperty('Person/firstName')).to.be.true;
            expect(personClass.hasProperty('Person/lastName')).to.be.true;
        });

        it('should retain term definition on id change', () => {
            const personClass = vocabulary.createClass('Person');
            personClass.term = 'person';
            expect(personClass.term).to.equal('person');

            personClass.id = 'NewPerson';
            expect(personClass.term).to.equal('person');
        });

        it('should return property term definition on id change', () => {
            const personClass = vocabulary.createClass('Person');
            const firstNameProp = personClass.createProperty('Person/firstName');
            firstNameProp.term = 'firstName';
            firstNameProp.container = ContainerType.list;
            firstNameProp.valueType = ValueType.vocab;

            firstNameProp.id = 'fname';
            expect(firstNameProp.container).to.equal(ContainerType.list);
            expect(firstNameProp.valueType).to.equal(ValueType.vocab);
        });
    });

    describe('subclass', () => {
        let managerClass: Class;

        beforeEach(() => {
            const personClass = vocabulary.createClass('Person');
            personClass.createProperty('Person/firstName');
            personClass.createProperty('Person/lastName');

            const employeeClass = vocabulary.createClass('Employee');
            employeeClass.createProperty('Employee/department');
            employeeClass.createProperty('Employee/level');
            employeeClass.makeSubClassOf(personClass);

            managerClass = employeeClass.createSubClass('Manager');
            managerClass.createProperty('Manager/manages').setRange('Employee');
        });

        it('should have all ancestor properties', () => {
            const props = [...managerClass.properties];
            expect(props.length).to.equal(5);
            expect(props.some(x => x.id === 'Person/firstName')).to.be.true;
            expect(props.some(x => x.id === 'Person/lastName')).to.be.true;
            expect(props.some(x => x.id === 'Employee/department')).to.be.true;
            expect(props.some(x => x.id === 'Employee/level')).to.be.true;
            expect(props.some(x => x.id === 'Manager/manages')).to.be.true;
        });

        it('should have parent defined', () => {
            expect(managerClass.subClassOf.count()).to.equal(1);
            expect(managerClass.subClassOf.first().id).to.equal('Employee');
        });

        it('should have all ancestors defined', () => {
            expect(managerClass.ancestors.count()).to.equal(2);
            expect(managerClass.ancestors.some(x => x.id === 'Person')).to.be.true;
            expect(managerClass.ancestors.some(x => x.id === 'Employee')).to.be.true;
        });

        it('should have own properties defined', () => {
            expect(managerClass.ownProperties.count()).to.equal(1);
            expect(managerClass.ownProperties.first().id).to.equal('Manager/manages');
        });

        it('should be reachable by parent class', () => {
            const employeeClass = vocabulary.getClass('Employee');
            expect(employeeClass.subClasses.some(x => x.id === 'Manager')).to.be.true;
        });

        it('should be reachable by ancestor class', () => {
            const personClass = vocabulary.getClass('Person');
            expect(personClass.descendants.some(x => x.id === 'Manager')).to.be.true;
        });

        it('should be descendant of ancestor', () => {
            expect(managerClass.isDescendantOf('Person')).to.be.true;
            expect(vocabulary.getClass('Person').isAncestorOf(managerClass)).to.be.true;
        });
    });

    describe('shared props', () => {
        let property: Property;

        beforeEach(() => {
            vocabulary.createClass('Planet');
            vocabulary.createClass('Asteroid');
            property = vocabulary.createProperty('PlanetaryBody/galaxy').setDomain('Planet', 'Asteroid');
        });

        it('should be defined as property of all shared types', () => {
            expect(vocabulary.getClass('Planet').hasProperty('PlanetaryBody/galaxy')).to.be.true;
            expect(vocabulary.getClass('Asteroid').hasProperty('PlanetaryBody/galaxy')).to.be.true;
        });

        it('should be removed from all shared types when removed', () => {
            vocabulary.removeProperty(property);
            expect(vocabulary.getClass('Planet').hasProperty('PlanetaryBody/galaxy')).to.be.false;
            expect(vocabulary.getClass('Asteroid').hasProperty('PlanetaryBody/galaxy')).to.be.false;
        });

        it('should not remove from all types when removed from one', () => {
            vocabulary.getClass('Planet').removeProperty(property);
            expect(vocabulary.getClass('Planet').hasProperty('PlanetaryBody/galaxy')).to.be.false;
            expect(vocabulary.getClass('Asteroid').hasProperty('PlanetaryBody/galaxy')).to.be.true;
        });

        it('should not be removed from vocabulary when removed from all types', () => {
            vocabulary.getClass('Planet').removeProperty(property, true);
            vocabulary.getClass('Asteroid').removeProperty(property, true);
            expect(vocabulary.getClass('Planet').hasProperty('PlanetaryBody/galaxy')).to.be.false;
            expect(vocabulary.getClass('Asteroid').hasProperty('PlanetaryBody/galaxy')).to.be.false;
            expect(vocabulary.hasResource(property.id)).to.be.false;
        });

        it('should be defined as property of all shared types after id change', () => {
            property.id = 'PlanetaryBody/galaxy2';
            expect(vocabulary.getClass('Planet').hasProperty('PlanetaryBody/galaxy2')).to.be.true;
            expect(vocabulary.getClass('Asteroid').hasProperty('PlanetaryBody/galaxy2')).to.be.true;
        });

        it('should retain term definition after id change', () => {
            property.term = 'galaxy';
            property.container = ContainerType.list;
            property.valueType = ValueType.id;

            property.id = 'PlanetaryBody/galaxy2';
            expect(property.container).to.equal(ContainerType.list);
            expect(property.valueType).to.equal(ValueType.id);
        });
    });

    describe('instances', () => {
        beforeEach(() => {
            const personClass = vocabulary.createClass('Person');
            personClass.createProperty('Person/firstName').setRange('xsd:string').term = 'firstName';
            personClass.createProperty('Person/lastName').setRange('xsd:string').term = 'lastName';

            const employeeClass = personClass.createSubClass('Employee');
            employeeClass.createProperty('Employee/level').setRange('xsd:integer').term = 'level';
            employeeClass.createProperty('Employee/managedBy').setRange(employeeClass).term = 'managedBy';
            employeeClass.getProperty('Employee/managedBy').valueType = ValueType.id;

            const managerClass = employeeClass.createSubClass('Manager');
            managerClass.createProperty('Manager/manages').setRange(employeeClass);
            managerClass.getProperty('Manager/manages').term = 'manages';
            managerClass.getProperty('Manager/manages').valueType = ValueType.vocab;
            managerClass.getProperty('Manager/manages').container = ContainerType.set;

            vocabulary.createInstance('Person/persons/johnd', 'Person');
            vocabulary.createInstance('Person/persons/janed', employeeClass);
            vocabulary.createInstance('Person/persons/jilld', managerClass);
            vocabulary.createInstance('Person/persons/jaked', employeeClass, 'Manager');
        });

        it('should have created instances', () => {
            expect(vocabulary.instances.count()).to.equal(4);
            expect(vocabulary.hasInstance('Person/persons/johnd')).to.be.true;
            expect(vocabulary.hasInstance('Person/persons/janed')).to.be.true;
            expect(vocabulary.hasInstance('Person/persons/jilld')).to.be.true;
        });

        it('should have correct type references', () => {
            expect(vocabulary.getInstance('Person/persons/johnd').isInstanceOf('Person')).to.be.true;
            expect(vocabulary.getInstance('Person/persons/janed').isInstanceOf('Employee')).to.be.true;
            expect(vocabulary.getInstance('Person/persons/jilld').isInstanceOf('Manager')).to.be.true;
            expect(vocabulary.getInstance('Person/persons/jaked').isInstanceOf('Employee')).to.be.true;
            expect(vocabulary.getInstance('Person/persons/jaked').isInstanceOf('Manager')).to.be.true;
        });

        it('should allow enumerating properties', () => {
            const instance = vocabulary.getInstance('Person/persons/johnd');
            expect(instance.properties.count()).to.be.equal(2);
            expect(instance.getProperty('Person/firstName')).to.be.ok;
            expect(instance.getProperty('Person/lastName')).to.be.ok;
        });

        it('should allow setting primitive property values', () => {
            const instance = vocabulary.getInstance('Person/persons/johnd');
            instance.getProperty('Person/firstName').value = 'John';
            instance.getProperty('Person/lastName').value = 'Doe';

            expect(instance.getProperty('Person/firstName').value).to.equal('John');
            expect(instance.getProperty('Person/lastName').value).to.equal('Doe');
        });

        it('should allow setting primitive property values using context terms', () => {
            const instance = vocabulary.getInstance<{ firstName: string, lastName: string }>('Person/persons/johnd');
            instance.firstName = 'John';
            instance.lastName = 'Doe';

            expect(instance.firstName).to.equal('John');
            expect(instance.lastName).to.equal('Doe');
        });

        it('should allow setting primitive property values using accessors', () => {
            const instance = vocabulary.getInstance<{ firstName: string, lastName: string }>('Person/persons/johnd');
            instance['Person/firstName'] = 'John';
            instance['Person/lastName'] = 'Doe';

            expect(instance.firstName).to.equal('John');
            expect(instance['Person/lastName']).to.equal('Doe');
        });

        it('should allow setting reference property values', () => {
            const instance = vocabulary.getInstance('Person/persons/janed');
            instance.getProperty('Employee/managedBy').value = vocabulary.getInstance('Person/persons/jilld');
            expect(instance.getProperty('Employee/managedBy').value).to.be.ok;
            expect(instance.getProperty('Employee/managedBy').value).instanceOf(Instance);
            expect(instance.getProperty('Employee/managedBy').value.id).to.equal('Person/persons/jilld');
            expect(vocabulary.getInstance('Person/persons/jilld').getReferrers('Employee/managedBy').count()).to.be.equal(1);
        });

        it('should allow setting reference property value using context terms', () => {
            type instanceType = { managedBy: Instance };
            const instance = vocabulary.getInstance<{ managedBy: Instance & instanceType }>('Person/persons/janed');
            instance.managedBy = vocabulary.getInstance('Person/persons/jilld');

            expect(instance.managedBy).to.be.ok;
            expect(instance.managedBy).instanceOf(Instance);
            expect(instance.managedBy.id).to.equal('Person/persons/jilld');
            expect(instance.managedBy.getReferrers('Employee/managedBy').count()).to.be.equal(1);
            expect(instance.managedBy.getReferrers('Employee/managedBy').first().id).to.equal('Person/persons/janed');
        });

        it('should allow overriding reference property value', () => {
            const instance = vocabulary.getInstance('Person/persons/janed');

            instance.getProperty('Employee/managedBy').value = vocabulary.getInstance('Person/persons/jilld');
            expect(instance.getProperty('Employee/managedBy').value.id).to.equal('Person/persons/jilld');
            expect(vocabulary.getInstance('Person/persons/jilld').getReferrers('Employee/managedBy').count()).to.be.equal(1);

            instance.getProperty('Employee/managedBy').value = vocabulary.getInstance('Person/persons/jaked');
            expect(instance.getProperty('Employee/managedBy').value.id).to.equal('Person/persons/jaked');
            expect(vocabulary.getInstance('Person/persons/jilld').getReferrers('Employee/managedBy').count()).to.be.equal(0);
            expect(vocabulary.getInstance('Person/persons/jaked').getReferrers('Employee/managedBy').count()).to.be.equal(1);
        });

        it('should allow overriding reference property value using accessors', () => {
            type instanceType = { managedBy: Instance };
            const instance = vocabulary.getInstance<{ managedBy: Instance & instanceType }>('Person/persons/janed');
            instance.managedBy = vocabulary.getInstance('Person/persons/jilld');

            instance.managedBy = vocabulary.getInstance('Person/persons/jilld');
            expect(instance.managedBy.id).to.equal('Person/persons/jilld');

            instance.managedBy = vocabulary.getInstance('Person/persons/jaked');
            expect(instance.managedBy.id).to.equal('Person/persons/jaked');
            expect(vocabulary.getInstance('Person/persons/jilld').getReferrers('Employee/managedBy').count()).to.be.equal(0);
            expect(vocabulary.getInstance('Person/persons/jaked').getReferrers('Employee/managedBy').count()).to.be.equal(1);
        });

        it('should throw when attempting to set value for container property', () => {
            const instance = vocabulary.getInstance('Person/persons/jaked');
            expect(() => instance.getProperty('Manager/manages').value = vocabulary.getInstance('Person/persons/janed')).to.throw(Errors.InstancePropertyValueError);
        });

        it('should throw when attempting to set value for container property using terms', () => {
            const instance = vocabulary.getInstance<{ manages: any }>('Person/persons/jaked');
            expect(() => instance.manages = vocabulary.getInstance('Person/persons/janed')).to.throw(Errors.InstancePropertyValueError);
        });

        it('should allow adding values to container properties', () => {
            const instance = vocabulary.getInstance('Person/persons/jaked');
            instance.getProperty('Manager/manages').value.add(vocabulary.getInstance('Person/persons/janed'));
            instance.getProperty('Manager/manages').value.add(vocabulary.getInstance('Person/persons/jilld'));

            expect(instance.getProperty('Manager/manages').value.count).to.equal(2);
            expect([...instance.getProperty('Manager/manages').value].some((x: any) => x.id === 'Person/persons/janed')).to.be.true;
            expect([...instance.getProperty('Manager/manages').value].some((x: any) => x.id === 'Person/persons/jilld')).to.be.true;
        });

        it('should allow adding values for container properties using term', () => {
            const instance = vocabulary.getInstance<{ manages: ContainerPropertyValues<Instance> }>('Person/persons/jaked');
            instance.manages.add(vocabulary.getInstance('Person/persons/janed'));
            instance.manages.add(vocabulary.getInstance('Person/persons/jilld'));

            expect(instance.manages.count).to.equal(2);
            expect([...instance.manages].some((x: any) => x.id === 'Person/persons/janed')).to.be.true;
            expect([...instance.manages].some((x: any) => x.id === 'Person/persons/jilld')).to.be.true;
        });

        it('should allow removing values from container properties', () => {
            const instance = vocabulary.getInstance('Person/persons/jaked');
            instance.getProperty('Manager/manages').value.add(vocabulary.getInstance('Person/persons/janed'));
            instance.getProperty('Manager/manages').value.add(vocabulary.getInstance('Person/persons/jilld'));

            expect(instance.getProperty('Manager/manages').value.count).to.equal(2);

            instance.getProperty('Manager/manages').value.remove('Person/persons/jilld');
            expect(instance.getProperty('Manager/manages').value.count).to.equal(1);
            expect([...instance.getProperty('Manager/manages').value].some((x: any) => x.id === 'Person/persons/janed')).to.be.true;
            expect([...instance.getProperty('Manager/manages').value].some((x: any) => x.id === 'Person/persons/jilld')).to.be.false;
        });

        it('should allow removing values from container using term', () => {
            const instance = vocabulary.getInstance<{ manages: ContainerPropertyValues<Instance> }>('Person/persons/jaked');
            instance.manages.add(vocabulary.getInstance('Person/persons/janed'));
            instance.manages.add(vocabulary.getInstance('Person/persons/jilld'));

            expect(instance.manages.count).to.equal(2);

            instance.manages.remove('Person/persons/jilld');
            expect(instance.manages.count).to.equal(1);
            expect([...instance.manages].some((x: any) => x.id === 'Person/persons/janed')).to.be.true;
            expect([...instance.manages].some((x: any) => x.id === 'Person/persons/jilld')).to.be.false;
        });

        it('should allow clearing values from container properties', () => {
            const instance = vocabulary.getInstance('Person/persons/jaked');
            instance.getProperty('Manager/manages').value.add(vocabulary.getInstance('Person/persons/janed'));
            instance.getProperty('Manager/manages').value.add(vocabulary.getInstance('Person/persons/jilld'));

            expect(instance.getProperty('Manager/manages').value.count).to.equal(2);

            instance.getProperty('Manager/manages').value.clear();
            expect(instance.getProperty('Manager/manages').value.count).to.equal(0);
        });

        it('should allow clearing values from container properties using term', () => {
            const instance = vocabulary.getInstance<{ manages: ContainerPropertyValues<Instance> }>('Person/persons/jaked');
            instance.manages.add(vocabulary.getInstance('Person/persons/janed'));
            instance.manages.add(vocabulary.getInstance('Person/persons/jilld'));

            expect(instance.manages.count).to.equal(2);

            instance.manages.clear();
            expect(instance.manages.count).to.equal(0);
        });
    });
});