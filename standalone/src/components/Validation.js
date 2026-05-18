// Default schema used when validation-schema.json cannot be loaded
const DEFAULT_SCHEMA = {
    maxErrors: 20,
    assignments: {
        requiredColumns: [
            'First Name', 'Last Name', 'Nickname', 'Email', 'Haka_id',
            'Disqualifications', 'Language Skill', 'Previous Experience'
        ],
        columnRules: {
            'First Name': { type: 'required' },
            'Last Name': { type: 'required' },
            'Email': { type: 'regex', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', message: 'Sähköpostin muoto on virheellinen.' },
            'Haka_id': { type: 'regex', pattern: '^[a-zA-Z0-9]+@[a-zA-Z0-9]+\\.[a-zA-Z]+$', allowEmpty: true, message: 'Haka_id on virheellisessä muodossa.' },
            'Language Skill': { type: 'allowed', values: ['äidinkieli', 'kiitettävä', 'hyvä', 'tyydyttävä', 'välttävä', 'ei osaamista'], message: 'Virheellinen arvo.' },
            'Previous Experience': { type: 'allowed', values: ['Checked', 'Unchecked', ''], allowEmpty: true },
            'Disqualifications': { type: 'regex', pattern: '^([A-Za-z0-9]+(, )?)*$', allowEmpty: true, message: 'Käytä pilkulla eroteltua koodilistaa.' }
        },
        codeColumns: {
            companionSuffixes: ['-Hall', '-Break', '-Information'],
            columnRules: {
                '': { type: 'time', message: 'Aikamuodon tulee olla HH:MM-HH:MM tai HH:MM.' },
                '-Hall': { type: 'regex', pattern: '^[A-Za-z0-9\\s-]+$', message: 'Hallin nimessä on virheellisiä merkkejä.' },
                '-Break': { type: 'time', allowEmpty: true, message: 'Aikamuodon tulee olla HH:MM-HH:MM tai HH:MM.' }
            }
        },
        availabilityColumns: {
            prefix: 'AVAILABILITY_',
            columnRule: { type: 'allowed', values: ['Kyllä', 'En', 'Checked', 'Unchecked', ''], allowEmpty: true, message: 'Virheellinen arvo. Sallitut: Kyllä, En, Checked, Unchecked tai tyhjä.' }
        }
    }
};

let schemaCache = null;
let examInfoCache = null;

// ── Schema loading ────────────────────────────────────────────────────────────

async function getSchema() {
    try {
        const url = new URL('../conf/validation-schema.json', import.meta.url);
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) { return DEFAULT_SCHEMA; }
        const loaded = await response.json();
        return mergeDeep(DEFAULT_SCHEMA, loaded);
    } catch {
        return DEFAULT_SCHEMA;
    }
}

// ── Exam info loading ─────────────────────────────────────────────────────────

export async function loadExamInfo() {
    if (examInfoCache) return examInfoCache;
    try {
        const url = new URL('../conf/exam_information.csv', import.meta.url);
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            console.error(`exam_information.csv: HTTP ${response.status} ${response.statusText} (${url})`);
            return { codes: new Set(), byCode: new Map(), dates: new Set() };  // ei tallenneta välimuistiin – sallitaan uudelleenyritys
        }
        const text = await response.text();
        const { headers, rows } = splitCSV(text);
        const codeIdx = headers.indexOf('Code');
        const dateIdx = headers.indexOf('Date');
        const timeIdx = headers.indexOf('Time');
        const nameIdx = headers.indexOf('Name');
        if (codeIdx === -1) {
            console.error('exam_information.csv: "Code"-saraketta ei löydy. Otsikot:', headers);
            return { codes: new Set(), byCode: new Map(), dates: new Set() };
        }
        const byCode = new Map();
        const codes = new Set();
        const dates = new Set();
        for (const row of rows) {
            const code = (row[codeIdx] || '').trim();
            if (!code) continue;
            const date = (row[dateIdx] !== undefined ? row[dateIdx] : '').trim();
            byCode.set(code, {
                code,
                date,
                time: (row[timeIdx] !== undefined ? row[timeIdx] : '').trim(),
                name: (row[nameIdx] !== undefined ? row[nameIdx] : '').trim()
            });
            codes.add(code);
            if (date) dates.add(date);
        }
        examInfoCache = { codes, byCode, dates };
        console.log(`exam_information.csv ladattu: ${codes.size} koekoodi(a):`, [...codes]);
        console.log(`exam_information.csv: ${dates.size} uniikit päivämäärät:`, [...dates]);
    } catch (e) {
        console.error('exam_information.csv: lataus epäonnistui:', e);
        return { codes: new Set(), byCode: new Map(), dates: new Set() };  // ei tallenneta – sallitaan uudelleenyritys
    }
    return examInfoCache;
}

// ── CSV parsing ───────────────────────────────────────────────────────────────

export function splitCSV(data) {
    const normalized = String(data || '')
        .replace(/^\uFEFF/, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
    const rows = normalized
        .split('\n')
        .map(row => row.split(';').map(cell => { const t = cell.trim(); return t === '-' ? '' : t; }))
        .filter(row => row.some(cell => cell !== ''));
    const headers = rows.shift() || [];
    return { headers, rows };
}

// ── Value validation ──────────────────────────────────────────────────────────

function pad2(n) { return String(n).padStart(2, '0'); }

function normalizeTimeValue(raw) {
    // Remove all whitespace, then parse HH:MM-HH:MM, HH.MM-HH.MM, or single HH:MM / HH.MM
    const cleaned = raw.replace(/\s+/g, '');

    const rangeMatch = cleaned.match(/^(\d{1,2})[:.](\d{2})-(\d{1,2})[:.](\d{2})$/);
    if (rangeMatch) {
        const h1 = Number(rangeMatch[1]), m1 = Number(rangeMatch[2]);
        const h2 = Number(rangeMatch[3]), m2 = Number(rangeMatch[4]);
        if (h1 <= 23 && m1 <= 59 && h2 <= 23 && m2 <= 59) {
            return { valid: true, normalizedValue: `${pad2(h1)}:${pad2(m1)}-${pad2(h2)}:${pad2(m2)}` };
        }
        return { valid: false, normalizedValue: raw };
    }

    const singleMatch = cleaned.match(/^(\d{1,2})[:.](\d{2})$/);
    if (singleMatch) {
        const h = Number(singleMatch[1]), m = Number(singleMatch[2]);
        if (h <= 23 && m <= 59) {
            return { valid: true, normalizedValue: `${pad2(h)}:${pad2(m)}` };
        }
        return { valid: false, normalizedValue: raw };
    }

    return { valid: false, normalizedValue: raw };
}

function validateDateValue(raw) {
    const match = raw.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (match) {
        const d = Number(match[1]), mo = Number(match[2]), y = Number(match[3]);
        const fullYear = y < 100 ? 2000 + y : y;
        if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
            return { valid: true, normalizedValue: `${pad2(d)}.${pad2(mo)}.${fullYear}` };
        }
    }
    return { valid: false, normalizedValue: raw };
}

function validateValue(value, rule) {
    const raw = String(value || '').trim();

    if (!raw) {
        const emptyOk = rule.allowEmpty ||
            (rule.type === 'allowed' && (rule.values || []).some(v => String(v) === ''));
        if (emptyOk || rule.type !== 'required') return { valid: true, normalizedValue: '' };
        return { valid: false, normalizedValue: '' };
    }

    switch (rule.type) {
        case 'required':
            return { valid: true, normalizedValue: raw };
        case 'allowed': {
            const lowerRaw = raw.toLowerCase();
            const lowerAllowed = (rule.values || []).map(v => String(v).toLowerCase());
            return { valid: lowerAllowed.includes(lowerRaw), normalizedValue: raw };
        }
        case 'regex': {
            const re = new RegExp(rule.pattern);
            return { valid: re.test(raw), normalizedValue: raw };
        }
        case 'time':
            return normalizeTimeValue(raw);
        case 'date':
            return validateDateValue(raw);
        default:
            return { valid: true, normalizedValue: raw };
    }
}

// ── Error collection ──────────────────────────────────────────────────────────

function makeErrorCollector(maxErrors) {
    const errors = [];
    let overflow = false;
    return {
        add(text, value) {
            const valueStr = value !== undefined ? ` | Arvo: "${value}"` : '';
            if (errors.length < maxErrors) {
                errors.push(text);
                console.debug('[Validation]' + valueStr, text);
            } else {
                overflow = true;
                console.debug('[Validation] (overflow, ei lisätty)' + valueStr, text);
            }
        },
        get errors() { return errors; },
        get overflow() { return overflow; }
    };
}

function formatError(rowNumber, columnName, message) {
    return `Rivi ${rowNumber}, Sarake ${columnName}: ${message}`;
}

// ── Deep merge helper ─────────────────────────────────────────────────────────

function mergeDeep(defaults, overrides) {
    if (!overrides) return defaults;
    const result = { ...defaults };
    for (const key of Object.keys(overrides)) {
        const val = overrides[key];
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
            result[key] = mergeDeep(defaults[key] || {}, val);
        } else {
            result[key] = val;
        }
    }
    return result;
}

// ── Debug CSV download ───────────────────────────────────────────────────────

function debugDownloadCSV(data, filename) {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    console.debug('[Validation] Debug-CSV ladattu:', filename);
}

// ── Main validation export ────────────────────────────────────────────────────

export async function validateAndNormalizeAssignmentsCSV(data) {
    const [schema, examInfo] = await Promise.all([getSchema(), loadExamInfo()]);
    const cfg = schema.assignments;
    const { headers, rows } = splitCSV(data);
    const collector = makeErrorCollector(schema.maxErrors || 20);

    // Debug: show parsed CSV before validation
    console.debug('[Validation] validateAndNormalizeAssignmentsCSV – syötetty data (raakateksti):');
    console.debug(data);
    console.debug('[Validation] Parsitut otsikot:', headers);
    console.debug('[Validation] Parsitut rivit (%d kpl):', rows.length);
    console.table(rows.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))));

    if (headers.length === 0) {
        collector.add(formatError(1, 'CSV', 'Tiedosto on tyhjä tai otsikkorivi puuttuu.'));
        return { valid: false, errors: collector.errors, overflow: collector.overflow, normalizedData: '' };
    }

    if (examInfo.codes.size === 0) {
        collector.add(formatError(1, 'CSV', 'exam_information.csv-tiedostoa ei voitu ladata. Tarkista että palvelin on käynnissä ja tiedosto löytyy hakemistosta src/conf/.'));
        return { valid: false, errors: collector.errors, overflow: collector.overflow, normalizedData: '' };
    }

    // 1. Required columns
    for (const col of cfg.requiredColumns || []) {
        if (!headers.includes(col)) {
            collector.add(formatError(1, col, 'Pakollinen sarake puuttuu.'));
        }
    }

    // 2. Identify shift code columns; validate unknown code prefixes
    const companionSuffixes = cfg.codeColumns?.companionSuffixes || [];
    const examCodes = examInfo.codes;
    const shiftCodes = new Set();

    for (const header of headers) {
        if (examCodes.has(header)) {
            shiftCodes.add(header);
            continue;
        }
        for (const suffix of companionSuffixes) {
            if (header.endsWith(suffix)) {
                const potentialCode = header.slice(0, -suffix.length);
                if (examCodes.has(potentialCode)) {
                    shiftCodes.add(potentialCode);
                } else if (potentialCode) {
                    collector.add(formatError(1, header, `Koekoodi "${potentialCode}" ei löydy exam_information.csv-tiedostosta.`));
                }
                break;
            }
        }
    }

    // 3. Validate AVAILABILITY_<date> columns
    const availCfg = cfg.availabilityColumns;
    const availPrefix = availCfg?.prefix || 'AVAILABILITY_';
    const availRule = availCfg?.columnRule || { type: 'allowed', values: ['Kyllä', 'En', 'Checked', 'Unchecked', ''], allowEmpty: true };
    const availColumns = []; // { idx, date, colName }

    for (const header of headers) {
        if (!header.startsWith(availPrefix)) continue;
        const date = header.slice(availPrefix.length);
        const colName = header;
        if (!date) continue;
        // Validate date exists in exam_information.csv
        if (!examInfo.dates.has(date)) {
            collector.add(formatError(1, colName, `Päivämäärä "${date}" ei löydy exam_information.csv-tiedostosta.`));
        }
        availColumns.push({ idx: headers.indexOf(header), date, colName });
    }

    // 4. For each shift code, check required companion columns
    const codeColumnRules = cfg.codeColumns?.columnRules || {};
    for (const code of shiftCodes) {
        for (const [suffix, rule] of Object.entries(codeColumnRules)) {
            if (suffix === '') continue;
            if (!rule.allowEmpty && !headers.includes(`${code}${suffix}`)) {
                collector.add(formatError(1, `${code}${suffix}`, `Pakollinen sarake puuttuu (${code}).`));
            }
        }
    }

    // 4. Validate each data row
    const columnRules = cfg.columnRules || {};

    for (const [rowIndex, row] of rows.entries()) {
        const rowNumber = rowIndex + 2;

        // Fixed column rules
        for (const [colName, rule] of Object.entries(columnRules)) {
            const idx = headers.indexOf(colName);
            if (idx === -1) continue;
            const value = (row[idx] || '').trim();
            const result = validateValue(value, rule);
            if (!result.valid) {
                const msg = rule.message || `Virheellinen arvo: "${value}"${rule.values ? '. Sallitut: ' + rule.values.join(', ') : ''}`;
                collector.add(formatError(rowNumber, colName, msg), value);
            } else {
                row[idx] = result.normalizedValue;
            }
        }

        // Availability column rules
        for (const { idx, colName } of availColumns) {
            const value = (row[idx] || '').trim();
            const result = validateValue(value, availRule);
            if (!result.valid) {
                collector.add(formatError(rowNumber, colName, availRule.message || `Virheellinen arvo: "${value}"`), value);
            }
        }

        // Code-dependent column rules
        for (const code of shiftCodes) {
            const shiftIdx = headers.indexOf(code);
            const shiftValue = shiftIdx !== -1 ? (row[shiftIdx] || '').trim() : '';

            for (const [suffix, rule] of Object.entries(codeColumnRules)) {
                const colName = `${code}${suffix}`;
                const colIdx = headers.indexOf(colName);
                if (colIdx === -1) continue;

                const value = (row[colIdx] || '').trim();
                if (!shiftValue && !value) continue; // Supervisor not assigned to this exam

                const result = validateValue(value, rule);
                if (!result.valid) {
                    collector.add(formatError(rowNumber, colName, rule.message || `Virheellinen arvo: "${value}"`), value);
                } else {
                    row[colIdx] = result.normalizedValue;
                }
            }

            // When shift is assigned, hall is mandatory
            if (shiftValue && companionSuffixes.includes('-Hall')) {
                const hallIdx = headers.indexOf(`${code}-Hall`);
                if (hallIdx !== -1 && !(row[hallIdx] || '').trim()) {
                    collector.add(formatError(rowNumber, `${code}-Hall`, 'Halli puuttuu vuorolta.'));
                }
            }
        }
    }

    const normalizedData = [headers, ...rows].map(row => row.join(';')).join('\n');
    return {
        valid: collector.errors.length === 0,
        errors: collector.errors,
        overflow: collector.overflow,
        normalizedData
    };
}

// ── Keskusta validation ───────────────────────────────────────────────────────

const DEFAULT_KESKUSTA_SCHEMA = {
    maxErrors: 20,
    requiredColumns: [
        'Supervisor', 'Exam', 'Building', 'Shift-start', 'Shift-end'
    ],
    columnRules: {
        'Supervisor': { type: 'regex', pattern: '.*', allowEmpty: true },
        'Exam': { type: 'required' },
        'Building': { type: 'required' },
        'Room': { type: 'regex', pattern: '.*', allowEmpty: true },
        'Information': { type: 'regex', pattern: '.*', allowEmpty: true },
        'Shift-start': { type: 'time', message: 'Aikamuodon tulee olla HH:MM.' },
        'Shift-end': { type: 'time', message: 'Aikamuodon tulee olla HH:MM.' },
        'Break-start': { type: 'time', allowEmpty: true, message: 'Aikamuodon tulee olla HH:MM.' },
        'Email': { type: 'regex', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', allowEmpty: true, message: 'Sähköpostin muoto on virheellinen.' },
        'Haka_id': { type: 'regex', pattern: '^[a-zA-Z0-9]+@([a-zA-Z0-9]+\\.)+[a-zA-Z]+$', allowEmpty: true, message: 'Haka_id on virheellisessä muodossa.' },
        'Language Skill': { type: 'allowed', values: ['äidinkieli', 'kiitettävä', 'hyvä', 'tyydyttävä', 'välttävä', 'ei osaamista', ''], allowEmpty: true, message: 'Virheellinen arvo.' },
        'Disqualifications': { type: 'regex', pattern: '^([A-Za-z0-9]+(, )?)*$', allowEmpty: true, message: 'Käytä pilkulla eroteltua koodilistaa.' }
    }
};

async function getKeskustaSchema() {
    try {
        const url = new URL('../conf/validation-schema-keskusta.json', import.meta.url);
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) { return DEFAULT_KESKUSTA_SCHEMA; }
        const loaded = await response.json();
        return mergeDeep(DEFAULT_KESKUSTA_SCHEMA, loaded);
    } catch {
        return DEFAULT_KESKUSTA_SCHEMA;
    }
}

export async function validateKeskustaCSV(data) {
    const [schema, examInfo] = await Promise.all([getKeskustaSchema(), loadExamInfo()]);
    const { headers, rows } = splitCSV(data);
    const collector = makeErrorCollector(schema.maxErrors || 20);

    // Debug: show parsed CSV before validation
    console.debug('[Validation] validateKeskustaCSV – syötetty data (raakateksti):');
    console.debug(data);
    console.debug('[Validation] Parsitut otsikot:', headers);
    console.debug('[Validation] Parsitut rivit (%d kpl):', rows.length);
    console.table(rows.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))));

    if (headers.length === 0) {
        collector.add(formatError(1, 'CSV', 'Tiedosto on tyhjä tai otsikkorivi puuttuu.'));
        return { valid: false, errors: collector.errors, overflow: collector.overflow, normalizedData: '' };
    }

    if (examInfo.codes.size === 0) {
        collector.add(formatError(1, 'CSV', 'exam_information.csv-tiedostoa ei voitu ladata. Tarkista että palvelin on käynnissä ja tiedosto löytyy hakemistosta src/conf/.'));
        return { valid: false, errors: collector.errors, overflow: collector.overflow, normalizedData: '' };
    }

    // 1. Required columns
    for (const col of schema.requiredColumns || []) {
        if (!headers.includes(col)) {
            collector.add(formatError(1, col, 'Pakollinen sarake puuttuu.'));
        }
    }

    if (collector.errors.length > 0) {
        return { valid: false, errors: collector.errors, overflow: collector.overflow, normalizedData: '' };
    }

    const examIdx = headers.indexOf('Exam');
    const columnRules = schema.columnRules || {};

    // 2. Validate each data row
    for (const [rowIndex, row] of rows.entries()) {
        const rowNumber = rowIndex + 2;

        // Validate exam code against exam_information.csv
        if (examIdx !== -1) {
            const examCode = (row[examIdx] || '').trim();
            if (examCode && !examInfo.codes.has(examCode)) {
                collector.add(formatError(rowNumber, 'Exam', `Koekoodi "${examCode}" ei löydy exam_information.csv-tiedostosta.`), examCode);
            }
        }

        // Validate all column rules
        for (const [colName, rule] of Object.entries(columnRules)) {
            const idx = headers.indexOf(colName);
            if (idx === -1) continue;
            const value = (row[idx] || '').trim();
            const result = validateValue(value, rule);
            if (!result.valid) {
                const msg = rule.message || `Virheellinen arvo: "${value}"${rule.values ? '. Sallitut: ' + rule.values.join(', ') : ''}`;
                collector.add(formatError(rowNumber, colName, msg), value);
            } else {
                row[idx] = result.normalizedValue;
            }
        }
    }

    const normalizedData = [headers, ...rows].map(row => row.join(';')).join('\n');
    return {
        valid: collector.errors.length === 0,
        errors: collector.errors,
        overflow: collector.overflow,
        normalizedData
    };
}

export function formatValidationSummary(errors, overflow) {
    const lines = errors.map((e, i) => `${i + 1}. ${e}`);
    if (overflow) lines.push('... lisää virheitä löytyi (näytetään enintään 20).');
    return lines.join('\n');
}
