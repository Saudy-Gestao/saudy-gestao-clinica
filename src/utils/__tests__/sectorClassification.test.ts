import { describe, it, expect } from 'vitest';
import {
  isRoomLikeName,
  isRoomSector,
  markRoomDescription,
  stripRoomMarker,
} from '../sectorClassification';

describe('sectorClassification', () => {
  describe('isRoomLikeName', () => {
    it('deve retornar true para nomes que começam com "sala"', () => {
      expect(isRoomLikeName('sala 1')).toBe(true);
      expect(isRoomLikeName('Sala 2')).toBe(true);
      expect(isRoomLikeName('SALA3')).toBe(true);
      expect(isRoomLikeName('sala consulta')).toBe(true);
    });

    it('deve retornar true para nomes que começam com "room"', () => {
      expect(isRoomLikeName('room 1')).toBe(true);
      expect(isRoomLikeName('Room 2')).toBe(true);
      expect(isRoomLikeName('ROOM A')).toBe(true);
    });

    it('deve retornar false para nomes que não indicam sala', () => {
      expect(isRoomLikeName('consultório')).toBe(false);
      expect(isRoomLikeName('recepção')).toBe(false);
      expect(isRoomLikeName('enfermaria')).toBe(false);
      expect(isRoomLikeName('almoxarifado sala')).toBe(false);
    });

    it('deve retornar false para valores vazios ou inválidos', () => {
      expect(isRoomLikeName('')).toBe(false);
      expect(isRoomLikeName(null)).toBe(false);
      expect(isRoomLikeName(undefined)).toBe(false);
      expect(isRoomLikeName('   ')).toBe(false);
    });

    it('deve identificar sala seguida de número', () => {
      expect(isRoomLikeName('sala1')).toBe(true);
      expect(isRoomLikeName('sala2')).toBe(true);
      expect(isRoomLikeName('Sala123')).toBe(true);
    });

    it('deve ser case-insensitive', () => {
      expect(isRoomLikeName('SALA 1')).toBe(true);
      expect(isRoomLikeName('SaLa 2')).toBe(true);
      expect(isRoomLikeName('sAlA 3')).toBe(true);
      expect(isRoomLikeName('ROOM 1')).toBe(true);
      expect(isRoomLikeName('RoOm 2')).toBe(true);
    });
  });

  describe('isRoomSector', () => {
    it('deve retornar true para setor com descrição marcada com [SALA]', () => {
      expect(isRoomSector({ description: '[SALA] Descrição' })).toBe(true);
      expect(isRoomSector({ description: '[SALA]' })).toBe(true);
    });

    it('deve retornar true para setor com descrição marcada com __ROOM__', () => {
      expect(isRoomSector({ description: '__ROOM__ Descrição' })).toBe(true);
      expect(isRoomSector({ description: '__ROOM__' })).toBe(true);
    });

    it('deve retornar true para setor com nome tipo sala', () => {
      expect(isRoomSector({ name: 'sala 1' })).toBe(true);
      expect(isRoomSector({ name: 'Sala 2' })).toBe(true);
      expect(isRoomSector({ name: 'room 1' })).toBe(true);
    });

    it('deve retornar false para setor sem características de sala', () => {
      expect(isRoomSector({ name: 'recepção', description: 'Área de espera' })).toBe(false);
      expect(isRoomSector({ name: 'consultório', description: 'Consultório A' })).toBe(false);
    });

    it('deve retornar false para valores inválidos', () => {
      expect(isRoomSector(null)).toBe(false);
      expect(isRoomSector(undefined)).toBe(false);
      expect(isRoomSector({})).toBe(false);
    });

    it('deve priorizar marcação de descrição sobre nome', () => {
      const sector = {
        name: 'consultório',
        description: '[SALA] Consultório médico',
      };
      expect(isRoomSector(sector)).toBe(true);
    });
  });

  describe('markRoomDescription', () => {
    it('deve adicionar marcador [SALA] no início da descrição', () => {
      expect(markRoomDescription('Sala de emergência')).toBe('[SALA] Sala de emergência');
      expect(markRoomDescription('Consultório A')).toBe('[SALA] Consultório A');
    });

    it('não deve duplicar marcador se já existe', () => {
      expect(markRoomDescription('[SALA] Descrição')).toBe('[SALA] Descrição');
    });

    it('não deve duplicar marcador __ROOM__', () => {
      expect(markRoomDescription('__ROOM__ Descrição')).toBe('__ROOM__ Descrição');
    });

    it('deve retornar apenas [SALA] para descrição vazia', () => {
      expect(markRoomDescription('')).toBe('[SALA]');
      expect(markRoomDescription('   ')).toBe('[SALA]');
    });

    it('deve tratar corretamente descrições com espaços extras', () => {
      expect(markRoomDescription('  Sala 1  ')).toBe('[SALA] Sala 1');
    });
  });

  describe('stripRoomMarker', () => {
    it('deve remover marcador [SALA] da descrição', () => {
      expect(stripRoomMarker('[SALA] Descrição')).toBe('Descrição');
      expect(stripRoomMarker('[SALA] Sala de emergência')).toBe('Sala de emergência');
    });

    it('deve remover marcador __ROOM__ da descrição', () => {
      expect(stripRoomMarker('__ROOM__ Descrição')).toBe('Descrição');
      expect(stripRoomMarker('__ROOM__: Sala 1')).toBe('Sala 1');
    });

    it('deve retornar descrição sem alteração se não tem marcador', () => {
      expect(stripRoomMarker('Sala de espera')).toBe('Sala de espera');
      expect(stripRoomMarker('Consultório A')).toBe('Consultório A');
    });

    it('deve retornar string vazia para valores vazios', () => {
      expect(stripRoomMarker('')).toBe('');
      expect(stripRoomMarker('   ')).toBe('');
      expect(stripRoomMarker(null)).toBe('');
      expect(stripRoomMarker(undefined)).toBe('');
    });

    it('deve remover apenas o marcador no início', () => {
      expect(stripRoomMarker('[SALA] Texto com [SALA] no meio')).toBe('Texto com [SALA] no meio');
    });

    it('deve tratar espaços corretamente', () => {
      expect(stripRoomMarker('[SALA]  Descrição')).toBe('Descrição');
      expect(stripRoomMarker('__ROOM__    Descrição')).toBe('Descrição');
    });

    it('deve retornar string vazia quando só tem marcador', () => {
      expect(stripRoomMarker('[SALA]')).toBe('');
      expect(stripRoomMarker('__ROOM__')).toBe('');
    });
  });
});
