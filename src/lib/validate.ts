export function validateSiren(s: string): string | null {
  const cleaned = s.replace(/\s/g, '');
  if (!cleaned) return null;
  if (!/^\d{9}$/.test(cleaned)) return 'Le SIREN doit contenir 9 chiffres.';
  if (!luhnCheck(cleaned)) return 'SIREN invalide (clé de contrôle incorrecte).';
  return null;
}

export function validateTaxId(s: string): string | null {
  const cleaned = s.replace(/\s/g, '').toUpperCase();
  if (!cleaned) return null;
  if (!/^[A-Z0-9-]{9,20}$/.test(cleaned)) {
    return 'Le NIF / identifiant fiscal doit contenir 9 à 20 caractères alphanumériques.';
  }
  return null;
}

export function validateRccm(s: string): string | null {
  const cleaned = s.replace(/\s/g, '').toUpperCase();
  if (!cleaned) return null;
  if (!/^[A-Z0-9/-]{6,30}$/.test(cleaned)) {
    return 'Le RCCM doit contenir 6 à 30 caractères valides.';
  }
  return null;
}

export function validateIban(s: string): string | null {
  const cleaned = s.replace(/\s/g, '').toUpperCase();
  if (!cleaned) return null;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(cleaned)) {
    return 'IBAN invalide : utilisez un IBAN international valide.';
  }
  return null;
}

export function validateBic(s: string): string | null {
  const cleaned = s.replace(/\s/g, '').toUpperCase();
  if (!cleaned) return null;
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleaned)) {
    return 'BIC invalide : 8 ou 11 caractères (ex: RAWBCDKIXXX).';
  }
  return null;
}

export function validateEmail(s: string): string | null {
  if (!s.trim()) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())) {
    return 'Adresse e-mail invalide.';
  }
  return null;
}

function luhnCheck(num: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}
