import Fastify from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import reportRoutes from './routes/reportRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import fs from 'fs';
import path from 'path';

// Asegurarnos de que el directorio de outputs exista para guardar los temporales
// Estrategia de Resiliencia: Si el contenedor Docker arranca limpio, la carpeta debe crearse.
const outputsDir = path.join(process.cwd(), 'outputs');
if (!fs.existsSync(outputsDir)) {
    fs.mkdirSync(outputsDir, { recursive: true });
}

// Inicialización del servidor
const server = Fastify({ logger: true });

// Endpoint de Healthcheck (Vital para Docker/Dokploy para balanceadores de carga)
server.get('/health', async (request, reply) => {
    return { status: 'OK', service: 'Document Generator' };
});

// Registramos el plugin para subida de archivos
server.register(fastifyMultipart, {
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Registramos las rutas, separando responsabilidades (SOLID - Single Responsibility Principle)
server.register(reportRoutes);
server.register(templateRoutes);

const start = async () => {
    try {
        await server.listen({ port: 3001, host: '0.0.0.0' });
        console.log('🚀 Servidor corriendo en http://localhost:3001');
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();