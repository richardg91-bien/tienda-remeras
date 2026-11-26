import { Router } from "express";
import { deleteProject, getProject, listProjects, saveProject } from "../controllers/projectController.js";
import { lazyProtect } from "./authAdapters.js";

export const createProjectRouter = (authMiddleware = lazyProtect) => {
  const projectRouter = Router();
  projectRouter.use(authMiddleware);
  projectRouter.get("/", listProjects);
  projectRouter.post("/", saveProject);
  projectRouter.get("/:id", getProject);
  projectRouter.put("/:id", (req, res, next) => { req.body = { ...(req.body || {}), id: req.params.id }; next(); }, saveProject);
  projectRouter.delete("/:id", deleteProject);
  return projectRouter;
};

const router = createProjectRouter();
export default router;
