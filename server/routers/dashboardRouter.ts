import { router, protectedProcedure } from "../_core/trpc";
import { getSystemStats, getDeviceStatusStats, getLast7DaysStats } from "../analytics";

export const dashboardRouter = router({
  getOverview: protectedProcedure.query(async () => {
    const [system, deviceStatus] = await Promise.all([
      getSystemStats(),
      getDeviceStatusStats(),
    ]);
    return {
      ...system,
      deviceStatus,
    };
  }),
  getMetrics: protectedProcedure.query(async () => {
    return await getLast7DaysStats();
  }),
});
