export function buildAnchorFullName(form = {}) {
  return [form.firstName, form.lastName]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

export function createInitialAnchorForm() {
  return {
    firstName: '',
    lastName: '',
    fullName: '',
    gender: '',
    age: '',
    address: '',
    mobile: '',
    language: [],
  };
}

export function toAnchorPayload(form) {
  return {
    firstName: form.firstName || '',
    lastName: form.lastName || '',
    fullName: form.fullName || buildAnchorFullName(form),
    gender: form.gender || '',
    age: Number(form.age) || 0,
    address: form.address || '',
    mobile: form.mobile || '',
    language: Array.isArray(form.language) ? form.language : [],
    instructionsAccepted: true,
  };
}

export function normalizeAnchorFromApi(data) {
  const initial = createInitialAnchorForm();
  const next = {
    ...initial,
    ...data,
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    age: data.age ? String(data.age) : '',
    language: Array.isArray(data.language) ? data.language : [],
  };
  next.fullName = data.fullName || buildAnchorFullName(next);
  return next;
}
