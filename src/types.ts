import { NextFunction, Request, RequestHandler, Response } from "express"
import { JsonTypes } from "majotools/dist/json"
import * as crypto from 'crypto';
import { createSecretHash, HashFunc } from "./hash";

export type Awaitable<T> = Promise<T> | PromiseLike<T> | T

export interface Session {
    id: string,
    new: boolean,
    [key: string]: JsonTypes
}

export interface Node {
    id: number,
    heartbeat: number,
    url: string,
}

export interface StatefullApiDatabase {
    registerNode(
        url: string,
    ): Awaitable<Node>,

    unregisterNode(
        id: number,
    ): Awaitable<Node | undefined>,

    tickNode(
        id: number,
    ): Awaitable<Node | undefined>,

    getNodeById(
        id: number,
    ): Awaitable<Node | undefined>,

    getNodeByUrl(
        url: string,
    ): Awaitable<Node | undefined>,

    getNodes(): Awaitable<Node[]>,
    getNodeIds(): Awaitable<number[]>,
}

export type AllocateNodeCallback = (
    req: Request<any>,
    res: Response<any>,
    settings: StatefullApiSettings,
) => Awaitable<Node | undefined>

export type InitSessionCallback = (
    req: Request<any>,
    res: Response<any>,
    next: NextFunction,
    settings: StatefullApiSettings,
) => Awaitable<void>

export type NodeTimeoutCallback = (
    node: Node
) => Awaitable<void>

export type SessionValidatorCallback = (
    req: Request<any>,
    res: Response<any>,
    next: NextFunction,
    settings: StatefullApiSettings,
) => Awaitable<void>

export type IdGenerator = () => Awaitable<string>

export interface StatefullApiOptions {
    externalUrl: string,
    db: StatefullApiDatabase,
    allocateNode: AllocateNodeCallback,
    initSession?: InitSessionCallback,
    validateSession?: SessionValidatorCallback,
    idGenerator?: IdGenerator,
    hashFunc?: HashFunc,
    nodeTimeout?: NodeTimeoutCallback,

    nodeHeartbeatTimeout?: number,
    nodeSecret?: string,
    nodeHashHeader?: string,
    nodeSaltHeader?: string,
    nodeTimeHeader?: string,
    nodeUrlHeader?: string,
    nodeIdHeader?: string,
    nodeHashIterations?: number,
    nodeHashKeylen?: number,
    nodeHashAlgorithm?: string,

    jwtAlgorithm?: string,
    jwtSecret?: string,
    jwtRequestPrefix?: string,
    jwtRequestHeader?: string,
    jwtResponsePrefix?: string,
    jwtResponseHeader?: string,
}

export interface StatefullApiSettings extends StatefullApiOptions {
    externalUrl: string,
    db: StatefullApiDatabase,
    allocateNode: AllocateNodeCallback,
    initSession: InitSessionCallback | undefined,
    validateSession: SessionValidatorCallback | undefined,
    idGenerator: IdGenerator,
    hashFunc: HashFunc,
    nodeTimeout: NodeTimeoutCallback | undefined,

    nodeHashHeader: string,
    nodeSaltHeader: string,
    nodeTimeHeader: string,
    nodeUrlHeader: string,
    nodeIdHeader: string,
    nodeHeartbeatTimeout: number,
    nodeSecret: string,
    nodeHashIterations: number,
    nodeHashKeylen: number,
    nodeHashAlgorithm: string,

    jwtAlgorithm: string,
    jwtSecret: string,
    jwtRequestPrefix: string,
    jwtRequestHeader: string,
    jwtResponsePrefix: string,
    jwtResponseHeader: string,
}

export const defaultStatefullApiSettings: StatefullApiSettings = {
    externalUrl: undefined as any,
    db: undefined as any,
    allocateNode: undefined as any,
    initSession: undefined,
    validateSession: undefined,
    idGenerator: () => crypto.randomUUID(),
    hashFunc: createSecretHash,
    nodeTimeout: undefined,

    nodeHeartbeatTimeout: 1000 * 20,
    nodeSecret: "Some1Random2Node3Secret4_5.6",
    nodeHashHeader: "Statefull_Node_Secret",
    nodeSaltHeader: "Statefull_Node_Salt",
    nodeTimeHeader: "Statefull_Node_Time",
    nodeUrlHeader: "Statefull_Node_Url",
    nodeIdHeader: "Statefull_Node_Id",
    nodeHashIterations: 1000,
    nodeHashKeylen: 128,
    nodeHashAlgorithm: "sha512",

    jwtAlgorithm: "HS512",
    jwtSecret: "Some1Random2Jwt3Secret4_5.6",
    jwtRequestPrefix: "Bearer ",
    jwtRequestHeader: "Authorization",
    jwtResponsePrefix: "Bearer ",
    jwtResponseHeader: "Authorization",
}

export interface StatefullExportSettings {
    externalUrl: string,
    jwtRequestPrefix: string,
    jwtRequestHeader: string,
    jwtResponsePrefix: string,
    jwtResponseHeader: string,

    nodeHashHeader: string,
    nodeSaltHeader: string,
    nodeTimeHeader: string,
    nodeUrlHeader: string,
    nodeIdHeader: string,

    nodeHashIterations: number,
    nodeHashKeylen: number,
    nodeHashAlgorithm: string,
}

export function getExportSettings(
    settings: StatefullApiSettings,
): StatefullExportSettings {
    return {
        externalUrl: settings.externalUrl,

        jwtRequestPrefix: settings.jwtRequestPrefix,
        jwtRequestHeader: settings.jwtRequestHeader,
        jwtResponsePrefix: settings.jwtResponsePrefix,
        jwtResponseHeader: settings.jwtResponseHeader,

        nodeHashHeader: settings.nodeHashHeader,
        nodeSaltHeader: settings.nodeSaltHeader,
        nodeTimeHeader: settings.nodeTimeHeader,
        nodeUrlHeader: settings.nodeUrlHeader,
        nodeIdHeader: settings.nodeIdHeader,

        nodeHashIterations: settings.nodeHashIterations,
        nodeHashKeylen: settings.nodeHashKeylen,
        nodeHashAlgorithm: settings.nodeHashAlgorithm,
    }
}

export interface StatefullNodeExportSettings extends StatefullExportSettings {
    jwtAlgorithm: string,
    jwtSecret: string,
    nodeHeartbeatTimeout: number,
}

export function getNodeExportSettings(
    settings: StatefullApiSettings,
): StatefullNodeExportSettings {
    return {
        ...(getExportSettings(settings)),
        jwtAlgorithm: "HS512",
        jwtSecret: "Some1Random2Jwt3Secret4_5.6",
        nodeHeartbeatTimeout: 1000 * 20,
    }
}