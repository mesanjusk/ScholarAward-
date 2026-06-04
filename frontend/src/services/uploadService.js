import api from '../api';

export async function uploadPublicFile(file, folder = 'bk_awards', options = {}) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  if (options.forcePng) formData.append('forcePng', 'true');
  if (options.removeBackground) formData.append('removeBackground', 'true');

  const { data } = await api.post('/uploads/public', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return data;
}
