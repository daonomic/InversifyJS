import { Binding } from "../bindings/binding";
import * as ERROR_MSGS from "../constants/error_msgs";
import { BindingScopeEnum, TargetTypeEnum } from "../constants/literal_types";
import * as METADATA_KEY from "../constants/metadata_keys";
import { interfaces } from "../interfaces/interfaces";
import { MetadataReader } from "../planning/metadata_reader";
import { createMockRequest, plan } from "../planning/planner";
import { resolve } from "../resolution/resolver";
import { BindingToSyntax } from "../syntax/binding_to_syntax";
import { id } from "../utils/id";
import { getServiceIdentifierAsString } from "../utils/serialization";
import { ContainerSnapshot } from "./container_snapshot";
import { Lookup } from "./lookup";

abstract class ContainerBase implements interfaces.ContainerBase {

    public id: number;
    public readonly options: interfaces.ContainerOptions;
    protected _middleware: interfaces.Next | null;
    protected _bindingDictionary: interfaces.Lookup<interfaces.Binding<any>>;
    protected _snapshots: interfaces.ContainerSnapshot[];
    protected _metadataReader: interfaces.MetadataReader;

    public constructor(containerOptions?: interfaces.ContainerOptions) {
        const options = containerOptions || {};
        if (typeof options !== "object") {
            throw new Error(`${ERROR_MSGS.CONTAINER_OPTIONS_MUST_BE_AN_OBJECT}`);
        }

        if (options.defaultScope === undefined) {
            options.defaultScope = BindingScopeEnum.Transient;
        } else if (
            options.defaultScope !== BindingScopeEnum.Singleton &&
            options.defaultScope !== BindingScopeEnum.Transient &&
            options.defaultScope !== BindingScopeEnum.Request
        ) {
            throw new Error(`${ERROR_MSGS.CONTAINER_OPTIONS_INVALID_DEFAULT_SCOPE}`);
        }

        if (options.autoBindInjectable === undefined) {
            options.autoBindInjectable = false;
        } else if (
            typeof options.autoBindInjectable !== "boolean"
        ) {
            throw new Error(`${ERROR_MSGS.CONTAINER_OPTIONS_INVALID_AUTO_BIND_INJECTABLE}`);
        }

        if (options.skipBaseClassChecks === undefined) {
            options.skipBaseClassChecks = false;
        } else if (
            typeof options.skipBaseClassChecks !== "boolean"
        ) {
            throw new Error(`${ERROR_MSGS.CONTAINER_OPTIONS_INVALID_SKIP_BASE_CHECK}`);
        }

        this.options = {
            autoBindInjectable: options.autoBindInjectable,
            defaultScope: options.defaultScope,
            skipBaseClassChecks: options.skipBaseClassChecks
        };

        this.id = id();
        this._bindingDictionary = new Lookup<interfaces.Binding<any>>();
        this._snapshots = [];
        this._middleware = null;
        this._metadataReader = new MetadataReader();
    }

    public load(...modules: interfaces.ContainerModule[]) {

        const getHelpers = this._getContainerModuleHelpersFactory();

        for (const currentModule of modules) {

            const containerModuleHelpers = getHelpers(currentModule.id);

            currentModule.registry(
                containerModuleHelpers.bindFunction,
                containerModuleHelpers.unbindFunction,
                containerModuleHelpers.isboundFunction,
                containerModuleHelpers.rebindFunction
            );

        }

    }

    public async loadAsync(...modules: interfaces.AsyncContainerModule[]) {

        const getHelpers = this._getContainerModuleHelpersFactory();

        for (const currentModule of modules) {

            const containerModuleHelpers = getHelpers(currentModule.id);

            await currentModule.registry(
                containerModuleHelpers.bindFunction,
                containerModuleHelpers.unbindFunction,
                containerModuleHelpers.isboundFunction,
                containerModuleHelpers.rebindFunction
            );

        }

    }

    public unload(...modules: interfaces.ContainerModule[]): void {

        const conditionFactory = (expected: any) => (item: interfaces.Binding<any>): boolean =>
            item.moduleId === expected;

        modules.forEach((module) => {
            const condition = conditionFactory(module.id);
            this._bindingDictionary.removeByCondition(condition);
        });

    }

    // Removes a type binding from the registry by its key
    public unbind(serviceIdentifier: interfaces.ServiceIdentifier<any>): void {
        try {
            this._bindingDictionary.remove(serviceIdentifier);
        } catch (e) {
            throw new Error(`${ERROR_MSGS.CANNOT_UNBIND} ${getServiceIdentifierAsString(serviceIdentifier)}`);
        }
    }

    // Removes all the type bindings from the registry
    public unbindAll(): void {
        this._bindingDictionary = new Lookup<Binding<any>>();
    }

    // Allows to check if there are bindings available for serviceIdentifier
    public isBound(serviceIdentifier: interfaces.ServiceIdentifier<any>): boolean {
        return this._bindingDictionary.hasKey(serviceIdentifier);
    }

    public isBoundNamed(serviceIdentifier: interfaces.ServiceIdentifier<any>, named: string | number | symbol): boolean {
        return this.isBoundTagged(serviceIdentifier, METADATA_KEY.NAMED_TAG, named);
    }

    // Check if a binding with a complex constraint is available without throwing a error. Ancestors are also verified.
    public isBoundTagged(serviceIdentifier: interfaces.ServiceIdentifier<any>, key: string | number | symbol, value: any): boolean {
        let bound = false;

        // verify if there are bindings available for serviceIdentifier on current binding dictionary
        if (this._bindingDictionary.hasKey(serviceIdentifier)) {
            const bindings = this._bindingDictionary.get(serviceIdentifier);
            const request = createMockRequest(this, serviceIdentifier, key, value);
            bound = bindings.some((b) => b.constraint(request));
        }

        return bound;
    }

    public snapshot(): void {
        this._snapshots.push(ContainerSnapshot.of(this._bindingDictionary.clone(), this._middleware));
    }

    public restore(): void {
        const snapshot = this._snapshots.pop();
        if (snapshot === undefined) {
            throw new Error(ERROR_MSGS.NO_MORE_SNAPSHOTS_AVAILABLE);
        }
        this._bindingDictionary = snapshot.bindings;
        this._middleware = snapshot.middleware;
    }

    public applyCustomMetadataReader(metadataReader: interfaces.MetadataReader) {
        this._metadataReader = metadataReader;
    }

    protected abstract _getContainerModuleHelpersFactory(): void;

    public abstract applyMiddleware(...middleware: interfaces.Middleware[]): void;

}

export { ContainerBase };
