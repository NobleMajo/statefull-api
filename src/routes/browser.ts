import { Router, RequestHandler } from 'express';
import { Node, Session, StatefullApiSettings } from '../types';
import * as JWT from "jsonwebtoken"

declare global {
    namespace Express {
        export interface Request {
            session: Session
        }
    }
}

export function applyBrowserRoutes(
    router: Router,
    settings: StatefullApiSettings,
): void {
    const sessionValidator: RequestHandler = (req, res, next) => settings.validateSession ? settings.validateSession(req, res, next, settings) : next()
    const sessionParser: RequestHandler = async (req, res, next) => {
        try {
            let token = req.header(settings.jwtRequestHeader)
            if (typeof token !== "string") {
                throw new Error()
            } else if (token.length === 0) {
                res.status(400)
                    .send(
                        "'" + settings.jwtRequestHeader +
                        "' header value is empty"
                    )
                return
            } else if (!token.startsWith(settings.jwtRequestPrefix)) {
                res.status(400)
                    .send(
                        "'" + settings.jwtRequestHeader +
                        "' header value not starts with '" +
                        settings.jwtRequestPrefix + "'"
                    )
                return
            }
            token = token.substring(settings.jwtRequestPrefix.length)
            req.session = JWT.verify(
                token,
                settings.jwtSecret,
                {
                    algorithms: [settings.jwtAlgorithm as any],
                }
            ) as any
            if (
                typeof req.session !== "object" ||
                typeof req.session.id !== "string" ||
                typeof req.session.new !== "boolean"
            ) {
                throw new Error()
            }
            req.session.new = false
        } catch (err) {
            req.session = {
                id: await settings.idGenerator(),
                new: true,
            }
        }
        const srcId = req.session.id
        const srcNew = req.session.new

        const oldEnd = res.end
        const oldFlushHeaders = res.flushHeaders
        const setHeader = () => {
            if (typeof req.session === "object") {
                if (typeof req.session.id !== "string") {
                    req.session.id = srcId
                }
                req.session.new = srcNew
                res.setHeader(
                    settings.jwtResponseHeader,
                    settings.jwtResponsePrefix +
                    JWT.sign(
                        req.session,
                        settings.jwtSecret,
                        {
                            algorithm: settings.jwtAlgorithm as any,
                        }
                    )
                )
            }
        }
        res.flushHeaders = (() => {
            res.flushHeaders = oldFlushHeaders
            res.end = oldEnd
            setHeader()
            res.flushHeaders()
        }) as any
        res.end = ((...params: any[]) => {
            res.flushHeaders = oldFlushHeaders
            res.end = oldEnd
            setHeader()
            return res.end(...params)
        }) as any
        if (req.session.new === true) {
            await settings.initSession(req, res, next, settings)
        } else {
            next()
        }
    }

    router.get("/browser/allocate", sessionParser, sessionValidator, async (req, res) => {
        let target: Node | undefined
        try {
            target = await settings.allocateNode(
                req,
                res,
                settings,
            )
        } catch (err) {
            console.error("settings.allocateNode(): Error: " + err.stack)
            res.sendStatus(400)
            return
        }
        if (target === undefined) {
            res.sendStatus(503)
        } else if (
            typeof target === "object" &&
            typeof target.url === "string" &&
            typeof target.id === "number"
        ) {
            res.status(200)
                .send("" + target.url)
        } else {
            console.error("allocateNode() return type if '" + typeof target + "':", target)
            res.sendStatus(500)
        }
    })
}