import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storyRouter from "./story";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storyRouter);
router.use(storageRouter);

export default router;
