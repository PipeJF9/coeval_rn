import { AcademicCsvParser } from '../../src/core/utils/csvParser';

const parser = new AcademicCsvParser();

// ─── normalizeText ────────────────────────────────────────────────────────────

describe('AcademicCsvParser.normalizeText', () => {
  it('converts to lowercase', () => {
    expect(parser.normalizeText('HOLA')).toBe('hola');
  });

  it('strips all whitespace', () => {
    expect(parser.normalizeText('  hola   mundo  ')).toBe('holamundo');
  });

  it('replaces accented vowels', () => {
    expect(parser.normalizeText('áéíóú')).toBe('aeiou');
    expect(parser.normalizeText('àèìòù')).toBe('aeiou');
    expect(parser.normalizeText('äëïöü')).toBe('aeiou');
    expect(parser.normalizeText('âêîôû')).toBe('aeiou');
    expect(parser.normalizeText('ãõ')).toBe('ao');
  });

  it('replaces ñ', () => {
    expect(parser.normalizeText('España')).toBe('espana');
  });

  it('returns empty string for empty input', () => {
    expect(parser.normalizeText('')).toBe('');
    expect(parser.normalizeText('   ')).toBe('');
  });

  it('normalizes "Categoría" to "categoria"', () => {
    expect(parser.normalizeText('Categoría')).toBe('categoria');
  });
});

// ─── parseRfc4180 (RFC 4180 parser) ─────────────────────────────────────────

describe('AcademicCsvParser RFC 4180 parser', () => {
  it('parses a simple single-row CSV', () => {
    const rows = (parser as any).parseRfc4180('a,b,c\n');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(['a', 'b', 'c']);
  });

  it('handles quoted field containing a comma', () => {
    const rows = (parser as any).parseRfc4180('"Smith, John",b,c\n');
    expect(rows[0][0]).toBe('Smith, John');
    expect(rows[0][1]).toBe('b');
  });

  it('handles escaped double-quote inside quoted field', () => {
    const rows = (parser as any).parseRfc4180('"say ""hi""",b\n');
    expect(rows[0][0]).toBe('say "hi"');
  });

  it('handles CRLF line endings', () => {
    const rows = (parser as any).parseRfc4180('a,b\r\nc,d\r\n');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(['a', 'b']);
    expect(rows[1]).toEqual(['c', 'd']);
  });

  it('handles LF-only line endings', () => {
    const rows = (parser as any).parseRfc4180('a,b\nc,d\n');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual(['c', 'd']);
  });

  it('parses a row without trailing newline', () => {
    const rows = (parser as any).parseRfc4180('x,y,z');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(['x', 'y', 'z']);
  });

  it('returns empty array for empty input', () => {
    expect((parser as any).parseRfc4180('')).toHaveLength(0);
  });

  it('handles multiple rows', () => {
    const rows = (parser as any).parseRfc4180('a,b\nc,d\ne,f');
    expect(rows).toHaveLength(3);
  });
});

// ─── parseRows ───────────────────────────────────────────────────────────────

describe('AcademicCsvParser.parseRows', () => {
  // Real CSV format from the actual ROBLE export files:
  // col[0]=categoryName, col[1]=groupDisplayName, col[2]=groupName(code),
  // col[3]=username/email, col[4]=studentId(digits), col[5]=firstName,
  // col[6]=lastName, col[7]=emailAddress, col[8]=enrollmentDate

  const makeRow = (overrides: Partial<Record<number, string>> = {}): string => {
    const defaults: Record<number, string> = {
      0: 'CategoriaA',
      1: 'Group 1',
      2: 'grp_001',
      3: 'juan@uninorte.edu.co',
      4: '123456',
      5: 'JUAN',
      6: 'PEREZ GOMEZ',
      7: 'juan@uninorte.edu.co',
      8: '1 de enero de 2026',
    };
    const cols = { ...defaults, ...overrides };
    return Object.values(cols).join(',');
  };

  it('skips the header row (groupcategoryname / groupcode)', () => {
    const csv = 'Group Category Name,Group Name,Group Code,Username,OrgDefinedId,First Name,Last Name,Email Address,Date\n';
    expect(parser.parseRows(csv)).toHaveLength(0);
  });

  it('skips rows with fewer than 7 columns', () => {
    const csv = 'a,b,c,d,e,f\n';
    expect(parser.parseRows(csv)).toHaveLength(0);
  });

  it('skips rows without a valid email', () => {
    const row = makeRow({ 3: 'notanemail', 7: 'alsoinvalid' });
    expect(parser.parseRows(row + '\n')).toHaveLength(0);
  });

  it('extracts studentId and name when col4 is pure digits', () => {
    const csv = makeRow() + '\n';
    const [result] = parser.parseRows(csv);
    expect(result.studentId).toBe('123456');
    expect(result.studentName).toBe('JUAN PEREZ GOMEZ');
  });

  it('extracts studentId when col4 starts with digits followed by a name', () => {
    // e.g. "98765 MARIA" → id=98765, name="MARIA APELLIDO"
    const row = makeRow({ 4: '98765 MARIA', 5: 'APELLIDO', 6: 'invalidemail@test.com' });
    // Rebuild without col6 having email: need col3 or col7 as email
    const csv = 'CategoriaA,Group 1,grp_001,test@uni.edu,98765 MARIA,APELLIDO,HERNANDEZ,test@uni.edu,date\n';
    const [result] = parser.parseRows(csv);
    expect(result.studentId).toBe('98765');
    expect(result.studentName).toBe('MARIA APELLIDO');
  });

  it('uses col4+col5 as name when col4 has no digit prefix', () => {
    const csv = 'CategoriaA,Group 1,grp_001,a@b.com,,JUAN,GARCIA,a@b.com,date\n';
    const [result] = parser.parseRows(csv);
    expect(result.studentName).toBe('JUAN GARCIA');
    expect(result.studentId).toBe('');
  });

  it('prefers col7 email over col3 when col7 contains @', () => {
    const csv = makeRow({ 3: 'user@example.com', 7: 'preferred@example.com' }) + '\n';
    const [result] = parser.parseRows(csv);
    expect(result.studentEmail).toBe('preferred@example.com');
  });

  it('falls back to col3 email when col7 is missing @', () => {
    const csv = makeRow({ 3: 'fallback@example.com', 7: 'noemail' }) + '\n';
    const [result] = parser.parseRows(csv);
    expect(result.studentEmail).toBe('fallback@example.com');
  });

  it('lowercases the email', () => {
    const csv = makeRow({ 7: 'UPPER@EXAMPLE.COM' }) + '\n';
    const [result] = parser.parseRows(csv);
    expect(result.studentEmail).toBe('upper@example.com');
  });

  it('maps category, group display name, and group code correctly', () => {
    const csv = makeRow({ 0: 'CategoríaPyFlutter', 1: 'Group 3', 2: 'grp_156874_9012_3' }) + '\n';
    const [result] = parser.parseRows(csv);
    expect(result.categoryName).toBe('CategoríaPyFlutter');
    expect(result.groupDisplayName).toBe('Group 3');
    expect(result.groupName).toBe('grp_156874_9012_3');
  });

  it('parses a real export CSV row correctly', () => {
    const csv = [
      'Group Category Name,Group Name,Group Code,Username,OrgDefinedId,First Name,Last Name,Email Address,Group Enrollment Date',
      'CategoríaPyFlutter,Group 1,grp_156874_9012_1,edmonterrosa@uninorte.edu.co,364228,EMMANUEL,MONTERROSA DURAN,edmonterrosa@uninorte.edu.co,4 de febrero de 2026 08:13',
    ].join('\n');

    const rows = parser.parseRows(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      categoryName: 'CategoríaPyFlutter',
      groupDisplayName: 'Group 1',
      groupName: 'grp_156874_9012_1',
      studentEmail: 'edmonterrosa@uninorte.edu.co',
      studentId: '364228',
      studentName: 'EMMANUEL MONTERROSA DURAN',
    });
  });

  it('parses multiple rows from a real export', () => {
    const csv = [
      'Group Category Name,Group Name,Group Code,Username,OrgDefinedId,First Name,Last Name,Email Address,Group Enrollment Date',
      'CategoríaPyFlutter,Group 1,grp_156874_9012_1,edmonterrosa@uninorte.edu.co,364228,EMMANUEL,MONTERROSA DURAN,edmonterrosa@uninorte.edu.co,4 de febrero de 2026 08:13',
      'CategoríaPyFlutter,Group 1,grp_156874_9012_1,jhoreinisa@uninorte.edu.co,334258,JHOREINIS,ANAYA DIAZ,jhoreinisa@uninorte.edu.co,4 de febrero de 2026 08:47',
      'CategoríaPyFlutter,Group 2,grp_156874_9012_2,tsandro@uninorte.edu.co,365032,SANDRO,TORRES GUTIERREZ,tsandro@uninorte.edu.co,16 de febrero de 2026 22:28',
    ].join('\n');

    const rows = parser.parseRows(csv);
    expect(rows).toHaveLength(3);
    expect(rows[2].groupName).toBe('grp_156874_9012_2');
    expect(rows[2].studentName).toBe('SANDRO TORRES GUTIERREZ');
  });

  it('returns empty array for completely empty input', () => {
    expect(parser.parseRows('')).toHaveLength(0);
    expect(parser.parseRows('\n\n\n')).toHaveLength(0);
  });
});
