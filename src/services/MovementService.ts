import { Movement, MovementType } from '../types';
import { PatientService } from './PatientService';

const STORAGE_KEY = 'cer_movements_data';

export const MovementService = {
  getMovements: (): Movement[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveMovements: (movements: Movement[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(movements));
  },

  addMovement: (movement: Omit<Movement, 'id' | 'createdAt'>): Movement => {
    const movements = MovementService.getMovements();
    const newMovement: Movement = {
      ...movement,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    
    movements.push(newMovement);
    MovementService.saveMovements(movements);

    // SIDE EFFECT: If type is 'Alta', update patient status
    if (movement.type === 'Alta') {
      PatientService.updatePatient(movement.patientId, { 
        status: 'Alta',
        dischargeDate: movement.date 
      });
    }

    return newMovement;
  },

  deleteMovement: (id: string) => {
    const movements = MovementService.getMovements();
    const filtered = movements.filter(m => m.id !== id);
    MovementService.saveMovements(filtered);
  }
};
