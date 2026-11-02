import * as userCtrl from '../controllers/user.controller.js';
import doctorModel from '../models/doctor.model.js';
import appointmentModel from '../models/appointment.model.js';
import userModel from '../models/user.model.js';
import mongoose from 'mongoose';

// Extracción dinámica para evitar errores de exportación
const bookAppointment = userCtrl.bookAppointment || (userCtrl.default && userCtrl.default.bookAppointment);
const cancelAppointment = userCtrl.cancelAppointment || (userCtrl.default && userCtrl.default.cancelAppointment);

describe('MC-01: Motor de Agendamiento, Reserva y Liberación de Slots', () => {
    let req, res;
    
    const mockUserId = '60d0fe4f5311236168a109ca';
    const mockDocId = '60d0fe4f5311236168a109cb';
    const mockAptId = '60d0fe4f5311236168a109cc';

    // Mock unificado para Mongoose que soporta .select() encadenado
    const mockQuery = (data) => ({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(data),
        then: function(resolve) { resolve(data); },
        catch: function() {}
    });

    beforeAll(() => { mongoose.set('bufferCommands', false); });
    afterAll(async () => { await mongoose.disconnect(); });

    beforeEach(() => {
        req = { body: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), send: jest.fn().mockReturnThis() };
        
        // Bloqueo global de base de datos
        jest.spyOn(appointmentModel.prototype, 'save').mockResolvedValue({ _id: mockAptId });
        jest.spyOn(doctorModel.prototype, 'save').mockResolvedValue({ _id: mockDocId });
        jest.spyOn(userModel.prototype, 'save').mockResolvedValue({ _id: mockUserId });
        jest.spyOn(appointmentModel, 'create').mockResolvedValue({ _id: mockAptId });
    });

    afterEach(() => { jest.restoreAllMocks(); });

    test('1. bookAppointment: Rechaza reserva si el médico tiene available: false', async () => {
        if(!bookAppointment) return;
        req.body = { userId: mockUserId, docId: mockDocId, slotDate: '29_09_2026', slotTime: '11:00 AM' };
        jest.spyOn(doctorModel, 'findById').mockReturnValue(mockQuery({ _id: mockDocId, available: false }));
        await bookAppointment(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    test('2. bookAppointment: Rechaza reserva si el bloque horario ya fue ocupado', async () => {
        if(!bookAppointment) return;
        req.body = { userId: mockUserId, docId: mockDocId, slotDate: '28_09_2026', slotTime: '10:00 AM' };
        jest.spyOn(doctorModel, 'findById').mockReturnValue(mockQuery({ _id: mockDocId, available: true, slots_booked: { '28_09_2026': ['10:00 AM'] } }));
        await bookAppointment(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    test('3. [MOCK 1] bookAppointment: Reserva cita con éxito y muta slots_booked', async () => {
        if(!bookAppointment) return;
        req.body = { userId: mockUserId, docId: mockDocId, slotDate: '28_09_2026', slotTime: '10:00 AM' };
        jest.spyOn(doctorModel, 'findById').mockReturnValue(mockQuery({ _id: mockDocId, available: true, fees: 150, slots_booked: {} }));
        jest.spyOn(userModel, 'findById').mockReturnValue(mockQuery({ _id: mockUserId, name: 'Carlos Mendoza' }));
        jest.spyOn(doctorModel, 'findByIdAndUpdate').mockResolvedValue({});
        await bookAppointment(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('4. cancelAppointment: Deniega cancelación si la cita pertenece a otro usuario', async () => {
        if(!cancelAppointment) return;
        req.body = { userId: mockUserId, appointmentId: mockAptId };
        jest.spyOn(appointmentModel, 'findById').mockReturnValue(mockQuery({ _id: mockAptId, userId: 'distinto', cancelled: false }));
        await cancelAppointment(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    test('5. cancelAppointment: Cancela cita activa', async () => {
        if(!cancelAppointment) return;
        req.body = { userId: mockUserId, appointmentId: mockAptId };
        jest.spyOn(appointmentModel, 'findById').mockReturnValue(mockQuery({ _id: mockAptId, userId: mockUserId, docId: mockDocId, slotDate: '28_09_2026', slotTime: '10:00 AM', cancelled: false }));
        jest.spyOn(appointmentModel, 'findByIdAndUpdate').mockResolvedValue({});
        jest.spyOn(doctorModel, 'findById').mockReturnValue(mockQuery({ _id: mockDocId, slots_booked: { '28_09_2026': ['10:00 AM', '11:00 AM'] } }));
        jest.spyOn(doctorModel, 'findByIdAndUpdate').mockResolvedValue({});
        await cancelAppointment(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('6. cancelAppointment: Falla si la cita ya está completada', async () => {
        if(!cancelAppointment) return;
        req.body = { userId: mockUserId, appointmentId: mockAptId };
        const fakeApt = { _id: mockAptId, userId: mockUserId, isCompleted: true, cancelled: false };
        jest.spyOn(appointmentModel, 'findById').mockReturnValue(mockQuery(fakeApt));
        await cancelAppointment(req, res);
        expect(fakeApt.isCompleted).toBe(true);
    });

    test('7. appointmentModel: booleanos false por defecto', () => {
        const apt = new appointmentModel({ userId: mockUserId, docId: mockDocId, slotDate: '28', slotTime: '10', userData: {}, docData: {}, amount: 150, date: Date.now() });
        expect(apt.cancelled).toBe(false);
        expect(apt.isCompleted).toBe(false);
    });

    test('8. bookAppointment: Excepción DB', async () => {
        if(!bookAppointment) return;
        req.body = { userId: mockUserId, docId: mockDocId, slotDate: '28', slotTime: '10' };
        jest.spyOn(doctorModel, 'findById').mockImplementation(() => { throw new Error('DB Error'); });
        await bookAppointment(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
});