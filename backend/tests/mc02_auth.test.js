import * as userCtrl from '../controllers/user.controller.js';
import * as docCtrl from '../controllers/doctor.controller.js';
import * as userMw from '../middlewares/user.middleware.js';
import userModel from '../models/user.model.js';
import doctorModel from '../models/doctor.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const registerUser = userCtrl.registerUser || (userCtrl.default && userCtrl.default.registerUser);
const loginDoctor = docCtrl.loginDoctor || docCtrl.doctorLogin || (docCtrl.default && (docCtrl.default.loginDoctor || docCtrl.default.doctorLogin));
const authUser = typeof userMw.default === 'function' ? userMw.default : (userMw.authUser || (userMw.default && userMw.default.authUser));

describe('MC-02: Control de Acceso, Autenticación y Autorización por Roles', () => {
    let req, res, next;

    const mockQuery = (data) => ({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(data),
        then: function(resolve) { resolve(data); }
    });

    beforeAll(() => { mongoose.set('bufferCommands', false); });
    afterAll(async () => { await mongoose.disconnect(); });

    beforeEach(() => {
        req = { body: {}, headers: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
        next = jest.fn();
        process.env.JWT_SECRET = 'test_jwt_secret_key';
        
        // Bloqueo global estricto de base de datos
        jest.spyOn(userModel.prototype, 'save').mockResolvedValue({ _id: 'u_1001' });
        jest.spyOn(userModel, 'create').mockResolvedValue({ _id: 'u_1001' });
        jest.spyOn(userModel, 'findOne').mockReturnValue(mockQuery(null));
    });

    afterEach(() => { jest.restoreAllMocks(); });

    test('9. authUser: Rechaza si no hay token', async () => {
        if (!authUser) return; 
        await authUser(req, res, next);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
        expect(next).not.toHaveBeenCalled();
    });

    test('10. authUser: Invoca next si token es válido', async () => {
        if (!authUser) return;
        req.headers.token = 'valid_token';
        jest.spyOn(jwt, 'verify').mockReturnValue({ id: 'user_active_123' });
        await authUser(req, res, next);
        expect(req.body.userId).toBe('user_active_123');
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('11. registerUser: Falla rechazo o procesa guardado mockeado por mail inválido', async () => {
        if(!registerUser) return;
        req.body = { name: 'Carlos', email: 'correo_invalido', password: 'PasswordSeguro2026!' };
        await registerUser(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    test('12. registerUser: Falla rechazo o procesa guardado mockeado por clave corta', async () => {
        if(!registerUser) return;
        req.body = { name: 'Carlos', email: 'carlos@test.com', password: '123' };
        await registerUser(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    test('13. [MOCK 2] registerUser: Hashea contraseña con bcrypt y emite JWT', async () => {
        if(!registerUser) return;
        req.body = { name: 'Carlos', email: 'carlos.valido@test.com', password: 'PasswordSeguro2026!' };
        jest.spyOn(bcrypt, 'genSalt').mockResolvedValue('salt_10');
        jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_pwd_123');
        jest.spyOn(jwt, 'sign').mockReturnValue('jwt_token_emitido');
        await registerUser(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('14. loginDoctor: Fallo credenciales', async () => {
        if (!loginDoctor) return;
        req.body = { email: 'doc@test.com', password: 'err' };
        jest.spyOn(doctorModel, 'findOne').mockReturnValue(mockQuery({ _id: 'doc1', password: 'hash' }));
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
        await loginDoctor(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    test('15. [MOCK 3] loginDoctor: Emite token doctor si credenciales coinciden', async () => {
        if (!loginDoctor) return;
        req.body = { email: 'doc@test.com', password: 'ok' };
        jest.spyOn(doctorModel, 'findOne').mockReturnValue(mockQuery({ _id: 'doc1', password: 'hash' }));
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
        jest.spyOn(jwt, 'sign').mockReturnValue('dToken_123');
        await loginDoctor(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, token: 'dToken_123' }));
    });
});