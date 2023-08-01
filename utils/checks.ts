export const checkLocalStorage = () => {
	const values = ["token", "user_id", "device_id"];

	values.forEach(v => {
		if (!localStorage.getItem(v))
			throw new Error(
				`Missing localStorage value ${v}! Please fill it in to continue.`
			);
	});
};
