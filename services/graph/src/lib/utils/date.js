export const getFullWeek = function (fwDate) {
	var jan1,
		w,
		d = new Date(fwDate);
	d.setDate(d.getDate() + 4 - (d.getDay() || 7)); // Set to nearest Thursday: current date + 4 - current day number, make Sunday's day number 7
	jan1 = new Date(d.getFullYear(), 0, 1); // Get first day of year
	w = Math.ceil(((d - jan1) / 86400000 + 1) / 7); // Calculate full weeks to nearest Thursday
	return { y: d.getFullYear(), w };
};

/**
 * @param {Date | string | number} [start]
 * @param {Date | string | number} [end]
 * @param {{ after?: string; before?: string; during?: string }} [prefix]
 */
export function formatDateRange(start, end, prefix) {
	const fmt = new Intl.DateTimeFormat('en', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric'
	});

	if (start) start = new Date(start);
	if (end) end = new Date(end);

	if (start && end && start.valueOf() <= end.valueOf()) {
		const pre = prefix?.during ? `${prefix.during} ` : '';
		return `${pre}${fmt.formatRange(start, end)}`;
	}
	if (end) {
		const pre = prefix?.before ? `${prefix.before} ` : '';
		return `${pre}${fmt.format(end)}`;
	}
	if (start) {
		const pre = prefix?.after ? `${prefix.after} ` : '';
		return `${pre}${fmt.format(start)}`;
	}
}

export const currentCohort = (d) => {
	const date = d ? new Date(d) : new Date();
	const weekObj = getFullWeek(date);
	const cohort = `${weekObj.y}${weekObj.w.toString().padStart(2, '0')}`;
	return cohort;
};

export default {
	getFullWeek,
	currentCohort
};
