import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Forzamos la carga del .env local para que Cloudinary no falle
dotenv.config();

async function startMockServer() {
    console.log('Iniciando MongoDB en memoria para pruebas de API...');
    
    // 1. Levantar servidor en RAM
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    // Inyectamos la URI en las variables más comunes para asegurar que server.js la reconozca

    process.env.MONGO_URI = uri;
    
    process.env.PORT = 4000;
    process.env.JWT_SECRET = 'test_jwt_secret_key';
    process.env.ADMIN_EMAIL = 'admin@doctime.com';
    process.env.ADMIN_PASSWORD = 'admin_password123';

    // 2. Conectar Mongoose para sembrar los datos de prueba
    await mongoose.connect(uri);

    // Importar modelos dinámicamente
    const userModel = (await import('./models/user.model.js')).default;
    const doctorModel = (await import('./models/doctor.model.js')).default;

    // Crear hashes para las contraseñas que usa Newman
    const salt = await bcrypt.genSalt(10);
    const hashedUserPass = await bcrypt.hash('PasswordSeguro2026!', salt);
    const hashedDocPass = await bcrypt.hash('DocPass2026#', salt);

    // 3. Sembrar datos (Seed)
    await userModel.create({
        name: 'Paciente Test',
        email: 'paciente.valido@test.com',
        password: hashedUserPass
    });

    await doctorModel.create({
        name: 'Dr. Activo Test',
        email: 'doctor.activo@test.com',
        password: hashedDocPass,
        specialization: 'General physician',
        degree: 'MBBS',
        experience: 5,
        about: 'Mock doctor for API testing',
        fees: 150,
        image: 'https://res.cloudinary.com/demo/image/upload/avatar.jpg',
        available: true,
        date: Date.now(),
        slots_booked: {}
    });

    console.log('✅ Base de datos simulada poblada con éxito. Arrancando servidor...');

    // 4. Importar y arrancar el servidor Express real
    await import('./server.js');
}

startMockServer().catch(err => {
    console.error('Error al iniciar el servidor de pruebas:', err);
    process.exit(1);
});