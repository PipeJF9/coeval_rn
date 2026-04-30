export interface CsvStudentRow {
  categoryName: string;
  groupDisplayName: string;
  groupName: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
}

export class AcademicCsvParser {
  normalizeText(value: string): string {
    const trimmed = value.trim().toLowerCase();
    const replacements: Record<string, string> = {
      á: 'a',
      à: 'a',
      ä: 'a',
      â: 'a',
      ã: 'a',
      é: 'e',
      è: 'e',
      ë: 'e',
      ê: 'e',
      í: 'i',
      ì: 'i',
      ï: 'i',
      î: 'i',
      ó: 'o',
      ò: 'o',
      ö: 'o',
      ô: 'o',
      õ: 'o',
      ú: 'u',
      ù: 'u',
      ü: 'u',
      û: 'u',
      ñ: 'n',
    };

    let normalized = trimmed;
    for (const [key, replacement] of Object.entries(replacements)) {
      normalized = normalized.split(key).join(replacement);
    }

    return normalized.replace(/\s+/g, '');
  }

  private asString(value: unknown): string {
    return value == null ? '' : String(value);
  }

  parseRows(csvContent: string): CsvStudentRow[] {
    const lines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const parsed: CsvStudentRow[] = [];

    for (const line of lines) {
      const raw = line.split(',').map((part) => part.trim());
      if (raw.length < 7) {
        continue;
      }

      const categoryName = this.asString(raw[0]).trim();
      const groupDisplayName = this.asString(raw[1]).trim();
      const groupName = this.asString(raw[2]).trim();

      const normalizedCategoryName = this.normalizeText(categoryName);
      const normalizedGroupName = this.normalizeText(groupName);

      if (
        (normalizedCategoryName === 'groupcategoryname' ||
          normalizedCategoryName === 'categoria') &&
        (normalizedGroupName === 'groupcode' || normalizedGroupName === 'groupname')
      ) {
        continue;
      }

      if (
        categoryName.toLowerCase().includes('categoria') &&
        groupName.toLowerCase().includes('group name')
      ) {
        continue;
      }

      const possibleEmailA = this.asString(raw[3]).trim();
      const possibleEmailB = raw.length > 7 ? this.asString(raw[7]).trim() : '';
      const possibleEmailC = raw.length > 6 ? this.asString(raw[6]).trim() : '';
      const studentEmail = possibleEmailB.includes('@')
        ? possibleEmailB
        : possibleEmailA.includes('@')
          ? possibleEmailA
          : possibleEmailC;

      if (!studentEmail.includes('@')) {
        continue;
      }

      const col4 = raw.length > 4 ? this.asString(raw[4]).trim() : '';
      const col5 = raw.length > 5 ? this.asString(raw[5]).trim() : '';
      const col6 = raw.length > 6 ? this.asString(raw[6]).trim() : '';

      let studentId = '';
      let studentName = '';

      if (/^\d+$/.test(col4)) {
        studentId = col4;
        studentName = [col5, col6].filter((part) => part.trim().length > 0).join(' ').trim();
      } else {
        const match = /^(\d+)\s*(.*)$/.exec(col4);
        if (match) {
          studentId = match[1] ?? '';
          const firstNames = (match[2] ?? '').trim();
          studentName = [firstNames, col5]
            .filter((part) => part.trim().length > 0)
            .join(' ')
            .trim();
        } else {
          studentName = [col4, col5].filter((part) => part.trim().length > 0).join(' ').trim();
        }
      }

      parsed.push({
        categoryName,
        groupDisplayName,
        groupName,
        studentId,
        studentName,
        studentEmail: studentEmail.toLowerCase(),
      });
    }

    return parsed;
  }
}