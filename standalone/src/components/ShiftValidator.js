// ── ShiftValidator ────────────────────────────────────────────────────────────
// Validates assignments after loading. Returns a list of warning objects.
//
// Each warning: { supervisorName, type, message }
// Types: 'availability' | 'overlap' | 'disqualification' | 'missing_break'

export default class ShiftValidator {
    /**
     * @param {Array} assignments  – array of { supervisor, shifts[] }
     */
    constructor(assignments) {
        this.assignments = assignments;
    }

    validate() {
        const warnings = [];
        for (const { supervisor, shifts } of this.assignments) {
            const name = `${supervisor.nickname || supervisor.firstName || ''} ${supervisor.lastName}`.trim();
            warnings.push(...this._checkAvailability(name, supervisor, shifts));
            warnings.push(...this._checkOverlap(name, shifts));
            warnings.push(...this._checkDisqualifications(name, supervisor, shifts));
            warnings.push(...this._checkBreaks(name, shifts));
            warnings.push(...this._checkMinShifts(name, shifts));
        }
        return warnings;
    }

    // ── 1. Availability ───────────────────────────────────────────────────────

    _checkAvailability(name, supervisor, shifts) {
        if (!supervisor.availability) return [];   // ei saatavuustietoja → ei tarkistusta
        const warnings = [];
        for (const shift of shifts) {
            if (!shift.date) continue;
            if (!supervisor.availability.includes(shift.date)) {
                warnings.push({
                    supervisorName: name,
                    type: 'availability',
                    message: `Vuoro ${shift.examCode} (${shift.date} ${shift.timeRange || ''}) on päivänä, jolle valvoja ei ole ilmoittautunut saatavilla.`
                });
            }
        }
        return warnings;
    }

    // ── 2. Overlap ────────────────────────────────────────────────────────────

    _checkOverlap(name, shifts) {
        const warnings = [];
        const parsed = shifts
            .map(s => ({ shift: s, range: this._parseTimeRange(s.date, s.timeRange) }))
            .filter(x => x.range !== null);

        for (let i = 0; i < parsed.length; i++) {
            for (let j = i + 1; j < parsed.length; j++) {
                const a = parsed[i].range;
                const b = parsed[j].range;
                if (a.start < b.end && b.start < a.end) {
                    warnings.push({
                        supervisorName: name,
                        type: 'overlap',
                        message: `Vuorot päällekkäin: ${parsed[i].shift.examCode} (${parsed[i].shift.date} ${parsed[i].shift.timeRange || ''}) ja ${parsed[j].shift.examCode} (${parsed[j].shift.date} ${parsed[j].shift.timeRange || ''}).`
                    });
                }
            }
        }
        return warnings;
    }

    // ── 3. Disqualifications ─────────────────────────────────────────────────

    _checkDisqualifications(name, supervisor, shifts) {
        if (!supervisor.disqualifications || supervisor.disqualifications.length === 0) return [];
        const warnings = [];
        for (const shift of shifts) {
            if (supervisor.disqualifications.includes(shift.examCode)) {
                warnings.push({
                    supervisorName: name,
                    type: 'disqualification',
                    message: `Vuoro kokeessa ${shift.examCode} (${shift.date || ''} ${shift.timeRange || ''}) – valvoja on jäävi tähän kokeeseen.`
                });
            }
        }
        return warnings;
    }

    // ── 4. Missing break ─────────────────────────────────────────────────────

    _checkBreaks(name, shifts) {
        const warnings = [];
        for (const shift of shifts) {
            const range = this._parseTimeRange(shift.date, shift.timeRange);
            if (!range) continue;
            const durationMinutes = (range.end - range.start) / 60000;
            if (durationMinutes > 360 && !shift.breakTime) {
                warnings.push({
                    supervisorName: name,
                    type: 'missing_break',
                    message: `Vuoro ${shift.examCode} (${shift.date || ''} ${shift.timeRange || ''}) kestää yli 6 tuntia (${Math.round(durationMinutes)} min) ilman taukoa.`
                });
            }
        }
        return warnings;
    }

    // ── 5. Minimum shifts ─────────────────────────────────────────────────────

    _checkMinShifts(name, shifts, min = 6) {
        if (shifts.length < min) {
            return [{
                supervisorName: name,
                type: 'min_shifts',
                message: `Valvojalla on vain ${shifts.length} vuoro${shifts.length === 1 ? '' : 'a'} (vaaditaan vähintään ${min}).`
            }];
        }
        return [];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Parses a date (DD.MM.YYYY) + timeRange (HH:MM-HH:MM) into { start, end } as Date objects.
     * Returns null if parsing fails.
     */
    _parseTimeRange(date, timeRange) {
        if (!timeRange) return null;
        const rangeMatch = timeRange.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
        if (!rangeMatch) return null;

        const dateMatch = date ? date.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/) : null;
        const year  = dateMatch ? Number(dateMatch[3]) : 2000;
        const month = dateMatch ? Number(dateMatch[2]) - 1 : 0;
        const day   = dateMatch ? Number(dateMatch[1]) : 1;

        const start = new Date(year, month, day, Number(rangeMatch[1]), Number(rangeMatch[2]));
        let   end   = new Date(year, month, day, Number(rangeMatch[3]), Number(rangeMatch[4]));

        // Handle midnight crossover (end before start)
        if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);

        return { start, end };
    }
}
