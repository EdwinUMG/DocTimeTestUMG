import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Speciality from '../components/Speciality';
import Login from '../pages/Login';
import { AppContext } from '../context/AppContext';

const renderWithContext = (ui, contextValue = {}) => {
    const defaultContext = {
        token: false,
        setToken: vi.fn(),
        userData: false,
        backendUrl: 'http://localhost:4000',
        ...contextValue
    };
    return render(
        <MemoryRouter>
            <AppContext.Provider value={defaultContext}>
                {ui}
            </AppContext.Provider>
        </MemoryRouter>
    );
};

describe('Frontend Paciente: Interfaz y Componentes', () => {

    test('1. Navbar: Renderiza los enlaces principales de navegación', () => {
        renderWithContext(<Navbar />);
        // Al existir menú móvil y desktop, usamos getAllByText y verificamos que exista al menos 1
        expect(screen.getAllByText(/HOME/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/ALL DOCTORS/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/ABOUT/i).length).toBeGreaterThan(0);
    });

    test('2. Navbar: Muestra botón "Create account" si no hay sesión activa', () => {
        renderWithContext(<Navbar />, { token: false });
        expect(screen.getAllByText(/Create account/i).length).toBeGreaterThan(0);
    });

    test('3. Navbar: Oculta botón "Create account" si existe un token de sesión', () => {
        renderWithContext(<Navbar />, { token: 'token_valido', userData: { name: 'Juan' } });
        expect(screen.queryByText(/Create account/i)).not.toBeInTheDocument();
    });

    test('4. Navbar: Muestra menú de perfil de usuario cuando está autenticado', () => {
        renderWithContext(<Navbar />, { token: 'token_valido', userData: { name: 'Juan' } });
        expect(screen.getAllByText(/My Profile/i).length).toBeGreaterThan(0);
    });

    test('5. Footer: Renderiza la información de derechos de autor y secciones corporativas', () => {
        render(<MemoryRouter><Footer /></MemoryRouter>);
        // El footer usa el símbolo de Copyright en lugar de la palabra
        expect(screen.getByText(/© 2025 DocTime/i)).toBeInTheDocument();
        expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
        expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
    });

    test('6. Speciality: Renderiza el encabezado del catálogo de especialidades', () => {
        render(<MemoryRouter><Speciality /></MemoryRouter>);
        // El texto exacto es "Find by Specialization"
        expect(screen.getByText(/Find by Specialization/i)).toBeInTheDocument();
    });

    test('7. Speciality: Incluye opciones de médicos generales y dermatólogos', () => {
        render(<MemoryRouter><Speciality /></MemoryRouter>);
        expect(screen.getByText(/General physician/i)).toBeInTheDocument();
        expect(screen.getByText(/Dermatologist/i)).toBeInTheDocument();
    });

    test('8. Login: Permite alternar la vista entre Login y Sign Up', () => {
        renderWithContext(<Login />);
        // Por defecto muestra el Login ("Welcome Back")
        expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
        
        // Alternar a Sign Up interactuando con el botón
        const toggleLink = screen.getByRole('button', { name: /Sign Up/i });
        fireEvent.click(toggleLink);
        expect(screen.getByText(/Sign Up/i)).toBeInTheDocument();
    });

    test('9. Login: Captura correctamente la escritura en los campos de formulario', () => {
        renderWithContext(<Login />);
        const emailInputs = screen.getAllByRole('textbox');
        const emailField = emailInputs.find(input => input.type === 'email') || emailInputs[0];
        
        fireEvent.change(emailField, { target: { value: 'paciente@test.com' } });
        expect(emailField.value).toBe('paciente@test.com');
    });

    test('10. Login: Protege la visibilidad de la contraseña', () => {
        renderWithContext(<Login />);
        const passwordInput = document.querySelector('input[type="password"]');
        expect(passwordInput).toBeInTheDocument();
    });
});