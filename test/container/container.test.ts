import { expect } from "chai";
import * as sinon from "sinon";
import { injectable } from "../../src/annotation/injectable";
import * as ERROR_MSGS from "../../src/constants/error_msgs";
import { BindingScopeEnum } from "../../src/constants/literal_types";
import { Container } from "../../src/container/container";
import { ContainerModule } from "../../src/container/container_module";
import { interfaces } from "../../src/interfaces/interfaces";
import { getBindingDictionary } from "../../src/planning/planner";
import { getServiceIdentifierAsString } from "../../src/utils/serialization";

type Dictionary = Map<interfaces.ServiceIdentifier<any>, interfaces.Binding<any>[]>;

describe("Container", () => {

    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("Should be able to use modules as configuration", () => {

      interface Ninja {}
      interface Katana {}
      interface Shuriken {}

      @injectable()
      class Katana implements Katana {}

      @injectable()
      class Shuriken implements Shuriken {}

      @injectable()
      class Ninja implements Ninja {}

      const warriors = new ContainerModule((bind: interfaces.Bind) => {
          bind<Ninja>("Ninja").to(Ninja);
      });

      const weapons = new ContainerModule((bind: interfaces.Bind) => {
          bind<Katana>("Katana").to(Katana);
          bind<Shuriken>("Shuriken").to(Shuriken);
      });

      const container = new Container();
      container.load(warriors, weapons);

      let map: Dictionary = getBindingDictionary(container).getMap();
      expect(map.has("Ninja")).equal(true);
      expect(map.has("Katana")).equal(true);
      expect(map.has("Shuriken")).equal(true);
      expect(map.size).equal(3);

      const tryGetNinja = () => { container.get("Ninja"); };
      const tryGetKatana = () => { container.get("Katana"); };
      const tryGetShuruken = () => { container.get("Shuriken"); };

      container.unload(warriors);
      map = getBindingDictionary(container).getMap();
      expect(map.size).equal(2);
      expect(tryGetNinja).to.throw(ERROR_MSGS.NOT_REGISTERED);
      expect(tryGetKatana).not.to.throw();
      expect(tryGetShuruken).not.to.throw();

      container.unload(weapons);
      map = getBindingDictionary(container).getMap();
      expect(map.size).equal(0);
      expect(tryGetNinja).to.throw(ERROR_MSGS.NOT_REGISTERED);
      expect(tryGetKatana).to.throw(ERROR_MSGS.NOT_REGISTERED);
      expect(tryGetShuruken).to.throw(ERROR_MSGS.NOT_REGISTERED);

  });

    it("Should be able to store bindings", () => {

      interface Ninja {}

      @injectable()
      class Ninja implements Ninja {}
      const ninjaId = "Ninja";

      const container = new Container();
      container.bind<Ninja>(ninjaId).to(Ninja);

      const map: Dictionary = getBindingDictionary(container).getMap();
      expect(map.size).equal(1);
      expect(map.has(ninjaId)).equal(true);

  });

    it("Should have an unique identifier", () => {

      const container1 = new Container();
      const container2 = new Container();
      expect(container1.id).to.be.a("number");
      expect(container2.id).to.be.a("number");
      expect(container1.id).not.equal(container2.id);

  });

    it("Should unbind a binding when requested", () => {

      interface Ninja {}

      @injectable()
      class Ninja implements Ninja {}
      const ninjaId = "Ninja";

      const container = new Container();
      container.bind<Ninja>(ninjaId).to(Ninja);

      const map: Dictionary = getBindingDictionary(container).getMap();
      expect(map.has(ninjaId)).equal(true);

      container.unbind(ninjaId);
      expect(map.has(ninjaId)).equal(false);
      expect(map.size).equal(0);

  });

    it("Should throw when cannot unbind", () => {
      const serviceIdentifier = "Ninja";
      const container = new Container();
      const throwFunction = () => { container.unbind("Ninja"); };
      expect(throwFunction).to.throw(`${ERROR_MSGS.CANNOT_UNBIND} ${getServiceIdentifierAsString(serviceIdentifier)}`);
  });

    it("Should unbind a binding when requested", () => {

      interface Ninja {}

      @injectable()
      class Ninja implements Ninja {}
      interface Samurai {}

      @injectable()
      class Samurai implements Samurai {}

      const ninjaId = "Ninja";
      const samuraiId = "Samurai";

      const container = new Container();
      container.bind<Ninja>(ninjaId).to(Ninja);
      container.bind<Samurai>(samuraiId).to(Samurai);

      let map: Dictionary = getBindingDictionary(container).getMap();

      expect(map.size).equal(2);
      expect(map.has(ninjaId)).equal(true);
      expect(map.has(samuraiId)).equal(true);

      container.unbind(ninjaId);
      map = getBindingDictionary(container).getMap();
      expect(map.size).equal(1);

  });

    it("Should be able unbound all dependencies", () => {

      interface Ninja {}

      @injectable()
      class Ninja implements Ninja {}

      interface Samurai {}

      @injectable()
      class Samurai implements Samurai {}

      const ninjaId = "Ninja";
      const samuraiId = "Samurai";

      const container = new Container();
      container.bind<Ninja>(ninjaId).to(Ninja);
      container.bind<Samurai>(samuraiId).to(Samurai);

      let map: Dictionary = getBindingDictionary(container).getMap();

      expect(map.size).equal(2);
      expect(map.has(ninjaId)).equal(true);
      expect(map.has(samuraiId)).equal(true);

      container.unbindAll();
      map = getBindingDictionary(container).getMap();
      expect(map.size).equal(0);

  });

    it("Should NOT be able to get unregistered services", () => {

      interface Ninja {}

      @injectable()
      class Ninja implements Ninja {}
      const ninjaId = "Ninja";

      const container = new Container();
      const throwFunction = () => { container.get<Ninja>(ninjaId); };

      expect(throwFunction).to.throw(`${ERROR_MSGS.NOT_REGISTERED} ${ninjaId}`);
  });

    it("Should NOT be able to get ambiguous match", () => {

      interface Warrior {}

      @injectable()
      class Ninja implements Warrior {}

      @injectable()
      class Samurai implements Warrior {}

      const warriorId = "Warrior";

      const container = new Container();
      container.bind<Warrior>(warriorId).to(Ninja);
      container.bind<Warrior>(warriorId).to(Samurai);

      const dictionary: Dictionary = getBindingDictionary(container).getMap();

      expect(dictionary.size).equal(1);
      dictionary.forEach((value, key) => {
          expect(key).equal(warriorId);
          expect(value.length).equal(2);
      });

      const throwFunction = () => { container.get<Warrior>(warriorId); };
      expect(throwFunction).to.throw(`${ERROR_MSGS.AMBIGUOUS_MATCH} ${warriorId}`);

  });

    it("Should NOT be able to getAll of an unregistered services", () => {

      interface Ninja {}

      @injectable()
      class Ninja implements Ninja {}
      const ninjaId = "Ninja";

      const container = new Container();
      const throwFunction = () => { container.getAll<Ninja>(ninjaId); };

      expect(throwFunction).to.throw(`${ERROR_MSGS.NOT_REGISTERED} ${ninjaId}`);

  });

    it("Should be able to get a string literal identifier as a string", () => {
        const Katana = "Katana";
        const KatanaStr = getServiceIdentifierAsString(Katana);
        expect(KatanaStr).to.equal("Katana");
    });

    it("Should be able to get a symbol identifier as a string", () => {
        const KatanaSymbol = Symbol.for("Katana");
        const KatanaStr = getServiceIdentifierAsString(KatanaSymbol);
        expect(KatanaStr).to.equal("Symbol(Katana)");
    });

    it("Should be able to get a class identifier as a string", () => {
        class Katana {}
        const KatanaStr = getServiceIdentifierAsString(Katana);
        expect(KatanaStr).to.equal("Katana");
    });

    it("Should be able to snapshot and restore container", () => {

        interface Warrior {
        }

        @injectable()
        class Ninja implements Warrior {}

        @injectable()
        class Samurai implements Warrior {}

        const container = new Container();
        container.bind<Warrior>(Ninja).to(Ninja);
        container.bind<Warrior>(Samurai).to(Samurai);

        expect(container.get(Samurai)).to.be.instanceOf(Samurai);
        expect(container.get(Ninja)).to.be.instanceOf(Ninja);

        container.snapshot(); // snapshot container = v1

        container.unbind(Ninja);
        expect(container.get(Samurai)).to.be.instanceOf(Samurai);
        expect(() => container.get(Ninja)).to.throw();

        container.snapshot(); // snapshot container = v2
        expect(() => container.get(Ninja)).to.throw();

        container.bind<Warrior>(Ninja).to(Ninja);
        expect(container.get(Samurai)).to.be.instanceOf(Samurai);
        expect(container.get(Ninja)).to.be.instanceOf(Ninja);

        container.restore(); // restore container to v2
        expect(container.get(Samurai)).to.be.instanceOf(Samurai);
        expect(() => container.get(Ninja)).to.throw();

        container.restore(); // restore container to v1
        expect(container.get(Samurai)).to.be.instanceOf(Samurai);
        expect(container.get(Ninja)).to.be.instanceOf(Ninja);

        expect(() => container.restore()).to.throw(ERROR_MSGS.NO_MORE_SNAPSHOTS_AVAILABLE);
    });

    it("Should be able to check is there are bindings available for a given identifier", () => {

        interface Warrior {}
        const warriorId = "Warrior";
        const warriorSymbol = Symbol.for("Warrior");

        @injectable()
        class Ninja implements Warrior {}

        const container = new Container();
        container.bind<Warrior>(Ninja).to(Ninja);
        container.bind<Warrior>(warriorId).to(Ninja);
        container.bind<Warrior>(warriorSymbol).to(Ninja);

        expect(container.isBound(Ninja)).equal(true);
        expect(container.isBound(warriorId)).equal(true);
        expect(container.isBound(warriorSymbol)).equal(true);

        interface Katana {}
        const katanaId = "Katana";
        const katanaSymbol = Symbol.for("Katana");

        @injectable()
        class Katana implements Katana {}

        expect(container.isBound(Katana)).equal(false);
        expect(container.isBound(katanaId)).equal(false);
        expect(container.isBound(katanaSymbol)).equal(false);

    });

    it("Should be able to get services from parent container", () => {
        const weaponIdentifier = "Weapon";

        @injectable()
        class Katana {}

        const container = new Container();
        container.bind(weaponIdentifier).to(Katana);

        const childContainer = new Container();
        childContainer.parent = container;

        const secondChildContainer = new Container();
        secondChildContainer.parent = childContainer;

        expect(secondChildContainer.get(weaponIdentifier)).to.be.instanceOf(Katana);
    });

    it("Should be able to check if services are bound from parent container", () => {
        const weaponIdentifier = "Weapon";

        @injectable()
        class Katana {}

        const container = new Container();
        container.bind(weaponIdentifier).to(Katana);

        const childContainer = new Container();
        childContainer.parent = container;

        const secondChildContainer = new Container();
        secondChildContainer.parent = childContainer;

        expect(secondChildContainer.isBound(weaponIdentifier)).to.be.equal(true);
    });

    it("Should prioritize requested container to resolve a service identifier", () => {
        const weaponIdentifier = "Weapon";

        @injectable()
        class Katana {}

        @injectable()
        class DivineRapier {}

        const container = new Container();
        container.bind(weaponIdentifier).to(Katana);

        const childContainer = new Container();
        childContainer.parent = container;

        const secondChildContainer = new Container();
        secondChildContainer.parent = childContainer;
        secondChildContainer.bind(weaponIdentifier).to(DivineRapier);

        expect(secondChildContainer.get(weaponIdentifier)).to.be.instanceOf(DivineRapier);
    });

    it("Should be able to resolve named multi-injection", async () => {

        interface Intl {
            hello?: string;
            goodbye?: string;
        }

        const container = new Container();
        container.bind<Intl>("Intl").toConstantValue({ hello: "bonjour" }).whenTargetNamed("fr");
        container.bind<Intl>("Intl").toConstantValue({ goodbye: "au revoir" }).whenTargetNamed("fr");
        container.bind<Intl>("Intl").toConstantValue({ hello: "hola" }).whenTargetNamed("es");
        container.bind<Intl>("Intl").toConstantValue({ goodbye: "adios" }).whenTargetNamed("es");

        const fr = await container.getAllNamed<Intl>("Intl", "fr");
        expect(fr.length).to.equal(2);
        expect(fr[0].hello).to.equal("bonjour");
        expect(fr[1].goodbye).to.equal("au revoir");

        const es = await container.getAllNamed<Intl>("Intl", "es");
        expect(es.length).to.equal(2);
        expect(es[0].hello).to.equal("hola");
        expect(es[1].goodbye).to.equal("adios");

    });

    it("Should be able to resolve tagged multi-injection", async () => {

        interface Intl {
            hello?: string;
            goodbye?: string;
        }

        const container = new Container();
        container.bind<Intl>("Intl").toConstantValue({ hello: "bonjour" }).whenTargetTagged("lang", "fr");
        container.bind<Intl>("Intl").toConstantValue({ goodbye: "au revoir" }).whenTargetTagged("lang", "fr");
        container.bind<Intl>("Intl").toConstantValue({ hello: "hola" }).whenTargetTagged("lang", "es");
        container.bind<Intl>("Intl").toConstantValue({ goodbye: "adios" }).whenTargetTagged("lang", "es");

        const fr = await container.getAllTagged<Intl>("Intl", "lang", "fr");
        expect(fr.length).to.equal(2);
        expect(fr[0].hello).to.equal("bonjour");
        expect(fr[1].goodbye).to.equal("au revoir");

        const es = await container.getAllTagged<Intl>("Intl", "lang", "es");
        expect(es.length).to.equal(2);
        expect(es[0].hello).to.equal("hola");
        expect(es[1].goodbye).to.equal("adios");

    });

    it("Should be able configure the default scope at a global level", async () => {

        interface Warrior {
            health: number;
            takeHit(damage: number): void;
        }

        @injectable()
        class Ninja implements Warrior {
            public health: number;
            public constructor() {
                this.health = 100;
            }
            public takeHit(damage: number) {
                this.health = this.health - damage;
            }
        }

        const TYPES = {
            Warrior: "Warrior"
        };

        const container1 = new Container();
        container1.bind<Warrior>(TYPES.Warrior).to(Ninja);

        const transientNinja1 = await container1.get<Warrior>(TYPES.Warrior);
        expect(transientNinja1.health).to.equal(100);
        transientNinja1.takeHit(10);
        expect(transientNinja1.health).to.equal(90);

        const transientNinja2 = await container1.get<Warrior>(TYPES.Warrior);
        expect(transientNinja2.health).to.equal(100);
        transientNinja2.takeHit(10);
        expect(transientNinja2.health).to.equal(90);

        const container2 = new Container({ defaultScope: BindingScopeEnum.Singleton });
        container2.bind<Warrior>(TYPES.Warrior).to(Ninja);

        const singletonNinja1 = await container2.get<Warrior>(TYPES.Warrior);
        expect(singletonNinja1.health).to.equal(100);
        singletonNinja1.takeHit(10);
        expect(singletonNinja1.health).to.equal(90);

        const singletonNinja2 = await container2.get<Warrior>(TYPES.Warrior);
        expect(singletonNinja2.health).to.equal(90);
        singletonNinja2.takeHit(10);
        expect(singletonNinja2.health).to.equal(80);

    });

    it("Should be able to configure automatic binding for @injectable() decorated classes", async () => {

        @injectable()
        class Katana {}

        @injectable()
        class Shuriken {}

        @injectable()
        class Ninja {
            public constructor(public weapon: Katana) {}
        }

        class Samurai {}

        const container1 = new Container({autoBindInjectable: true});
        const katana1 = await container1.get(Katana);
        const ninja1 = await container1.get(Ninja);
        expect(katana1).to.be.an.instanceof(Katana);
        expect(katana1).to.not.equal(container1.get(Katana));
        expect(ninja1).to.be.an.instanceof(Ninja);
        expect(ninja1).to.not.equal(container1.get(Ninja));
        expect(ninja1.weapon).to.be.an.instanceof(Katana);
        expect(ninja1.weapon).to.not.equal((await container1.get(Ninja)).weapon);
        expect(ninja1.weapon).to.not.equal(katana1);

        const container2 = new Container({defaultScope: BindingScopeEnum.Singleton, autoBindInjectable: true});
        const katana2 = await container2.get(Katana);
        const ninja2 = await container2.get(Ninja);
        expect(katana2).to.be.an.instanceof(Katana);
        expect(katana2).to.equal(container2.get(Katana));
        expect(ninja2).to.be.an.instanceof(Ninja);
        expect(ninja2).to.equal(container2.get(Ninja));
        expect(ninja2.weapon).to.be.an.instanceof(Katana);
        expect(ninja2.weapon).to.equal((await container2.get(Ninja)).weapon);
        expect(ninja2.weapon).to.equal(katana2);

        const container3 = new Container({autoBindInjectable: true});
        container3.bind(Katana).toSelf().inSingletonScope();
        const katana3 = await container3.get(Katana);
        const ninja3 = await container3.get(Ninja);
        expect(katana3).to.be.an.instanceof(Katana);
        expect(katana3).to.equal(container3.get(Katana));
        expect(ninja3).to.be.an.instanceof(Ninja);
        expect(ninja3).to.not.equal(container3.get(Ninja));
        expect(ninja3.weapon).to.be.an.instanceof(Katana);
        expect(ninja3.weapon).to.equal((await container3.get(Ninja)).weapon);
        expect(ninja3.weapon).to.equal(katana3);

        const container4 = new Container({autoBindInjectable: true});
        container4.bind(Katana).to(Shuriken);
        const katana4 = await container4.get(Katana);
        const ninja4 = await container4.get(Ninja);
        expect(katana4).to.be.an.instanceof(Shuriken);
        expect(katana4).to.not.equal(container4.get(Katana));
        expect(ninja4).to.be.an.instanceof(Ninja);
        expect(ninja4).to.not.equal(container4.get(Ninja));
        expect(ninja4.weapon).to.be.an.instanceof(Shuriken);
        expect(ninja4.weapon).to.not.equal((await container4.get(Ninja)).weapon);
        expect(ninja4.weapon).to.not.equal(katana4);

        const container5 = new Container({autoBindInjectable: true});
        expect(() => container5.get(Samurai)).to.throw(ERROR_MSGS.NOT_REGISTERED);

    });

    it("Should be throw an exception if incorrect options is provided", () => {

        const invalidOptions1: any = () => 0;
        const wrong1 = () => new Container(invalidOptions1);
        expect(wrong1).to.throw(`${ERROR_MSGS.CONTAINER_OPTIONS_MUST_BE_AN_OBJECT}`);

        const invalidOptions2: any = { autoBindInjectable: "wrongValue" };
        const wrong2 = () => new Container(invalidOptions2);
        expect(wrong2).to.throw(`${ERROR_MSGS.CONTAINER_OPTIONS_INVALID_AUTO_BIND_INJECTABLE}`);

        const invalidOptions3: any = { defaultScope: "wrongValue" };
        const wrong3 = () => new Container(invalidOptions3);
        expect(wrong3).to.throw(`${ERROR_MSGS.CONTAINER_OPTIONS_INVALID_DEFAULT_SCOPE}`);

    });

    it("Should be able to merge multiple containers", async () => {

        @injectable()
        class Ninja {
            public name = "Ninja";
        }

        @injectable()
        class Shuriken {
            public name = "Shuriken";
        }

        const CHINA_EXPANSION_TYPES = {
            Ninja: "Ninja",
            Shuriken: "Shuriken"
        };

        const chinaExpansionContainer = new Container();
        chinaExpansionContainer.bind<Ninja>(CHINA_EXPANSION_TYPES.Ninja).to(Ninja);
        chinaExpansionContainer.bind<Shuriken>(CHINA_EXPANSION_TYPES.Shuriken).to(Shuriken);

        @injectable()
        class Samurai {
            public name = "Samurai";
        }

        @injectable()
        class Katana {
            public name = "Katana";
        }

        const JAPAN_EXPANSION_TYPES = {
            Katana: "Katana",
            Samurai: "Samurai"
        };

        const japanExpansionContainer = new Container();
        japanExpansionContainer.bind<Samurai>(JAPAN_EXPANSION_TYPES.Samurai).to(Samurai);
        japanExpansionContainer.bind<Katana>(JAPAN_EXPANSION_TYPES.Katana).to(Katana);

        const gameContainer = Container.merge(chinaExpansionContainer, japanExpansionContainer);
        expect((await gameContainer.get<Ninja>(CHINA_EXPANSION_TYPES.Ninja)).name).to.equal("Ninja");
        expect((await gameContainer.get<Shuriken>(CHINA_EXPANSION_TYPES.Shuriken)).name).to.equal("Shuriken");
        expect((await gameContainer.get<Samurai>(JAPAN_EXPANSION_TYPES.Samurai)).name).to.equal("Samurai");
        expect((await gameContainer.get<Katana>(JAPAN_EXPANSION_TYPES.Katana)).name).to.equal("Katana");

    });

    it("Should be able create a child containers", () => {
        const parent = new Container();
        const child = parent.createChild();
        if (child.parent === null) {
            throw new Error("Parent should not be null");
        }
        expect(child.parent.id).to.equal(parent.id);
    });

    it("Should inherit parent container options", () => {
        @injectable()
        class Warrior { }

        const parent = new Container({
            defaultScope: BindingScopeEnum.Singleton
        });

        const child = parent.createChild();
        child.bind(Warrior).toSelf();

        const singletonWarrior1 = child.get(Warrior);
        const singletonWarrior2 = child.get(Warrior);
        expect(singletonWarrior1).to.equal(singletonWarrior2);
    });

    it("Should be able to override options to child containers", () => {
        @injectable()
        class Warrior { }

        const parent = new Container({
            defaultScope: BindingScopeEnum.Request
        });

        const child = parent.createChild({
            defaultScope: BindingScopeEnum.Singleton
        });
        child.bind(Warrior).toSelf();

        const singletonWarrior1 = child.get(Warrior);
        const singletonWarrior2 = child.get(Warrior);
        expect(singletonWarrior1).to.equal(singletonWarrior2);
    });

    it("Should be able check if a named binding is bound", () => {

        const zero = "Zero";
        const invalidDivisor = "InvalidDivisor";
        const validDivisor = "ValidDivisor";
        const container = new Container();

        expect(container.isBound(zero)).to.equal(false);
        container.bind<number>(zero).toConstantValue(0);
        expect(container.isBound(zero)).to.equal(true);

        container.unbindAll();
        expect(container.isBound(zero)).to.equal(false);
        container.bind<number>(zero).toConstantValue(0).whenTargetNamed(invalidDivisor);
        expect(container.isBoundNamed(zero, invalidDivisor)).to.equal(true);
        expect(container.isBoundNamed(zero, validDivisor)).to.equal(false);

        container.bind<number>(zero).toConstantValue(1).whenTargetNamed(validDivisor);
        expect(container.isBoundNamed(zero, invalidDivisor)).to.equal(true);
        expect(container.isBoundNamed(zero, validDivisor)).to.equal(true);

    });

    it("Should be able to check if a named binding is bound from parent container", () => {

        const zero = "Zero";
        const invalidDivisor = "InvalidDivisor";
        const validDivisor = "ValidDivisor";
        const container = new Container();
        const childContainer = container.createChild();
        const secondChildContainer = childContainer.createChild();

        container.bind<number>(zero).toConstantValue(0).whenTargetNamed(invalidDivisor);
        expect(secondChildContainer.isBoundNamed(zero, invalidDivisor)).to.equal(true);
        expect(secondChildContainer.isBoundNamed(zero, validDivisor)).to.equal(false);

        container.bind<number>(zero).toConstantValue(1).whenTargetNamed(validDivisor);
        expect(secondChildContainer.isBoundNamed(zero, invalidDivisor)).to.equal(true);
        expect(secondChildContainer.isBoundNamed(zero, validDivisor)).to.equal(true);

    });

    it("Should be able to get a tagged binding", () => {

        const zero = "Zero";
        const isValidDivisor = "IsValidDivisor";
        const container = new Container();

        container.bind<number>(zero).toConstantValue(0).whenTargetTagged(isValidDivisor, false);
        expect(container.getTagged(zero, isValidDivisor, false)).to.equal(0);

        container.bind<number>(zero).toConstantValue(1).whenTargetTagged(isValidDivisor, true);
        expect(container.getTagged(zero, isValidDivisor, false)).to.equal(0);
        expect(container.getTagged(zero, isValidDivisor, true)).to.equal(1);

    });

    it("Should be able to get a tagged binding from parent container", () => {

        const zero = "Zero";
        const isValidDivisor = "IsValidDivisor";
        const container = new Container();
        const childContainer = container.createChild();
        const secondChildContainer = childContainer.createChild();

        container.bind<number>(zero).toConstantValue(0).whenTargetTagged(isValidDivisor, false);
        container.bind<number>(zero).toConstantValue(1).whenTargetTagged(isValidDivisor, true);
        expect(secondChildContainer.getTagged(zero, isValidDivisor, false)).to.equal(0);
        expect(secondChildContainer.getTagged(zero, isValidDivisor, true)).to.equal(1);

    });

    it("Should be able check if a tagged binding is bound", () => {

        const zero = "Zero";
        const isValidDivisor = "IsValidDivisor";
        const container = new Container();

        expect(container.isBound(zero)).to.equal(false);
        container.bind<number>(zero).toConstantValue(0);
        expect(container.isBound(zero)).to.equal(true);

        container.unbindAll();
        expect(container.isBound(zero)).to.equal(false);
        container.bind<number>(zero).toConstantValue(0).whenTargetTagged(isValidDivisor, false);
        expect(container.isBoundTagged(zero, isValidDivisor, false)).to.equal(true);
        expect(container.isBoundTagged(zero, isValidDivisor, true)).to.equal(false);

        container.bind<number>(zero).toConstantValue(1).whenTargetTagged(isValidDivisor, true);
        expect(container.isBoundTagged(zero, isValidDivisor, false)).to.equal(true);
        expect(container.isBoundTagged(zero, isValidDivisor, true)).to.equal(true);

    });

    it("Should be able to check if a tagged binding is bound from parent container", () => {

        const zero = "Zero";
        const isValidDivisor = "IsValidDivisor";
        const container = new Container();
        const childContainer = container.createChild();
        const secondChildContainer = childContainer.createChild();

        container.bind<number>(zero).toConstantValue(0).whenTargetTagged(isValidDivisor, false);
        expect(secondChildContainer.isBoundTagged(zero, isValidDivisor, false)).to.equal(true);
        expect(secondChildContainer.isBoundTagged(zero, isValidDivisor, true)).to.equal(false);

        container.bind<number>(zero).toConstantValue(1).whenTargetTagged(isValidDivisor, true);
        expect(secondChildContainer.isBoundTagged(zero, isValidDivisor, false)).to.equal(true);
        expect(secondChildContainer.isBoundTagged(zero, isValidDivisor, true)).to.equal(true);

    });

    it("Should be able to override a binding using rebind", async () => {

        const TYPES = {
            someType: "someType"
        };

        const container = new Container();
        container.bind<number>(TYPES.someType).toConstantValue(1);
        container.bind<number>(TYPES.someType).toConstantValue(2);

        const values1 = await container.getAll(TYPES.someType);
        expect(values1[0]).to.eq(1);
        expect(values1[1]).to.eq(2);

        container.rebind<number>(TYPES.someType).toConstantValue(3);
        const values2 = await container.getAll(TYPES.someType);
        expect(values2[0]).to.eq(3);
        expect(values2[1]).to.eq(undefined);

    });

});
