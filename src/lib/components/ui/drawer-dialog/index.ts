
const drawer = await import('../drawer/index.ts');
const dialog = await import('../dialog/index.ts');
export function GetDrawerDialog(mobile: boolean = false) {
	if (mobile) {
		return drawer;
	}
	return dialog;
}
