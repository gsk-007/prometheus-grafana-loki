import express from "express";
import { doSomeHeavyTask } from "./util.js";
import responseTime from "response-time";
import client from "prom-client";
import { createLogger, transports } from "winston";
import LokiTransport from "winston-loki";

const options = {
  transports: [
    new LokiTransport({
      host: "http://127.0.0.1:3100",
    }),
  ],
};

const logger = createLogger(options);

const app = express();
const PORT = process.env.PORT || 8000;

const collectMetrics = client.collectDefaultMetrics;

collectMetrics({ register: client.register });

const reqResTime = new client.Histogram({
  name: "http_express_req_res_time",
  help: "This tells how much time is taken by req and res",
  labelNames: ["method", "route", "status_code"],
  buckets: [1, 50, 100, 200, 400, 500, 800, 1000, 2000],
});

const totalReqCounter = new client.Counter({
  name: "http_reques_counter",
  help: "This tells the total number of request made to the server",
});

app.use(
  responseTime((req, res, time) => {
    totalReqCounter.inc();
    reqResTime
      .labels({
        method: req.method,
        route: req.url,
        status_code: res.statusCode,
      })
      .observe(time);
  }),
);

app.get("/", (req, res) => {
  logger.info("Req came on / route");
  res.json({ message: "Hello from Express server" });
});

app.get("/slow", async (req, res) => {
  try {
    logger.info("Req came on /slow route");
    const timeTaken = await doSomeHeavyTask();
    return res.json({
      status: "Success",
      message: `Heavy task completed in ${timeTaken} ms`,
    });
  } catch (error) {
    logger.error(error.message);
    res.status(500).json({ status: "Error", error: "Internal Server Error" });
  }
});

app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", client.register.contentType);
  const metrics = await client.register.metrics();
  res.send(metrics);
});

app.listen(PORT, () => {
  console.log(`Express server Started at http://localhost:${PORT}`);
});
