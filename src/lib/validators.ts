/**
 * Valida um número de CPF (Cadastro de Pessoas Físicas)
 * @param cpf String contendo o CPF (com ou sem máscara)
 * @returns boolean indicando se o CPF é válido
 */
export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');

  if (cleanCPF.length !== 11) return false;

  // CPFs com todos os dígitos iguais são inválidos
  if (/^(\d)\1+$/.test(cleanCPF)) return false;

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(9))) return false;

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(10))) return false;

  return true;
}

/**
 * Valida um número de CNPJ (Cadastro Nacional da Pessoa Jurídica)
 * @param cnpj String contendo o CNPJ (com ou sem máscara)
 * @returns boolean indicando se o CNPJ é válido
 */
export function validateCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, '');

  if (cleanCNPJ.length !== 14) return false;

  // CNPJs com todos os dígitos iguais são inválidos
  if (/^(\d)\1+$/.test(cleanCNPJ)) return false;

  // Validação do primeiro dígito verificador
  let size = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, size);
  let digits = cleanCNPJ.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  // Validação do segundo dígito verificador
  size = size + 1;
  numbers = cleanCNPJ.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

/**
 * Valida se a string é um CPF ou CNPJ válido
 * @param value String contendo CPF ou CNPJ
 * @returns boolean
 */
export function validateCPFOrCNPJ(value: string): boolean {
  const cleanValue = value.replace(/\D/g, '');
  if (cleanValue.length === 11) return validateCPF(cleanValue);
  if (cleanValue.length === 14) return validateCNPJ(cleanValue);
  return false;
}

/**
 * Formata um CPF (000.000.000-00)
 */
export function formatCPF(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  return cleanValue
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

/**
 * Formata um CNPJ (00.000.000/0000-00)
 */
export function formatCNPJ(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  return cleanValue
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

/**
 * Formata CPF ou CNPJ dependendo do tamanho
 */
export function formatCPFOrCNPJ(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  if (cleanValue.length <= 11) return formatCPF(cleanValue);
  return formatCNPJ(cleanValue);
}

/**
 * Formata um número de telefone ((00) 00000-0000 ou (00) 0000-0000)
 */
export function formatPhone(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  if (cleanValue.length <= 10) {
    return cleanValue
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  }
  return cleanValue
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}
