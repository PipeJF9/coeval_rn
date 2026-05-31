import { RobleDatasource } from '../../src/data/datasources/robleDatasource';

const ds = new RobleDatasource() as any;

// ─── extractUidFromToken ──────────────────────────────────────────────────────

describe('RobleDatasource.extractUidFromToken', () => {
  const encodePayload = (payload: object) => {
    const json = JSON.stringify(payload);
    const base64 = Buffer.from(json).toString('base64').replace(/=/g, '');
    return `header.${base64}.signature`;
  };

  it('returns the sub claim when present', () => {
    const token = encodePayload({ sub: 'user-123', email: 'a@b.com' });
    expect(ds.extractUidFromToken(token)).toBe('user-123');
  });

  it('returns the uid claim when sub is absent', () => {
    const token = encodePayload({ uid: 'uid-456' });
    expect(ds.extractUidFromToken(token)).toBe('uid-456');
  });

  it('returns the id claim as last fallback', () => {
    const token = encodePayload({ id: 'id-789' });
    expect(ds.extractUidFromToken(token)).toBe('id-789');
  });

  it('returns null for a token with no recognizable id claim', () => {
    const token = encodePayload({ email: 'a@b.com' });
    expect(ds.extractUidFromToken(token)).toBeNull();
  });

  it('returns null for a malformed token', () => {
    expect(ds.extractUidFromToken('not.a.jwt.token')).toBeNull();
    expect(ds.extractUidFromToken('only-one-part')).toBeNull();
    expect(ds.extractUidFromToken('')).toBeNull();
  });
});

// ─── _normalizeRole ───────────────────────────────────────────────────────────

describe('RobleDatasource._normalizeRole', () => {
  it.each([
    ['student', 'student'],
    ['Student', 'student'],
    ['STUDENT', 'student'],
    ['estudiante', 'student'],
    ['alumno', 'student'],
    ['alumna', 'student'],
    ['est', 'student'],
    ['s', 'student'],
  ])('maps %s → student', (input, expected) => {
    expect(ds._normalizeRole(input)).toBe(expected);
  });

  it.each([
    ['teacher', 'teacher'],
    ['Teacher', 'teacher'],
    ['TEACHER', 'teacher'],
    ['profesor', 'teacher'],
    ['professora', 'teacher'],
    ['professor', 'teacher'],
    ['docente', 'teacher'],
    ['instructor', 'teacher'],
    ['instructora', 'teacher'],
    ['prof', 'teacher'],
    ['t', 'teacher'],
  ])('maps %s → teacher', (input, expected) => {
    expect(ds._normalizeRole(input)).toBe(expected);
  });

  it('defaults unknown roles to student', () => {
    expect(ds._normalizeRole('unknown-role')).toBe('student');
    expect(ds._normalizeRole('')).toBe('student');
    expect(ds._normalizeRole('admin')).toBe('student');
  });
});

// ─── _parseUserData ───────────────────────────────────────────────────────────

describe('RobleDatasource._parseUserData', () => {
  it('maps uid from uid field', () => {
    const user = ds._parseUserData({ uid: 'abc', email: 'a@b.com', name: 'Ana', rol: 'student' });
    expect(user.uid).toBe('abc');
    expect(user.email).toBe('a@b.com');
    expect(user.name).toBe('Ana');
  });

  it('falls back uid to userId, then id, then _id', () => {
    expect(ds._parseUserData({ userId: 'u1', email: 'x', name: 'x', rol: 'student' }).uid).toBe('u1');
    expect(ds._parseUserData({ id: 'i1', email: 'x', name: 'x', rol: 'student' }).uid).toBe('i1');
    expect(ds._parseUserData({ _id: '_1', email: 'x', name: 'x', rol: 'student' }).uid).toBe('_1');
  });

  it('normalizes rol/role field', () => {
    const teacher = ds._parseUserData({ uid: '1', email: 'x', name: 'x', rol: 'profesor' });
    expect(teacher.rol).toBe('teacher');
    expect(teacher.role).toBe('teacher');
  });

  it('returns empty strings for missing fields', () => {
    const user = ds._parseUserData({});
    expect(user.email).toBe('');
    expect(user.name).toBe('');
  });
});

// ─── _parseErrorBody ─────────────────────────────────────────────────────────

describe('RobleDatasource._parseErrorBody', () => {
  it('extracts message from an object', () => {
    expect(ds._parseErrorBody({ message: 'Not found' })).toBe('Not found');
  });

  it('extracts error field when message is absent', () => {
    expect(ds._parseErrorBody({ error: 'Unauthorized' })).toBe('Unauthorized');
  });

  it('extracts msg as last resort', () => {
    expect(ds._parseErrorBody({ msg: 'Bad request' })).toBe('Bad request');
  });

  it('parses a JSON string body', () => {
    expect(ds._parseErrorBody(JSON.stringify({ message: 'Parsed error' }))).toBe('Parsed error');
  });

  it('returns null for an empty object', () => {
    expect(ds._parseErrorBody({})).toBeNull();
  });

  it('returns null for invalid JSON string', () => {
    expect(ds._parseErrorBody('not-json')).toBeNull();
  });
});
