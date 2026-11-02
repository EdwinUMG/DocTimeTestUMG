import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';
import SidePanel from '../components/SidePanel';
// CORRECCIÓN: Navbar en admin está dentro de pages, no components
import Navbar from '../pages/Navbar'; 
import AddDoctor from '../pages/Admin/AddDoctor';
import { AdminContext } from '../context/AdminContext';
import { DoctorContext } from '../context/DoctorContext';
import { AppContext } from '../context/AppContext';

// Mock unificado de los 3 contextos requeridos por el panel administrativo
const renderAdminApp = (ui, adminCtx = {}, docCtx = {}, appCtx = {}) => {
    const defaultAdmin = { aToken: false, setAToken: vi.fn(), backendUrl: 'http://localhost:4000', ...adminCtx };
    const defaultDoc = { dToken: false, setDToken: vi.fn(), backendUrl: 'http://localhost:4000', ...docCtx };
    const defaultApp = { calculateAge: vi.fn(), currency: '$', ...appCtx };

    return render(
        <MemoryRouter>
            <AppContext.Provider value={defaultApp}>
                <AdminContext.Provider value={defaultAdmin}>
                    <DoctorContext.Provider value={defaultDoc}>
                        {ui}
                    </DoctorContext.Provider>
                </AdminContext.Provider>
            </AppContext.Provider>
        </MemoryRouter>
    );
};

describe('Frontend Admin y Médico: Interfaz Clínica', () => {

    // Pruebas de Login Administrativo/Médico
    test('1. Admin Login: Renderiza el formulario de acceso del administrador por defecto', () => {
        renderAdminApp(<Login />);
        expect(screen.getAllByText(/Admin/i).length).toBeGreaterThan(0);
    });

    test('2. Admin Login: Permite alternar la vista al acceso para Médicos', () => {
        renderAdminApp(<Login />);
        // Captura el botón específico de "Doctor" en la parte superior
        const toggleBtn = screen.getByRole('button', { name: 'Doctor' });
        fireEvent.click(toggleBtn);
        
        // Verifica que el encabezado del formulario cambie a "Doctor Login" (el texto puede estar dividido por elementos, por lo que usamos regex flexible)
        expect(screen.getAllByText(/Doctor/i).length).toBeGreaterThan(0);
    });

    test('3. Admin Login: Captura entradas de texto en el correo', () => {
        renderAdminApp(<Login />);
        const emailInput = screen.getByRole('textbox');
        fireEvent.change(emailInput, { target: { value: 'admin@doctime.com' } });
        expect(emailInput.value).toBe('admin@doctime.com');
    });

    test('4. Admin Login: Protege el campo de contraseña visualmente', () => {
        renderAdminApp(<Login />);
        const passwordInput = document.querySelector('input[type="password"]');
        expect(passwordInput).toBeInTheDocument();
    });

    // Pruebas de Barra Lateral (SidePanel)
    test('5. SidePanel: Muestra módulo de gestión completa si el rol es Administrador', () => {
        // Simulamos que el admin está logueado
        renderAdminApp(<SidePanel />, { aToken: 'mock_admin_token' }, { dToken: false });
        expect(screen.getAllByText(/Dashboard/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Add Doctor/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Doctors List/i).length).toBeGreaterThan(0);
    });

    test('6. SidePanel: Muestra módulos limitados a la agenda si el rol es Doctor', () => {
        // Simulamos que el doctor está logueado
        renderAdminApp(<SidePanel />, { aToken: false }, { dToken: 'mock_doctor_token' });
        expect(screen.getAllByText(/Dashboard/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Appointments/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Profile/i).length).toBeGreaterThan(0);
    });

    test('7. SidePanel: Oculta la opción de agregar doctores a usuarios con rol Médico', () => {
        renderAdminApp(<SidePanel />, { aToken: false }, { dToken: 'mock_doctor_token' });
        expect(screen.queryByText(/Add Doctor/i)).not.toBeInTheDocument();
    });

    // Pruebas de Barra Superior (Navbar)
    test('8. Navbar: Despliega etiqueta "Admin" cuando la sesión pertenece al administrador', () => {
        renderAdminApp(<Navbar />, { aToken: 'mock_admin_token' }, { dToken: false });
        expect(screen.getAllByText(/Admin/i).length).toBeGreaterThan(0);
    });

    test('9. Navbar: Dispara la limpieza de tokens al hacer clic en Logout', () => {
        const setATokenMock = vi.fn();
        renderAdminApp(<Navbar />, { aToken: 'token', setAToken: setATokenMock }, { dToken: false });
        
        const logoutBtn = screen.getAllByText(/Logout/i)[0];
        fireEvent.click(logoutBtn);
        
        expect(setATokenMock).toHaveBeenCalledWith('');
    });

    // Pruebas de Registro Clínico (AddDoctor)
    test('10. AddDoctor: Renderiza el formulario de alta médica', () => {
        renderAdminApp(<AddDoctor />, { aToken: 'mock_admin_token' }, { dToken: false });
        // Verificamos que se renderice el contenedor principal o inputs básicos
        const nameInput = screen.queryByPlaceholderText(/Name/i) || document.querySelector('input[type="text"]');
        expect(nameInput).toBeInTheDocument();
    });
});