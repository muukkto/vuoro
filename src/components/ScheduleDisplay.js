import React from 'react';

const ScheduleDisplay = ({ shifts }) => {
    return (
        <div className="schedule-display">
            <h2>Assigned Shifts</h2>
            {shifts.length === 0 ? (
                <p>No shifts assigned yet.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Supervisor</th>
                            <th>Shift Date</th>
                            <th>Shift Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shifts.map((shift, index) => (
                            <tr key={index}>
                                <td>{shift.supervisor}</td>
                                <td>{shift.date}</td>
                                <td>{shift.time}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ScheduleDisplay;