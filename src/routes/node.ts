import { RequestHandler, Router } from 'express';
import { getNodeExportSettings, Node, StatefullApiSettings } from '../types';

declare global {
    namespace Express {
        export interface Request {
            node: Node
        }
    }
}

export function applyNodeRoutes(
    router: Router,
    settings: StatefullApiSettings,
): void {
    const nodeExportSettings = getNodeExportSettings(settings)

    const verifyHash = async (
        hash: string,
        salt: string,
        millis: number,
    ) => {
        const res = (
            await settings.hashFunc({
                value: millis + settings.nodeSecret + millis,
                algorithm: settings.nodeHashAlgorithm,
                iterations: settings.nodeHashIterations,
                keylen: settings.nodeHashKeylen,
                salt: salt,
            })
        )
        return res.hash === hash
    }

    const secretValidator: RequestHandler = async (req, res, next) => {
        let millis = Number(req.header(settings.nodeTimeHeader))
        if (isNaN(millis)) {
            res.status(400).send(
                "'" + settings.nodeTimeHeader +
                "' header value is not a valid number"
            )
            return
        }
        let hash = req.header(settings.nodeHashHeader)
        if (
            typeof hash !== "string" ||
            hash.length === 0
        ) {
            res.status(400)
                .send(
                    "'" + settings.nodeHashHeader +
                    "' header value is not set or empty"
                )
            return
        }
        let salt = req.header(settings.nodeSaltHeader)
        if (
            typeof salt !== "string" ||
            salt.length === 0
        ) {
            res.status(400)
                .send(
                    "'" + settings.nodeSaltHeader +
                    "' header value is not set or empty"
                )
            return
        }
        if (!verifyHash(hash, salt, millis)) {
            res.sendStatus(401)
            return
        }
        next()
    }

    const nodeResolver: RequestHandler = async (req, res, next) => {
        const rawNodeId = req.header(settings.nodeIdHeader)
        if (
            typeof rawNodeId === "string" &&
            rawNodeId.length !== 0
        ) {
            const nodeId = Number(rawNodeId)
            if (isNaN(nodeId)) {
                res.status(400)
                    .send(
                        "'" + settings.nodeIdHeader +
                        "' or '" +
                        settings.nodeUrlHeader +
                        "' header values are valid"
                    )
                return
            }
            req.node = await settings.db.getNodeById(nodeId)
            if (!req.node) {
                res.status(400)
                    .send(
                        "Node with id '" + nodeId +
                        "' not found"
                    )
                return
            }
        } else {
            const nodeUrl = req.header(settings.nodeUrlHeader)
            if (
                typeof nodeUrl === "string" &&
                nodeUrl.length !== 0
            ) {
                req.node = await settings.db.getNodeByUrl(nodeUrl)
                if (!req.node) {
                    res.status(400)
                        .send(
                            "Node with url '" +
                            nodeUrl +
                            "' not found"
                        )
                    return
                }
            } else {
                res.status(400)
                    .send(
                        "'" + settings.nodeIdHeader +
                        "' and '" +
                        settings.nodeUrlHeader +
                        "' headers not provided"
                    )
                return
            }
        }
        if (req.node) {
            const now = Date.now()
            if (req.node.heartbeat - now > settings.nodeHeartbeatTimeout) {
                await settings.db.unregisterNode(req.node.id)
                settings.nodeTimeout && await settings.nodeTimeout(req.node)
                req.node = undefined
            }
        }

        if (typeof req.node !== "object") {
            res.status(403)
                .send("Unregistered node id or url")
            return
        }
        next()
    }

    router.post("/node/heartbeat", secretValidator, nodeResolver, async (req, res) => {
        let node = await settings.db.tickNode(req.node.id)
        if (node === undefined) {
            res.sendStatus(406)
            return
        }
        res.status(200).json(node)
        setTimeout(async () => {
            node = await settings.db.getNodeById(node.id)
            if (node) {
                const now = Date.now()
                if (node.heartbeat - now > settings.nodeHeartbeatTimeout) {
                    await settings.db.unregisterNode(req.node.id)
                    settings.nodeTimeout && await settings.nodeTimeout(node)
                }
            }
        }, settings.nodeHeartbeatTimeout)
    })

    router.get(
        "/node/statefull.json",
        secretValidator,
        (req, res) => res.status(200).json(nodeExportSettings)
    )

    router.post("/node/register", secretValidator, async (req, res) => {
        const url = req.header(settings.nodeUrlHeader)
        if (
            typeof url !== "string" ||
            url.length === 0
        ) {
            res.status(400).send(
                "'" + settings.nodeUrlHeader +
                "' header value is not set or empty"
            )
            return
        }
        let node = await settings.db.registerNode(url)
        res.status(200)
            .send(node)
        setTimeout(async () => {
            node = await settings.db.getNodeById(node.id)
            if (node) {
                const now = Date.now()
                if (node.heartbeat - now > settings.nodeHeartbeatTimeout) {
                    await settings.db.unregisterNode(req.node.id)
                    settings.nodeTimeout && await settings.nodeTimeout(node)
                }
            }
        }, settings.nodeHeartbeatTimeout)
    })

    router.post("/node/unregister", secretValidator, nodeResolver, async (req, res) => {
        const node = await settings.db.unregisterNode(req.node.id)
        if (node === undefined) {
            res.sendStatus(406)
            return
        }
        res.sendStatus(200)
    })


    router.post("/node/nodes", secretValidator, nodeResolver, async (req, res) => {
        const nodes = await settings.db.getNodes()
        const data: any = {}
        for (const node of nodes) {
            data["" + node.id] = node
        }
        res.status(200)
            .json(data)
    })


}