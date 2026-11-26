import { describe, expect, it } from 'vitest';
import { formatarData, validarFormulario } from '../utils';

describe('formatarData', () => {
  it('quebra a data ISO em partes legíveis', () => {
    expect(formatarData('2026-12-05')).toEqual({ dia: '05', mes: 'DEZ', ano: '2026', completa: '05/12/2026' });
    expect(formatarData('2027-01-20').mes).toBe('JAN');
  });
});

describe('validarFormulario', () => {
  const valido = { titulo: 'A', data: '2026-12-01', local: 'B', curso: 'Direito', vagas: '10' };

  it('aceita dados válidos', () => {
    expect(validarFormulario(valido)).toEqual({});
  });

  it('acusa campos obrigatórios vazios', () => {
    const erros = validarFormulario({ titulo: ' ', data: '', local: '', curso: '', vagas: '' });
    expect(Object.keys(erros).sort()).toEqual(['curso', 'data', 'local', 'titulo', 'vagas']);
  });

  it('acusa vagas ausentes, inválidas ou não positivas', () => {
    expect(validarFormulario({ ...valido, vagas: undefined }).vagas).toBe('Campo obrigatório');
    expect(validarFormulario({ ...valido, vagas: '0' }).vagas).toMatch(/maior que zero/);
    expect(validarFormulario({ ...valido, vagas: '2.5' }).vagas).toMatch(/inteiro/);
  });
});
