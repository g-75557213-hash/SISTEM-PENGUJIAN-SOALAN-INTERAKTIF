const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target1 = `  const [gasWebAppUrl, setGasWebAppUrl] = useState(() => {
    return localStorage.getItem('smkj_gas_web_app_url') || '';
  });`;

const replacement1 = target1 + `
  const [driveFolderLink, setDriveFolderLink] = useState(() => {
    return localStorage.getItem('smkj_drive_folder_link') || '';
  });`;

code = code.replace(target1, replacement1);

const target2 = `  const [promptKriteria, setPromptKriteria] = useState('');`;

const replacement2 = target2 + `
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);`;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/App.tsx', code);
console.log('Patched states in App.tsx');
