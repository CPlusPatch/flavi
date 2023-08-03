export const isUserLoggedIn = () => {
	const values = ["token", "user_id", "device_id", "homeserver"];

	try {
		values.forEach(v => {
			if (!localStorage.getItem(v))
				throw new Error(
					`Missing localStorage value ${v}! Please fill it in to continue.`
				);
		});
	} catch {
		return false;
	}

	return true;
};
