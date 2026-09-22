import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import { createCreatorProject, listCreatorProjects, updateCreatorProject, createEpisode, updateEpisode, createScene, updateScene, registerAsset, listAssets, getProjectLibrary } from "../../services/creatorAssetLibraryService.js";

const router = express.Router();
router.use(requireAuth);
const failure = (res, error) => res.status(/not found/i.test(error.message) ? 404 : 400).json({ ok: false, error: error.message });

router.get("/projects", async (req, res) => { try { const projects = await listCreatorProjects(req.user.id); res.json({ ok: true, projects }); } catch (error) { failure(res, error); } });
router.patch("/projects/:projectId", async (req, res) => { try { const project = await updateCreatorProject({ ...req.body, projectId: req.params.projectId, userId: req.user.id }); res.json({ ok: true, project }); } catch (error) { failure(res, error); } });
router.post("/projects", async (req, res) => { try { const project = await createCreatorProject({ ...req.body, userId: req.user.id }); res.status(201).json({ ok: true, project }); } catch (error) { failure(res, error); } });
router.patch("/projects/:projectId/episodes/:episodeId", async (req, res) => { try { const episode = await updateEpisode({ ...req.body, projectId: req.params.projectId, episodeId: req.params.episodeId, userId: req.user.id }); res.json({ ok: true, episode }); } catch (error) { failure(res, error); } });
router.post("/projects/:projectId/episodes", async (req, res) => { try { const episode = await createEpisode({ ...req.body, projectId: req.params.projectId, userId: req.user.id }); res.status(201).json({ ok: true, episode }); } catch (error) { failure(res, error); } });
router.patch("/projects/:projectId/scenes/:sceneId", async (req, res) => { try { const scene = await updateScene({ ...req.body, projectId: req.params.projectId, sceneId: req.params.sceneId, userId: req.user.id }); res.json({ ok: true, scene }); } catch (error) { failure(res, error); } });
router.post("/projects/:projectId/scenes", async (req, res) => { try { const scene = await createScene({ ...req.body, projectId: req.params.projectId, userId: req.user.id }); res.status(201).json({ ok: true, scene }); } catch (error) { failure(res, error); } });
router.get("/projects/:projectId/library", async (req, res) => { try { const library = await getProjectLibrary({ projectId: req.params.projectId, userId: req.user.id }); res.json({ ok: true, library }); } catch (error) { failure(res, error); } });
router.get("/assets", async (req, res) => { try { const assets = await listAssets({ userId: req.user.id, projectId: req.query.projectId || null, assetType: req.query.assetType || null, reusable: req.query.reusable === undefined ? null : req.query.reusable === "true" }); res.json({ ok: true, assets }); } catch (error) { failure(res, error); } });
router.post("/assets", async (req, res) => { try { const asset = await registerAsset({ ...req.body, userId: req.user.id }); res.status(201).json({ ok: true, asset }); } catch (error) { failure(res, error); } });

export default router;
