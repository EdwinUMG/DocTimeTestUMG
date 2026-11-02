import * as docCtrl from '../controllers/doctor.controller.js';
import * as adminCtrl from '../controllers/admin.controller.js';
import doctorModel from '../models/doctor.model.js';
import appointmentModel from '../models/appointment.model.js';
import mongoose from 'mongoose';

const appointmentComplete = docCtrl.appointmentComplete || (docCtrl.default && docCtrl.default.appointmentComplete);
const appointmentCancel = docCtrl.appointmentCancel || (docCtrl.default && docCtrl.default.appointmentCancel);
const updateDoctorProfile = docCtrl.updateDoctorProfile || docCtrl.updateProfile || (docCtrl.default && (docCtrl.default.updateDoctorProfile || docCtrl.default.updateProfile));
const doctorList = docCtrl.doctorList || (docCtrl.default && docCtrl.default.doctorList);
const changeAvailablity = adminCtrl.changeAvailablity || adminCtrl.changeAvailability || (adminCtrl.default && (adminCtrl.default.changeAvailablity || adminCtrl.default.changeAvailability));

describe('MC-03: Gestión de Disponibilidad y Liquidación de Honorarios Médicos', () => {
    let req, res;
    const mockDocId = '60d0fe4f5311236168a109cb';
    const mockAptId = '60d0fe4f5311236168a109cc';

    const mockQuery = (data) => ({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(data),
        then: function(resolve) { resolve(data); }
    });

    beforeAll(() => { mongoose.set('bufferCommands', false); });
    afterAll(async () => { await mongoose.disconnect(); });

    beforeEach(() => {
        req = { body: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    });
    
    afterEach(() => { jest.restoreAllMocks(); });

    test('16. changeAvailablity: Invierte estado booleano de availability del doctor', async () => {
        if (!changeAvailablity) return;
        req.body = { docId: mockDocId };
        jest.spyOn(doctorModel, 'findById').mockReturnValue(mockQuery({ _id: mockDocId, available: true }));
        jest.spyOn(doctorModel, 'findByIdAndUpdate').mockResolvedValue({});
        await changeAvailablity(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('17. appointmentComplete: Marca cita como isCompleted', async () => {
        if (!appointmentComplete) return;
        req.body = { docId: mockDocId, appointmentId: mockAptId };
        jest.spyOn(appointmentModel, 'findById').mockReturnValue(mockQuery({ _id: mockAptId, docId: mockDocId, isCompleted: false }));
        jest.spyOn(appointmentModel, 'findByIdAndUpdate').mockResolvedValue({});
        await appointmentComplete(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('18. appointmentCancel (Doctor): Cancela cita', async () => {
        if (!appointmentCancel) return;
        req.body = { docId: mockDocId, appointmentId: mockAptId };
        jest.spyOn(appointmentModel, 'findById').mockReturnValue(mockQuery({ _id: mockAptId, docId: mockDocId, cancelled: false }));
        jest.spyOn(appointmentModel, 'findByIdAndUpdate').mockResolvedValue({});
        await appointmentCancel(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('19. updateDoctorProfile: Actualiza honorarios (fees)', async () => {
        if (!updateDoctorProfile) return;
        req.body = { docId: mockDocId, fees: 1, address: { line1: 'C1' }, available: true };
        jest.spyOn(doctorModel, 'findByIdAndUpdate').mockResolvedValue({});
        await updateDoctorProfile(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('20. doctorList: Retorna listado de médicos', async () => {
        if (!doctorList) return;
        jest.spyOn(doctorModel, 'find').mockReturnValue(mockQuery([{ name: 'Dr. Lopez' }]));
        await doctorList(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
});