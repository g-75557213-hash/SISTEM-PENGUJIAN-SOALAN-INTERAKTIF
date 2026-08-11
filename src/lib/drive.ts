export async function uploadFileToDrive(token: string, file: File, folderLink: string): Promise<string> {
  // Extract folder ID from link
  let folderId = '';
  const match = folderLink.match(/folders\/([^/?]+)/);
  if (match && match[1]) {
    folderId = match[1];
  } else if (folderLink.includes('id=')) {
    const params = new URLSearchParams(folderLink.split('?')[1]);
    folderId = params.get('id') || '';
  }
  
  if (!folderId) {
    throw new Error('Link folder Google Drive tidak sah. Sila pastikan format pautan betul.');
  }

  const metadata = {
    name: file.name,
    parents: [folderId]
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Gagal memuat naik fail ke Google Drive');
  }

  const data = await response.json();
  
  // Set permissions to anyone with link can read
  await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone'
    })
  });

  return data.webViewLink;
}
