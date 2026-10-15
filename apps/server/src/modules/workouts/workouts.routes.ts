import { Router } from "express";
import { getAuthUser, requireAuth } from "../../middleware/requireAuth.js";
import { idParamSchema, listWorkoutsQuerySchema, workoutInputSchema } from "./workouts.schemas.js";
import * as workoutsService from "./workouts.service.js";

export const workoutsRouter = Router();

workoutsRouter.use(requireAuth); // every workout route needs a signed-in user

workoutsRouter.get("/", async (req, res) => {
  const query = listWorkoutsQuerySchema.parse(req.query);
  res.json(await workoutsService.listMyWorkouts(getAuthUser(req).id, query));
});

workoutsRouter.post("/", async (req, res) => {
  const input = workoutInputSchema.parse(req.body);
  res.status(201).json({ workout: await workoutsService.createWorkout(getAuthUser(req).id, input) });
});

workoutsRouter.get("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json({ workout: await workoutsService.getWorkout(getAuthUser(req).id, id) });
});

workoutsRouter.put("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const input = workoutInputSchema.parse(req.body);
  res.json({ workout: await workoutsService.replaceWorkout(getAuthUser(req).id, id, input) });
});

workoutsRouter.delete("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await workoutsService.deleteWorkout(getAuthUser(req).id, id);
  res.status(204).end();
});
