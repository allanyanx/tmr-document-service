"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/app.ts
var import_fastify = __toESM(require("fastify"), 1);
var import_multipart = __toESM(require("@fastify/multipart"), 1);

// src/routes/reportRoutes.ts
var import_zod = require("zod");

// src/infrastructure/queue/documentQueue.ts
var import_bullmq = require("bullmq");
var import_ioredis = require("ioredis");

// src/infrastructure/carbone/carboneAdapter.ts
var import_carbone = __toESM(require("carbone"), 1);
var import_path = __toESM(require("path"), 1);
var CarboneAdapter = class {
  /**
   * Genera un documento usando Carbone y opcionalmente LibreOffice.
   * Patrón de Diseño: Adapter (GoF) - Oculta la complejidad de la librería externa Carbone.
   * 
   * @param templateName Nombre del archivo en la carpeta 'templates'
   * @param data Objeto JSON con los datos del dominio a inyectar
   * @param format Formato de salida ('pdf', 'docx', 'xlsx')
   * @returns Promise<Buffer> Binario puro del documento resultante
   */
  generateDocument(templateName, data, format) {
    const templatePath = import_path.default.join(process.cwd(), "templates", templateName);
    return new Promise((resolve, reject) => {
      const options = {};
      if (format === "pdf") {
        options.convertTo = "pdf";
      }
      import_carbone.default.render(templatePath, data, options, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }
};

// src/infrastructure/queue/documentQueue.ts
var import_fs = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
var connection = new import_ioredis.Redis("rediss://default:gQAAAAAABI2rAAIgcDJmZjhmNjczYTkwMzU0OTlhOWEwOGJjNGFlYTI4ZjkwYQ@measured-husky-298411.upstash.io:6379", {
  maxRetriesPerRequest: null
});
var documentQueue = new import_bullmq.Queue("document-generation", { connection });
var documentWorker = new import_bullmq.Worker("document-generation", async (job) => {
  console.log(`[Worker] Procesando el reporte ID: ${job.id}`);
  const { templateName, data, format } = job.data;
  try {
    const adapter = new CarboneAdapter();
    const fileBuffer = await adapter.generateDocument(templateName, data, format);
    const fileName = `reporte-${job.id}.${format}`;
    const outputPath = import_path2.default.join(process.cwd(), "outputs", fileName);
    import_fs.default.writeFileSync(outputPath, fileBuffer);
    const baseUrl = process.env.BASE_URL || "http://localhost:3001";
    return {
      success: true,
      url: `${baseUrl}/api/reports/download/${fileName}`
    };
  } catch (error) {
    console.error(`[Worker] Error generando documento ${job.id}:`, error);
    throw error;
  }
}, {
  connection,
  // ESTRATEGIA DE RESILIENCIA Y RECURSOS:
  // Limitamos a LibreOffice a procesar máximo 2 documentos a la vez. 
  // Evitamos picos de uso del 100% de CPU en el servidor de Docker/Dokploy.
  concurrency: 2
});
documentWorker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completado exitosamente.`);
});
documentWorker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} fall\xF3 de forma cr\xEDtica: ${err.message}`);
});

// src/routes/reportRoutes.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_path3 = __toESM(require("path"), 1);
var generateReportSchema = import_zod.z.object({
  templateName: import_zod.z.string().min(1, "El nombre de la plantilla es obligatorio"),
  data: import_zod.z.any(),
  // Datos dinámicos para inyectar en la plantilla
  format: import_zod.z.enum(["pdf", "docx", "xlsx"]).default("pdf")
  // Formato de salida
});
async function reportRoutes(server2) {
  server2.post("/api/reports/generate", async (request, reply) => {
    try {
      const body = generateReportSchema.parse(request.body);
      const job = await documentQueue.add("generate-report", {
        templateName: body.templateName,
        data: body.data,
        format: body.format
      });
      return reply.code(202).send({
        message: "Generaci\xF3n de reporte encolada con \xE9xito",
        jobId: job.id,
        statusUrl: `/api/reports/status/${job.id}`
        // Ruta para el Polling
      });
    } catch (error) {
      if (error instanceof import_zod.z.ZodError) {
        return reply.code(400).send({ error: "Datos inv\xE1lidos", details: error.issues });
      }
      server2.log.error(error);
      return reply.code(500).send({ error: "Error interno del servidor" });
    }
  });
  server2.get("/api/reports/status/:jobId", async (request, reply) => {
    const { jobId } = request.params;
    try {
      const job = await documentQueue.getJob(jobId);
      if (!job) {
        return reply.code(404).send({ error: "Trabajo no encontrado en la cola" });
      }
      const state = await job.getState();
      if (state === "completed") {
        return reply.code(200).send({
          status: "COMPLETED",
          result: job.returnvalue
          // Contiene { url: '...' } generado por el Worker
        });
      } else if (state === "failed") {
        return reply.code(200).send({
          status: "FAILED",
          error: job.failedReason
        });
      } else {
        return reply.code(200).send({
          status: state.toUpperCase(),
          message: "El documento se est\xE1 procesando..."
        });
      }
    } catch (error) {
      server2.log.error(error);
      return reply.code(500).send({ error: "Error al consultar el estado" });
    }
  });
  server2.get("/api/reports/download/:filename", async (request, reply) => {
    const { filename } = request.params;
    try {
      const filePath = import_path3.default.join(process.cwd(), "outputs", filename);
      if (!import_fs2.default.existsSync(filePath)) {
        return reply.code(404).send({ error: "El archivo ya no existe o caduc\xF3 su TTL." });
      }
      const stream = import_fs2.default.createReadStream(filePath);
      if (filename.endsWith(".pdf")) {
        reply.header("Content-Type", "application/pdf");
      } else if (filename.endsWith(".docx")) {
        reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      } else if (filename.endsWith(".xlsx")) {
        reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      }
      reply.header("Content-Disposition", `attachment; filename="${filename}"`);
      return reply.send(stream);
    } catch (error) {
      server2.log.error(error);
      return reply.code(500).send({ error: "Error interno al intentar descargar el archivo" });
    }
  });
}

// src/routes/templateRoutes.ts
var import_fs3 = __toESM(require("fs"), 1);
var import_path4 = __toESM(require("path"), 1);
var import_util = __toESM(require("util"), 1);
var import_stream = require("stream");
var pump = import_util.default.promisify(import_stream.pipeline);
async function templateRoutes(server2) {
  const templatesDir = import_path4.default.join(process.cwd(), "templates");
  if (!import_fs3.default.existsSync(templatesDir)) {
    import_fs3.default.mkdirSync(templatesDir, { recursive: true });
  }
  server2.get("/api/templates", async (request, reply) => {
    try {
      const files = import_fs3.default.readdirSync(templatesDir);
      const templates = files.filter((file) => file.endsWith(".docx") || file.endsWith(".xlsx") || file.endsWith(".odt"));
      return reply.send({ templates });
    } catch (error) {
      server2.log.error(error);
      return reply.code(500).send({ error: "Error al obtener la lista de plantillas" });
    }
  });
  server2.post("/api/templates/upload", async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: "No se envi\xF3 ning\xFAn archivo" });
      }
      const fileName = data.filename;
      const filePath = import_path4.default.join(templatesDir, fileName);
      await pump(data.file, import_fs3.default.createWriteStream(filePath));
      return reply.code(201).send({ message: "Plantilla subida con \xE9xito", fileName });
    } catch (error) {
      server2.log.error(error);
      return reply.code(500).send({ error: "Error al subir la plantilla" });
    }
  });
  server2.delete("/api/templates/:filename", async (request, reply) => {
    const { filename } = request.params;
    try {
      const filePath = import_path4.default.join(templatesDir, filename);
      if (import_fs3.default.existsSync(filePath)) {
        import_fs3.default.unlinkSync(filePath);
        return reply.send({ message: "Plantilla eliminada" });
      } else {
        return reply.code(404).send({ error: "Plantilla no encontrada" });
      }
    } catch (error) {
      server2.log.error(error);
      return reply.code(500).send({ error: "Error al eliminar la plantilla" });
    }
  });
}

// src/app.ts
var import_fs4 = __toESM(require("fs"), 1);
var import_path5 = __toESM(require("path"), 1);
var outputsDir = import_path5.default.join(process.cwd(), "outputs");
if (!import_fs4.default.existsSync(outputsDir)) {
  import_fs4.default.mkdirSync(outputsDir, { recursive: true });
}
var server = (0, import_fastify.default)({ logger: true });
server.get("/health", async (request, reply) => { 
  return { status: "OK", service: "Document Generator" };
});
server.register(import_multipart.default, {
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB limit
  }
});
server.register(reportRoutes);
server.register(templateRoutes);
var start = async () => {
  try {
    await server.listen({ port: 3001, host: "0.0.0.0" });
    console.log("\u{1F680} Servidor corriendo en http://localhost:3001");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
start();
