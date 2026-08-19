export interface ParsedCsvRow {
  date: string;
  label: string;
  amount: number;
  direction: 'in' | 'out';
}

export function parseCsv(text: string): ParsedCsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  // Detect delimiter (comma or semicolon)
  const firstLine = lines[0];
  const delimiter = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';

  // Parse header to find column indices
  const header = splitCsvLine(lines[0], delimiter).map((h) => h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

  const findCol = (...names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));

  let dateIdx = findCol('date', 'jour');
  let labelIdx = findCol('libelle', 'label', 'description', 'intitule', 'operation', 'nature');
  let amountIdx = findCol('montant', 'amount', 'valeur', 'somme');
  let directionIdx = findCol('sens', 'direction', 'type', 'mouvement');

  // If no header recognized, assume first 3 columns are date, label, amount
  if (dateIdx === -1 && labelIdx === -1 && amountIdx === -1) {
    dateIdx = 0;
    labelIdx = 1;
    amountIdx = 2;
    directionIdx = -1;
  }

  if (dateIdx === -1 || labelIdx === -1 || amountIdx === -1) {
    throw new Error('CSV invalide : colonnes date, libellé et montant requises.');
  }

  const rows: ParsedCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], delimiter);
    if (cols.length < 3) continue;

    const rawDate = (cols[dateIdx] || '').trim();
    const date = normalizeDate(rawDate);
    if (!date) continue;

    const label = (cols[labelIdx] || '').trim();
    if (!label) continue;

    const rawAmount = (cols[amountIdx] || '').trim().replace(/\s/g, '').replace(/\u00a0/g, '').replace(',', '.');
    const amount = parseFloat(rawAmount);
    if (Number.isNaN(amount) || amount === 0) continue;

    let direction: 'in' | 'out';
    if (directionIdx >= 0) {
      const dir = (cols[directionIdx] || '').toLowerCase().trim();
      direction = dir.startsWith('c') || dir.includes('cred') || dir === 'in' || dir === '+' ? 'in' : 'out';
    } else {
      direction = amount > 0 ? 'in' : 'out';
    }

    rows.push({
      date,
      label,
      amount: Math.abs(amount),
      direction,
    });
  }

  return rows;
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function normalizeDate(s: string): string | null {
  // DD/MM/YYYY or YYYY-MM-DD
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}
