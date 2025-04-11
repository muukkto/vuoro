# Data Models for Shift Assignment App

This document describes the data models used in the Shift Assignment App for supervisors and exam days.

---

## Supervisor Model

Represents a supervisor with their availability, preferences, and other attributes.

| Property             | Type       | Description                                                                 |
|----------------------|------------|-----------------------------------------------------------------------------|
| `lastName`           | `string`   | The last name of the supervisor.                                           |
| `firstName`          | `string`   | The first name of the supervisor.                                          |
| `availableDays`      | `string[]` | List of dates (in `DD.MM.YYYY` format) when the supervisor is available.   |
| `languageSkill`      | `string`   | The supervisor's language skill (e.g., "Äidinkieli", "Kiitettävä").        |
| `previousExperience` | `boolean`  | Whether the supervisor has previous experience (`true` or `false`).        |
| `position`           | `string`   | The supervisor's prefered position (e.g., "Messukeskus", "Keskustakampus").         |
| `disqualifications`  | `string[]` | List of exam codes where the supervisor is disqualified (e.g., `["A", "B"]`). |
| `shiftPreferences`   | `string[]` | List of preferred shifts in `DD.MM.YYYY HH:MM-HH:MM` format.               |

---

## Exam Day Model

Represents an exam day with its schedule, participants, and resource requirements.

| Property             | Type       | Description                                                                 |
|----------------------|------------|-----------------------------------------------------------------------------|
| `date`               | `string`   | The date of the exam (in `DD.MM.YYYY` format).                              |
| `timeRange`          | `string`   | The time range of the exam (e.g., `09:00-12:00`).                           |
| `examName`           | `string`   | The name of the exam.                                                       |
| `examCode`           | `string`   | The code of the exam (e.g., "A", "B").                                      |
| `totalParticipants`  | `number`   | The total number of participants for the exam.                              |
| `halls`              | `object`   | A mapping of hall names to participant counts (e.g., `{ "Halli A": 100 }`). |
| `shiftA`             | `object`   | Details of shift A.                                                         |
| `shiftA.timeRange`   | `string`   | The time range of shift A (e.g., `08:30-12:30`).                            |
| `shiftA.minSupervisors` | `number` | The minimum number of supervisors required for shift A.                     |
| `shiftB`             | `object`   | *(Optional)* Details of shift B.                                            |
| `shiftB.timeRange`   | `string`   | The time range of shift B (e.g., `12:30-16:30`).                            |
| `shiftB.minSupervisors` | `number` | The minimum number of supervisors required for shift B.                     |

---

## Assignments Model

Represents the assignments of supervisors to exam days.

| Property             | Type       | Description                                                                 |
|----------------------|------------|-----------------------------------------------------------------------------|
| `lastName`           | `string`   | The last name of the supervisor.                                           |
| `assignedShifts`     | `object[]` | List of assigned shifts. Each shift contains the following properties:     |
| `assignedShifts.date`| `string`   | The date of the shift (in `DD.MM.YYYY` format).                            |
| `assignedShifts.timeRange` | `string` | The time range of the shift (e.g., `08:30-12:30`).                        |
| `assignedShifts.examCode` | `string` | The code of the exam associated with the shift (e.g., "A").               |

---

## Example Data

### Supervisor Example
```json
{
  "lastName": "Virtanen",
  "firstName": "Matti",
  "availableDays": ["01.05.2025", "02.05.2025"],
  "languageSkill": "Hyvä",
  "previousExperience": true,
  "position": "Messukeskus",
  "disqualifications": ["A", "B"],
  "shiftPreferences": ["02.05.2025 10:00-13:00"]
}
```

### Exam Day Example
```json
{
  "date": "01.05.2025",
  "timeRange": "09:00-12:00",
  "examName": "Matematiikan koe",
  "examCode": "A",
  "totalParticipants": 200,
  "halls": {
    "Halli A": 100,
    "Halli B": 100
  },
  "shiftA": {
    "timeRange": "08:30-12:30",
    "minSupervisors": 5
  },
  "shiftB": {
    "timeRange": "12:30-16:30",
    "minSupervisors": 5
  }
}
```

### Assignments Example
```json
{
  "Virtanen": [
    { "date": "01.05.2025", "timeRange": "08:30-12:30", "examCode": "A" },
    { "date": "02.05.2025", "timeRange": "09:30-13:30", "examCode": "C" }
  ],
  "Korhonen": [
    { "date": "03.05.2025", "timeRange": "08:30-12:30", "examCode": "E" }
  ]
}
```
