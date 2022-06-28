import { Router } from "express"
import {
    StatefullApiOptions, StatefullApiSettings,
    defaultStatefullApiSettings, getExportSettings
} from './types';
import { applyNodeRoutes } from "./routes/node"
import { applyBrowserRoutes } from "./routes/browser"

export function createApiMiddleware(
    options: StatefullApiOptions
): Router {
    const settings: StatefullApiSettings = {
        ...defaultStatefullApiSettings,
        ...options,
    }

    const router = Router()

    const exportSettings = getExportSettings(settings)
    router.get(
        "/statefull.json",
        (req, res) => res.status(200).json(exportSettings)
    )
  
    applyNodeRoutes(
        router,
        settings,
    )

    applyBrowserRoutes(
        router,
        settings,
    )

    return router
}